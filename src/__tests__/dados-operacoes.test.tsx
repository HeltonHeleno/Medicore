/**
 * 15.16.3 — hooks de dados dos módulos (recarregam quando a coleção muda, inclusive por
 * "outra aba"), inicialização (A15 + A17 no console), situação hospitalar em lote (R-X8)
 * e a lista de pendências dos diálogos de cadastro (E-17).
 */
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ListaPendencias } from '../components/ui/ListaPendencias';
import {
  useAtendimento,
  useDispensacao,
  useEstoque,
  useFila,
  useHistoricoEmergencia,
  useInternacao,
  useInternacoes,
  useLeito,
  useMapaLeitos,
  useMedicamento,
  useMovimentacoes,
  useSolicitacoes,
} from '../hooks/useDadosOperacoes';
import {
  repoAtendimentos,
  repoDispensacoes,
  repoInternacoes,
  repoLeitos,
  repoMedicamentos,
} from '../services/colecoes-operacoes';
import { iniciarOperacoes } from '../services/inicializacao-operacoes';
import { bloquear } from '../services/leitos';
import { lerMeta } from '../services/repositorio';
import { situacoesHospitalares } from '../services/situacao-hospitalar';
import type { Leito } from '../types';
import { gravarComoOutraAba, leitoLivre, prepararOperacoes } from './utils/operacoes';

prepararOperacoes('2026-11-10T10:00:00-03:00');

const outraAba = (colecao: string) =>
  window.dispatchEvent(new StorageEvent('storage', { key: `medicore:${colecao}:v1` }));

describe('hooks de dados dos módulos', () => {
  it('mapa de leitos recarrega depois de uma gravação nesta aba', async () => {
    const { result } = renderHook(() => useMapaLeitos({ setorId: 'uti' }));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    const livre = leitoLivre('uti');
    await act(() => bloquear(livre.id, { motivo: 'Manutenção' }, livre.versao));
    await waitFor(() =>
      expect(result.current.data!.find((l) => l.id === livre.id)?.status).toBe('bloqueado'),
    );
    expect(result.current.carregando).toBe(false);
  });

  it('fila da emergência recarrega quando outra aba muda os atendimentos', async () => {
    const { result } = renderHook(() => useFila());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    const antes = result.current.data!.aguardandoTriagem.length;
    const alvo = repoAtendimentos.todos().find((a) => a.status === 'aguardando_triagem')!;
    gravarComoOutraAba<{ id: string; status: string }>('atendimentos', (itens) =>
      itens.map((a) => (a.id === alvo.id ? { ...a, status: 'aguardando_atendimento' } : a)),
    );
    act(() => outraAba('atendimentos'));
    await waitFor(() => expect(result.current.data!.aguardandoTriagem.length).toBe(antes - 1));
  });

  it('cada hook entrega os dados do seu serviço', async () => {
    const leito = repoLeitos.todos()[0];
    const internacao = repoInternacoes.todos().find((i) => i.status === 'ativa')!;
    const atendimento = repoAtendimentos.todos()[0];
    const medicamento = repoMedicamentos.todos()[0];
    const dispensacao = repoDispensacoes.todos().find((d) => !d.arquivado)!;
    const { result } = renderHook(() => ({
      leito: useLeito(leito.id),
      internacoes: useInternacoes({}),
      internacao: useInternacao(internacao.id),
      solicitacoes: useSolicitacoes(),
      atendimento: useAtendimento(atendimento.id),
      historico: useHistoricoEmergencia({}),
      estoque: useEstoque({}),
      medicamento: useMedicamento(medicamento.id),
      movimentacoes: useMovimentacoes({}),
      dispensacao: useDispensacao(dispensacao.id),
    }));
    await waitFor(() =>
      expect(Object.values(result.current).every((e) => e.data !== null)).toBe(true),
    );
    expect(result.current.leito.data!.codigo).toBe(leito.codigo);
    expect(result.current.internacao.data!.id).toBe(internacao.id);
    expect(result.current.atendimento.data!.numero).toBe(atendimento.numero);
    expect(result.current.medicamento.data!.estoque.medicamento.id).toBe(medicamento.id);
    expect(result.current.dispensacao.data!.id).toBe(dispensacao.id);
    expect(result.current.estoque.data!.total).toBeGreaterThan(0);
  });

  it('ignora mudanças em coleções de outro módulo', async () => {
    const { result } = renderHook(() => useEstoque({}));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    const dados = result.current.data;
    act(() => outraAba('leitos'));
    expect(result.current.atualizando).toBe(false);
    expect(result.current.data).toBe(dados);
  });
});

describe('inicialização dos módulos (A15, A17)', () => {
  it('roda a retenção do dia e não avisa nada com os dados coerentes', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    iniciarOperacoes();
    expect(lerMeta('retencaoEm')).toBe('2026-11-10');
    expect(aviso).not.toHaveBeenCalled();
    aviso.mockRestore();
  });

  it('em desenvolvimento, mostra no console as invariantes violadas', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const livre = leitoLivre('enfermaria');
    gravarComoOutraAba<Leito>('leitos', (itens) =>
      itens.map((l) => (l.id === livre.id ? { ...l, status: 'ocupado' } : l)),
    );
    iniciarOperacoes();
    expect(aviso).toHaveBeenCalledWith(
      expect.stringContaining('A17'),
      expect.arrayContaining([expect.objectContaining({ inv: 'INV-1' })]),
    );
    aviso.mockRestore();
  });
});

describe('R-X8 — situação hospitalar em lote', () => {
  it('lista internados e pacientes em atendimento, com o leito e o número', async () => {
    const mapa = await situacoesHospitalares();
    const internacao = repoInternacoes.todos().find((i) => i.status === 'ativa')!;
    const leito = repoLeitos.obter(internacao.leitoId)!;
    expect(mapa[internacao.pacienteId].internacao).toEqual({
      id: internacao.id,
      leitoCodigo: leito.codigo,
    });
    const aberto = repoAtendimentos.todos().find((a) => a.status !== 'encerrado' && a.pacienteId)!;
    expect(mapa[aberto.pacienteId!].atendimento?.numero).toBe(aberto.numero);
    const pedido = Object.values(mapa).find((s) => s.solicitacao);
    expect(pedido?.solicitacao?.status).toMatch(/pendente|reservada/);
  });
});

describe('ListaPendencias (E-17)', () => {
  it('mostra cada pendência com o link para resolvê-la', () => {
    render(
      <MemoryRouter>
        <ListaPendencias
          itens={[
            { tipo: 'internacao', id: 'int-1', descricao: 'Internação ativa no leito UTI-07' },
            { tipo: 'atendimento', id: 'atd-1', descricao: 'Atendimento E-0042 aberto' },
          ]}
        />
      </MemoryRouter>,
    );
    const regiao = screen.getByRole('region', { name: 'Pendências em leitos e emergência' });
    expect(within(regiao).getByRole('heading')).toHaveTextContent('(2)');
    expect(within(regiao).getByRole('link', { name: /UTI-07/ })).toHaveAttribute(
      'href',
      '/leitos/internacoes/int-1',
    );
    expect(within(regiao).getByRole('link', { name: /E-0042/ })).toHaveAttribute(
      'href',
      '/emergencia/atd-1',
    );
  });

  it('sem pendências, não mostra nada', () => {
    const { container } = render(
      <MemoryRouter>
        <ListaPendencias itens={[]} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
