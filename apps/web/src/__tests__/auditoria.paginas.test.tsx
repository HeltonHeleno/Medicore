/**
 * Fase 29 (BL-03) — As telas da auditoria com login ligado (serviços de acesso e de auditoria
 * simulados): Configurações → Auditoria com filtros na URL, o antes → depois, a conferência de
 * integridade, o histórico de acesso no paciente e o relatório ao titular.
 */
import type { RespostaSessao } from '@medicore/dominio/contrato/acesso';
import type { RegistroAuditoria } from '@medicore/dominio/contrato/auditoria';
import type { Perfil } from '@medicore/dominio/permissoes';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatarValor, mudancas, quemFez, textoDoDetalhe } from '../components/auditoria/formatar';
import { renderizarComRotas } from './utils/renderizarComRotas';

const m = vi.hoisted(() => {
  let sessao: RespostaSessao | null = null;
  const ouvintes = new Set<() => void>();
  return {
    COM_LOGIN: true,
    sessaoAtual: () => sessao,
    sessaoTerminou: () => false,
    assinarSessao: (f: () => void) => {
      ouvintes.add(f);
      return () => void ouvintes.delete(f);
    },
    usarSessao: (s: RespostaSessao | null) => {
      sessao = s;
      ouvintes.forEach((f) => f());
    },
    carregarSessao: vi.fn(async () => sessao),
    opcoesAcesso: vi.fn(async () => ({ demonstracao: false, email: false })),
    sair: vi.fn(),
    listarUsuarios: vi.fn(async () => []),
  };
});
vi.mock('../services/acesso', () => m);

const au = vi.hoisted(() => ({
  listarAuditoria: vi.fn(),
  pessoasDaAuditoria: vi.fn(async () => [{ id: 'u1', nome: 'Rita Souza' }]),
  conferirIntegridade: vi.fn(),
  dadosDoTitular: vi.fn(),
  enderecoDaExportacao: vi.fn(
    (f: Record<string, unknown>) => `/api/v1/auditoria/exportar?x=${Object.keys(f).join(',')}`,
  ),
}));
vi.mock('../services/auditoria', () => au);

const sessao = (perfis: Perfil[]): RespostaSessao => ({
  etapa: 'ativa',
  csrf: 'c',
  expiraEm: '2026-11-16T12:30:00.000Z',
  usuario: { id: 'u1', nome: 'Rita Souza', email: 'rita@h.com', perfis, demonstracao: false },
});

const registros: RegistroAuditoria[] = [
  {
    id: 2,
    em: '2026-11-16T12:00:00.000Z',
    usuarioId: 'u1',
    usuarioNome: 'Rita Souza',
    ip: '10.0.0.1',
    origem: 'api',
    acao: 'leitura',
    entidade: 'pacientes',
    registroId: 'pac-ana-silva',
    pacienteId: 'pac-ana-silva',
    detalhe: 'cadastro,cpf_completo,alergias',
  },
  {
    id: 1,
    em: '2026-11-16T11:00:00.000Z',
    origem: 'rotina',
    acao: 'alteracao',
    entidade: 'internacoes',
    registroId: 'int-1',
    pacienteId: 'pac-ana-silva',
    campos: {
      status: { antes: 'ativa', depois: 'alta' },
      eventos: { adicionados: [{ tipo: 'alta' }] },
    },
  },
];

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  au.listarAuditoria.mockResolvedValue({ itens: registros, total: 2, pagina: 1, porPagina: 50 });
});

describe('Configurações → Auditoria (BL-03.3)', () => {
  it('Gestão vai direto para a auditoria; filtros vão para a URL; o antes → depois abre', async () => {
    const user = userEvent.setup();
    m.usarSessao(sessao(['gestao']));
    const { router } = renderizarComRotas('/configuracoes');
    expect(await screen.findByRole('heading', { level: 1, name: 'Auditoria' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Configurações' })).not.toBeInTheDocument();
    expect(await screen.findByText('cadastro, CPF completo, alergias')).toBeInTheDocument();
    expect(screen.getByText('Rotina do sistema')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Ver o que mudou \(2 campos\)/ }));
    expect(screen.getByText('ativa → alta')).toBeInTheDocument();
    expect(screen.getByText(/adicionado: tipo: alta/)).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Rita Souza' })).toBeInTheDocument(),
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Pessoa' }), 'u1');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ação' }), 'leitura');
    await user.type(screen.getByRole('textbox', { name: 'Paciente (id)' }), 'pac-ana-silva');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() =>
      expect(au.listarAuditoria).toHaveBeenLastCalledWith({
        usuarioId: 'u1',
        acao: 'leitura',
        pacienteId: 'pac-ana-silva',
        pagina: 1,
        porPagina: 50,
      }),
    );
    expect(router.state.location.search).toContain('pacienteId=pac-ana-silva');
    expect(screen.getByRole('link', { name: 'Exportar CSV' })).toHaveAttribute(
      'href',
      '/api/v1/auditoria/exportar?x=usuarioId,pacienteId,acao',
    );
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('Administrador tem as duas abas; a integridade confere e acusa', async () => {
    const user = userEvent.setup();
    m.usarSessao(sessao(['administrador']));
    au.conferirIntegridade
      .mockResolvedValueOnce({ diasConferidos: 0, registrosConferidos: 0, violacoes: [] })
      .mockResolvedValueOnce({ diasConferidos: 3, registrosConferidos: 1200, violacoes: [] })
      .mockResolvedValueOnce({
        diasConferidos: 3,
        registrosConferidos: 1200,
        violacoes: [{ dia: '2026-11-15', quantidadeSelada: 10, quantidadeAtual: 9 }],
      });
    renderizarComRotas('/configuracoes');
    const abas = await screen.findByRole('navigation', { name: 'Configurações' });
    await user.click(within(abas).getByRole('link', { name: 'Auditoria' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Auditoria' })).toBeInTheDocument();
    const conferir = screen.getByRole('button', { name: 'Conferir agora' });
    await user.click(conferir);
    expect(await screen.findByText(/Nenhum dia selado ainda/)).toBeInTheDocument();
    await user.click(conferir);
    expect(
      await screen.findByText('Trilha íntegra: 3 dias conferidos, 1.200 registros.'),
    ).toBeInTheDocument();
    await user.click(conferir);
    expect(await screen.findByText(/2026-11-15: o selo não confere/)).toBeInTheDocument();
  });

  it('sem registros, avisa; página 2 vai para a URL', async () => {
    const user = userEvent.setup();
    m.usarSessao(sessao(['gestao']));
    au.listarAuditoria.mockResolvedValueOnce({ itens: [], total: 0, pagina: 1, porPagina: 50 });
    const { unmount } = renderizarComRotas('/configuracoes?acao=exclusao');
    expect(await screen.findByText('Nenhum registro com estes filtros.')).toBeInTheDocument();
    unmount();
    au.listarAuditoria.mockResolvedValue({
      itens: registros,
      total: 120,
      pagina: 1,
      porPagina: 50,
    });
    const { router } = renderizarComRotas('/configuracoes');
    await user.click(await screen.findByRole('button', { name: 'Próxima página' }));
    await waitFor(() => expect(router.state.location.search).toContain('pagina=2'));
  });
});

describe('no paciente (BL-03.3, BL-03.4)', () => {
  it('histórico de acesso para Administrador e Gestão; nada para a Recepção', async () => {
    m.usarSessao(sessao(['gestao']));
    const { unmount } = renderizarComRotas('/pacientes/pac-ana-silva');
    expect(await screen.findByRole('region', { name: 'Histórico de acesso' })).toBeInTheDocument();
    expect(au.listarAuditoria).toHaveBeenCalledWith({
      pacienteId: 'pac-ana-silva',
      pagina: 1,
      porPagina: 10,
    });
    expect(screen.getByRole('link', { name: 'Ver tudo na auditoria' })).toHaveAttribute(
      'href',
      '/configuracoes?aba=auditoria&pacienteId=pac-ana-silva',
    );
    unmount();
    m.usarSessao(sessao(['recepcao']));
    renderizarComRotas('/pacientes/pac-ana-silva');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('region', { name: 'Histórico de acesso' })).not.toBeInTheDocument();
  });

  it('relatório ao titular: dados, coleções e acessos; imprime', async () => {
    const user = userEvent.setup();
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {});
    m.usarSessao(sessao(['administrador']));
    au.dadosDoTitular.mockResolvedValue({
      geradoEm: '2026-11-16T12:00:00.000Z',
      paciente: {
        id: 'pac-ana-silva',
        nome: 'Ana Silva',
        cpf: '52998224725',
        dataNascimento: '1990-01-01',
        versao: 3,
      },
      consultas: [{ id: 'c1', inicio: '2026-11-20T13:00:00.000Z', status: 'agendada' }],
      internacoes: [],
      atendimentos: [],
      dispensacoes: [],
      acessos: registros,
    });
    renderizarComRotas('/pacientes/pac-ana-silva/titular');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Relatório ao titular dos dados' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dados pessoais de Ana Silva/)).toBeInTheDocument();
    expect(screen.getByText('52998224725')).toBeInTheDocument();
    expect(screen.getByText('01/01/1990')).toBeInTheDocument();
    expect(screen.queryByText('versao:')).not.toBeInTheDocument();
    expect(screen.getAllByText('Nenhum.')).toHaveLength(3);
    expect(screen.getByText('Leitura: cadastro, CPF completo, alergias')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Imprimir ou salvar em PDF' }));
    expect(imprimir).toHaveBeenCalled();
  });

  it('o menu do paciente tem o pedido do titular só para o Administrador', async () => {
    const user = userEvent.setup();
    m.usarSessao(sessao(['administrador']));
    renderizarComRotas('/pacientes/pac-ana-silva');
    await user.click(await screen.findByRole('button', { name: /Mais ações para/ }));
    expect(screen.getByRole('menuitem', { name: 'Pedido do titular (LGPD)' })).toHaveAttribute(
      'href',
      '/pacientes/pac-ana-silva/titular',
    );
  });
});

describe('formatação da trilha', () => {
  it('valores, quem fez, detalhes e mudanças', () => {
    expect(formatarValor(null)).toBe('(vazio)');
    expect(formatarValor(true)).toBe('sim');
    expect(formatarValor(false)).toBe('não');
    expect(formatarValor('2026-11-16')).toBe('16/11/2026');
    expect(formatarValor([])).toBe('(vazio)');
    expect(formatarValor([1, 'a'])).toBe('1; a');
    expect(formatarValor({ a: 1, b: null })).toBe('a: 1');
    expect(quemFez({ origem: 'banco' })).toBe('Banco de dados');
    expect(quemFez({ origem: 'outra' })).toBe('outra');
    expect(textoDoDetalhe('exportacao_auditoria (acao=leitura)')).toBe(
      'exportação da auditoria (acao=leitura)',
    );
    expect(textoDoDetalhe('desconhecido')).toBe('desconhecido');
    expect(mudancas(undefined)).toEqual([]);
    expect(mudancas({ x: null })).toEqual([{ campo: 'x', antes: '(vazio)', depois: '(vazio)' }]);
  });
});
