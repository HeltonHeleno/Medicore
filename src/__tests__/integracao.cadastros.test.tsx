/**
 * 20.10 e 20.11 — Situação hospitalar nos cadastros: detalhe do paciente, detalhe do médico e
 * aviso no agendamento (R-X8). Dados de exemplo e roteador real.
 */
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  repoAtendimentos,
  repoDispensacoes,
  repoInternacoes,
  repoLeitos,
} from '../services/colecoes-operacoes';
import { darAlta } from '../services/leitos';
import { renderizarComRotas } from './utils/renderizarComRotas';
import { esperarConsistente, pacienteLivre, prepararOperacoes } from './utils/operacoes';

prepararOperacoes('2026-11-10T10:30:00-03:00');

const ativa = () => repoInternacoes.todos().find((i) => i.status === 'ativa' && !i.arquivado)!;
const aberto = () =>
  repoAtendimentos.todos().find((a) => a.status !== 'encerrado' && a.pacienteId)!;
const codigo = (leitoId: string) => repoLeitos.obter(leitoId)!.codigo;
const regiao = (nome: string) => screen.findByRole('region', { name: nome });

describe('Detalhe do paciente (20.10)', { timeout: 30_000 }, () => {
  it('internado: situação com link, sem ações, e a internação no histórico', async () => {
    const i = ativa();
    renderizarComRotas(`/pacientes/${i.pacienteId}`);
    const situacao = await regiao('Situação hospitalar');
    expect(
      await within(situacao).findByText(`Internado(a) no leito ${codigo(i.leitoId)}`),
    ).toBeInTheDocument();
    expect(within(situacao).getByRole('link', { name: 'Ver internação' })).toHaveAttribute(
      'href',
      `/leitos/internacoes/${i.id}`,
    );
    expect(within(situacao).queryByRole('link', { name: 'Internar' })).not.toBeInTheDocument();
    expect(
      within(situacao).queryByRole('link', { name: 'Registrar chegada na emergência' }),
    ).not.toBeInTheDocument();

    const historico = await regiao('Histórico hospitalar');
    const link = within(historico).getByRole('link', { name: `Leito ${codigo(i.leitoId)}` });
    expect(link).toHaveAttribute('href', `/leitos/internacoes/${i.id}`);
    expect(link.parentElement).toHaveTextContent('em curso');
  });

  it('em atendimento: situação com link para o atendimento e o número no histórico', async () => {
    const a = aberto();
    renderizarComRotas(`/pacientes/${a.pacienteId}`);
    const situacao = await regiao('Situação hospitalar');
    expect(
      await within(situacao).findByText(`Em atendimento na emergência (${a.numero})`),
    ).toBeInTheDocument();
    expect(within(situacao).getByRole('link', { name: 'Ver atendimento' })).toHaveAttribute(
      'href',
      `/emergencia/${a.id}`,
    );
    expect(within(situacao).queryByRole('link', { name: 'Internar' })).not.toBeInTheDocument();
    const historico = await regiao('Histórico hospitalar');
    expect(within(historico).getByRole('link', { name: a.numero })).toBeInTheDocument();
  });

  it('sem situação: mostra Internar e Registrar chegada com o paciente na URL', async () => {
    const user = userEvent.setup();
    const p = pacienteLivre();
    const { router } = renderizarComRotas(`/pacientes/${p.id}`);
    const situacao = await regiao('Situação hospitalar');
    expect(
      await within(situacao).findByText('Não está internado(a) nem em atendimento na emergência.'),
    ).toBeInTheDocument();
    expect(within(situacao).getByRole('link', { name: 'Internar' })).toHaveAttribute(
      'href',
      `/leitos/internar?pacienteId=${p.id}`,
    );
    await user.click(
      within(situacao).getByRole('link', { name: 'Registrar chegada na emergência' }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/emergencia/chegada'));
    expect(router.state.location.search).toBe(`?pacienteId=${p.id}`);
  });

  it('paciente inativo não tem as ações', async () => {
    const p = pacienteLivre();
    const { repoPacientes } = await import('../services/colecoes');
    repoPacientes.atualizar(p.id, { ativo: false, inativadoEm: '2026-11-01T12:00:00.000Z' });
    renderizarComRotas(`/pacientes/${p.id}`);
    const situacao = await regiao('Situação hospitalar');
    await within(situacao).findByText('Não está internado(a) nem em atendimento na emergência.');
    expect(within(situacao).queryByRole('link', { name: 'Internar' })).not.toBeInTheDocument();
  });

  it('a alta muda a situação na hora e o registro arquivado aparece sem link', async () => {
    const i = ativa();
    const anterior = repoInternacoes.todos().find((x) => x.status === 'encerrada')!;
    repoInternacoes.atualizar(anterior.id, { pacienteId: i.pacienteId, arquivado: true });
    renderizarComRotas(`/pacientes/${i.pacienteId}`);
    const situacao = await regiao('Situação hospitalar');
    await within(situacao).findByRole('link', { name: 'Ver internação' });

    const historico = await regiao('Histórico hospitalar');
    const arquivada = within(historico)
      .getAllByText(`Leito ${codigo(anterior.leitoId)}`)
      .find((x) => x.tagName !== 'A')!;
    expect(arquivada.parentElement).toHaveTextContent('registro arquivado');

    await act(() =>
      darAlta(
        i.id,
        { tipo: 'melhorada', em: new Date().toISOString() },
        repoInternacoes.obter(i.id)!.versao,
      ),
    );
    await waitFor(() =>
      expect(within(situacao).queryByRole('link', { name: 'Ver internação' })).toBeNull(),
    );
    expect(
      within(historico).getByRole('link', { name: `Leito ${codigo(i.leitoId)}` }).parentElement,
    ).toHaveTextContent('alta melhorada');
    esperarConsistente();
  });

  it('dispensações dos últimos 30 dias', async () => {
    const d = repoDispensacoes.todos().find((x) => !x.arquivado)!;
    renderizarComRotas(`/pacientes/${d.pacienteId}`);
    const historico = await regiao('Histórico hospitalar');
    await waitFor(() =>
      expect(
        within(historico)
          .getAllByRole('link')
          .some((l) => l.getAttribute('href') === `/farmacia/dispensacoes/${d.id}`),
      ).toBe(true),
    );
  });
});

describe('Detalhe do médico e agenda (20.11)', { timeout: 30_000 }, () => {
  it('médico com internação e atendimento em curso', async () => {
    const i = ativa();
    const a = repoAtendimentos.todos().find((x) => x.status !== 'encerrado' && x.medicoId)!;
    repoAtendimentos.atualizar(a.id, { medicoId: i.medicoResponsavelId });
    renderizarComRotas(`/medicos/${i.medicoResponsavelId}`);
    const internacoes = await regiao('Internações sob responsabilidade');
    await waitFor(() =>
      expect(
        within(internacoes)
          .getAllByRole('link')
          .some((l) => l.getAttribute('href') === `/leitos/internacoes/${i.id}`),
      ).toBe(true),
    );
    expect(internacoes).toHaveTextContent(`Leito ${codigo(i.leitoId)}`);
    const atendimentos = await regiao('Atendimentos em curso na emergência');
    expect(atendimentos).toHaveTextContent(a.numero);
    expect(
      within(atendimentos)
        .getAllByRole('link')
        .some((l) => l.getAttribute('href') === `/emergencia/${a.id}`),
    ).toBe(true);
  });

  it('médico sem vínculos mostra as frases vazias', async () => {
    renderizarComRotas('/medicos/med-sergio-tavares');
    expect(
      await screen.findByText('Nenhuma internação ativa sob responsabilidade.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Nenhum atendimento em curso.')).toBeInTheDocument();
  });

  it('agendar para paciente internado mostra o aviso (R-X8); livre, não', async () => {
    const i = ativa();
    renderizarComRotas(`/consultas/nova?pacienteId=${i.pacienteId}`);
    expect(
      await screen.findByText(`Paciente internado em ${codigo(i.leitoId)}`),
    ).toBeInTheDocument();
  });

  it('paciente livre não tem o aviso', async () => {
    const p = pacienteLivre();
    renderizarComRotas(`/consultas/nova?pacienteId=${p.id}`);
    await screen.findByDisplayValue(new RegExp(p.nome.split(' ')[0]));
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(screen.queryByText(/Paciente internado em/)).not.toBeInTheDocument();
  });
});
