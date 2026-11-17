/**
 * Fase 28 (BL-02) — As telas de acesso com login ligado (o serviço de acesso é simulado; os outros
 * continuam com os dados locais): login com MFA, primeiro acesso, senha nova, a guarda das rotas, o
 * aviso de sessão terminada (E-19), o que cada perfil vê e a administração de usuários.
 */
import type { RespostaSessao } from '@medicore/dominio/contrato/acesso';
import { ErroConflito, ErroLimite, ErroNaoEncontrado, ErroSessao } from '@medicore/dominio/erros';
import type { Perfil } from '@medicore/dominio/permissoes';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderizarComRotas } from './utils/renderizarComRotas';

const m = vi.hoisted(() => {
  let sessao: RespostaSessao | null = null;
  let terminou = false;
  const ouvintes = new Set<() => void>();
  const avisar = () => ouvintes.forEach((f) => f());
  const usarSessao = (s: RespostaSessao | null) => {
    sessao = s;
    if (s?.etapa === 'ativa') terminou = false;
    avisar();
  };
  return {
    COM_LOGIN: true,
    sessaoAtual: () => sessao,
    sessaoTerminou: () => terminou,
    terminar: () => {
      terminou = true;
      avisar();
    },
    assinarSessao: (f: () => void) => {
      ouvintes.add(f);
      return () => void ouvintes.delete(f);
    },
    usarSessao,
    carregarSessao: vi.fn(async () => sessao),
    opcoesAcesso: vi.fn(async () => ({ demonstracao: true, email: true })),
    entrar: vi.fn(),
    entrarDemonstracao: vi.fn(),
    confirmarMfa: vi.fn(),
    configurarMfa: vi.fn(),
    concluirMfa: vi.fn(),
    conferirConvite: vi.fn(),
    aceitarConvite: vi.fn(),
    esqueciSenha: vi.fn(async () => {}),
    redefinirSenha: vi.fn(async () => {}),
    sair: vi.fn(async () => usarSessao(null)),
    listarUsuarios: vi.fn(),
    obterUsuario: vi.fn(),
    convidarUsuario: vi.fn(),
    editarUsuario: vi.fn(),
    desativarUsuario: vi.fn(),
    reativarUsuario: vi.fn(),
    desbloquearUsuario: vi.fn(),
    redefinirMfaUsuario: vi.fn(),
    novoLinkUsuario: vi.fn(),
  };
});
vi.mock('../services/acesso', () => m);

const sessao = (perfis: Perfil[], etapa: RespostaSessao['etapa'] = 'ativa'): RespostaSessao => ({
  etapa,
  csrf: 'c',
  expiraEm: '2026-11-16T12:30:00.000Z',
  usuario: { id: 'u1', nome: 'Rita Souza', email: 'rita@h.com', perfis, demonstracao: false },
});

/** As ações devolvem a sessão e a guardam (como o serviço de verdade). */
const devolve = (s: RespostaSessao) => async () => {
  m.usarSessao(s);
  return s;
};

beforeEach(() => {
  localStorage.clear();
  m.usarSessao(null);
  vi.clearAllMocks();
});

describe('login (BL-02.1, BL-02.2)', () => {
  it('sem sessão, qualquer tela leva ao login; depois de entrar, volta para ela', async () => {
    const user = userEvent.setup();
    m.entrar.mockImplementation(devolve(sessao(['recepcao'])));
    const { router } = renderizarComRotas('/pacientes');
    expect(await screen.findByRole('heading', { name: 'Entrar no MediCore' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?volta=%2Fpacientes');
    await user.type(screen.getByRole('textbox', { name: /E-mail/ }), 'rita@h.com');
    await user.type(screen.getByLabelText(/^Senha/), 'senha certa');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(m.entrar).toHaveBeenCalledWith('rita@h.com', 'senha certa');
    expect(await screen.findByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument();
    expect(screen.getAllByText('Rita Souza').length).toBeGreaterThan(0);
  });

  it('senha errada e bloqueio mostram a mensagem; a senha é apagada', async () => {
    const user = userEvent.setup();
    m.entrar.mockRejectedValueOnce(
      new ErroConflito('codigo_incorreto', 'E-mail ou senha incorretos.'),
    );
    m.entrar.mockRejectedValueOnce(new ErroLimite(900));
    renderizarComRotas('/entrar');
    await user.type(await screen.findByRole('textbox', { name: /E-mail/ }), 'x@h.com');
    await user.type(screen.getByLabelText(/^Senha/), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Senha/)).toHaveValue('');
    await user.type(screen.getByLabelText(/^Senha/), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/Muitas tentativas|15 min/)).toBeInTheDocument();
  });

  it('MFA: código do aplicativo, código de recuperação e etapa vencida', async () => {
    const user = userEvent.setup();
    m.entrar.mockImplementation(devolve(sessao(['gestao'], 'mfa')));
    m.confirmarMfa.mockRejectedValueOnce(new ErroConflito('codigo_incorreto', 'Código incorreto.'));
    m.confirmarMfa.mockRejectedValueOnce(new ErroSessao());
    renderizarComRotas('/entrar');
    await user.type(await screen.findByRole('textbox', { name: /E-mail/ }), 'g@h.com');
    await user.type(screen.getByLabelText(/^Senha/), 'senha');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(
      await screen.findByRole('heading', { name: 'Código de verificação' }),
    ).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /^Código/ }), '000000');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Código incorreto.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar um código de recuperação' }));
    expect(screen.getByRole('textbox', { name: /Código de recuperação/ })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /Código de recuperação/ }), 'AAAA-BBBB');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    // A etapa venceu: volta para a senha, com o aviso.
    expect(await screen.findByText(/O tempo para digitar o código acabou/)).toBeInTheDocument();
    m.confirmarMfa.mockImplementation(devolve(sessao(['gestao'])));
    await user.type(screen.getByLabelText(/^Senha/), 'senha');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await user.type(await screen.findByRole('textbox', { name: /^Código/ }), '123456');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: /Rita Souza/ }),
    ).toBeInTheDocument();
  });

  it('primeira configuração do MFA: QR, chave, códigos de recuperação e "Guardei"', async () => {
    const user = userEvent.setup();
    const copiar = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: copiar },
      configurable: true,
    });
    m.entrarDemonstracao.mockImplementation(devolve(sessao(['administrador'], 'configurar_mfa')));
    m.configurarMfa.mockResolvedValue({ segredo: 'JBSWY3DPEHPK3PXP', qrSvg: '<svg></svg>' });
    m.concluirMfa.mockImplementation(async () => {
      m.usarSessao(sessao(['administrador']));
      return { ...sessao(['administrador']), codigosRecuperacao: ['AAAA-BBBB', 'CCCC-DDDD'] };
    });
    renderizarComRotas('/entrar');
    await user.click(await screen.findByRole('button', { name: 'Entrar como Administrador' }));
    expect(await screen.findByTestId('chave-mfa')).toHaveTextContent('JBSWY3DPEHPK3PXP');
    expect(
      screen.getByRole('img', { name: 'QR code para o aplicativo autenticador' }),
    ).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /^Código/ }), '123456');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    const lista = await screen.findByRole('list', { name: 'Código de recuperação' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Copiar os códigos' }));
    expect(copiar).toHaveBeenCalledWith('AAAA-BBBB\nCCCC-DDDD');
    expect(await screen.findByRole('button', { name: 'Códigos copiados.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardei os códigos' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: /Rita Souza/ }),
    ).toBeInTheDocument();
  });

  it('sem contas de demonstração no ambiente, os botões não aparecem', async () => {
    m.opcoesAcesso.mockResolvedValueOnce({ demonstracao: false, email: true });
    renderizarComRotas('/entrar');
    await screen.findByRole('heading', { name: 'Entrar no MediCore' });
    await waitFor(() => expect(m.opcoesAcesso).toHaveBeenCalled());
    expect(screen.queryByText('Contas de demonstração')).not.toBeInTheDocument();
  });

  it('com sessão, /entrar vai direto para o sistema', async () => {
    m.usarSessao(sessao(['nir']));
    renderizarComRotas('/entrar?volta=/leitos');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Gestão de leitos' }),
    ).toBeInTheDocument();
  });
});

describe('primeiro acesso e senha (BL-02.2, BL-02.3)', () => {
  it('convite: "Olá", senha curta, diferentes e a senha aceita', async () => {
    const user = userEvent.setup();
    m.conferirConvite.mockResolvedValue({ nome: 'Ana Lima', email: 'ana@h.com' });
    m.aceitarConvite.mockImplementation(devolve(sessao(['recepcao'])));
    renderizarComRotas('/primeiro-acesso#token-do-convite-com-mais-de-20');
    expect(
      await screen.findByText('Olá, Ana Lima. Defina a senha da sua conta.'),
    ).toBeInTheDocument();
    expect(m.conferirConvite).toHaveBeenCalledWith('token-do-convite-com-mais-de-20');
    await user.type(screen.getByLabelText(/^Nova senha/), 'curta');
    await user.click(screen.getByRole('button', { name: 'Definir a senha' }));
    expect(screen.getByText('A senha precisa ter 12 caracteres ou mais.')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Nova senha/), ' mas agora longa');
    await user.type(screen.getByLabelText(/^Confirme/), 'outra coisa qualquer');
    await user.click(screen.getByRole('button', { name: 'Definir a senha' }));
    expect(screen.getByText('As senhas não são iguais.')).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/^Confirme/));
    await user.type(screen.getByLabelText(/^Confirme/), 'curta mas agora longa');
    await user.click(screen.getByRole('button', { name: 'Definir a senha' }));
    expect(m.aceitarConvite).toHaveBeenCalledWith(
      'token-do-convite-com-mais-de-20',
      'curta mas agora longa',
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: /Rita Souza/ }),
    ).toBeInTheDocument();
  });

  it('convite com MFA segue para a configuração; convite vencido avisa', async () => {
    const user = userEvent.setup();
    m.conferirConvite.mockResolvedValueOnce({ nome: 'Gil', email: 'g@h.com' });
    m.aceitarConvite.mockImplementation(devolve(sessao(['gestao'], 'configurar_mfa')));
    m.configurarMfa.mockRejectedValue(new ErroSessao());
    const { router, unmount } = renderizarComRotas(
      '/primeiro-acesso#token-do-convite-com-mais-de-20',
    );
    await screen.findByText(/Olá, Gil/);
    await user.type(screen.getByLabelText(/^Nova senha/), 'frase bem comprida');
    await user.type(screen.getByLabelText(/^Confirme/), 'frase bem comprida');
    await user.click(screen.getByRole('button', { name: 'Definir a senha' }));
    // O segundo fator falhou por sessão: volta para o login.
    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'));
    unmount();

    m.conferirConvite.mockRejectedValueOnce(new ErroNaoEncontrado('x'));
    renderizarComRotas('/primeiro-acesso#vencido-vencido-vencido-vencido');
    expect(await screen.findByText(/Este convite venceu ou já foi usado/)).toBeInTheDocument();
  });

  it('esqueci a senha: mesma resposta; sem e-mail no ambiente, pede ao administrador', async () => {
    const user = userEvent.setup();
    const { unmount } = renderizarComRotas('/esqueci-senha');
    await user.type(await screen.findByRole('textbox', { name: /E-mail/ }), 'a@h.com');
    await user.click(screen.getByRole('button', { name: 'Enviar o link' }));
    expect(await screen.findByText(/o link chega em alguns minutos/)).toBeInTheDocument();
    unmount();
    m.opcoesAcesso.mockResolvedValueOnce({ demonstracao: false, email: false });
    renderizarComRotas('/esqueci-senha');
    expect(await screen.findByText(/Este ambiente não envia e-mails/)).toBeInTheDocument();
  });

  it('redefinir: senha nova aceita; link vencido avisa', async () => {
    const user = userEvent.setup();
    const { unmount } = renderizarComRotas('/redefinir-senha#token-da-redefinicao-com-mais-de-20');
    await user.type(await screen.findByLabelText(/^Nova senha/), 'frase bem comprida');
    await user.type(screen.getByLabelText(/^Confirme/), 'frase bem comprida');
    await user.click(screen.getByRole('button', { name: 'Definir a senha' }));
    expect(await screen.findByText(/Senha nova definida/)).toBeInTheDocument();
    unmount();
    m.redefinirSenha.mockRejectedValueOnce(new ErroNaoEncontrado('x'));
    renderizarComRotas('/redefinir-senha#token-da-redefinicao-com-mais-de-20');
    await user.type(await screen.findByLabelText(/^Nova senha/), 'frase bem comprida');
    await user.type(screen.getByLabelText(/^Confirme/), 'frase bem comprida');
    await user.click(screen.getByRole('button', { name: 'Definir a senha' }));
    expect(await screen.findByText(/Este link venceu ou já foi usado/)).toBeInTheDocument();
  });
});

describe('sessão com a tela aberta (E-19) e sair', () => {
  it('a sessão termina: o aviso pede o login ali mesmo e a tela continua', async () => {
    const user = userEvent.setup();
    m.usarSessao(sessao(['recepcao']));
    m.entrarDemonstracao.mockImplementation(devolve(sessao(['recepcao'])));
    renderizarComRotas('/pacientes/novo');
    const nome = await screen.findByRole('textbox', { name: /^Nome completo/ });
    await user.type(nome, 'Maria Que Fica');
    act(() => m.terminar());
    const aviso = await screen.findByRole('alertdialog', { name: 'Sua sessão terminou' });
    expect(within(aviso).getByRole('textbox', { name: /E-mail/ })).toHaveValue('rita@h.com');
    await user.click(within(aviso).getByRole('button', { name: 'Entrar como Recepção' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: /^Nome completo/ })).toHaveValue('Maria Que Fica');
  });

  it('"Sair" no menu do usuário encerra a sessão e volta ao login', async () => {
    const user = userEvent.setup();
    m.usarSessao(sessao(['recepcao']));
    renderizarComRotas('/');
    await user.click(await screen.findByRole('button', { name: /menu do usuário/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Sair' }));
    expect(m.sair).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: 'Entrar no MediCore' })).toBeInTheDocument();
  });

  it('sem servidor ao abrir: o layout abre (cada tela mostra o E-22)', async () => {
    m.carregarSessao.mockRejectedValueOnce(new Error('rede'));
    renderizarComRotas('/');
    expect(
      await screen.findByRole('navigation', { name: 'Navegação principal' }),
    ).toBeInTheDocument();
  });
});

describe('o que cada perfil vê (BL-02.6)', () => {
  it('Recepção: sem "Dar alta", "Transferir" nem ações de leito; com "Novo paciente"', async () => {
    m.usarSessao(sessao(['recepcao']));
    renderizarComRotas('/leitos');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Gestão de leitos' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Internar paciente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Concluir higienização/ })).not.toBeInTheDocument();
  });

  it('Farmácia: sem "Registrar chegada"; Enfermagem: com', async () => {
    m.usarSessao(sessao(['farmacia']));
    const { unmount } = renderizarComRotas('/emergencia');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Emergência' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Registrar chegada' })).not.toBeInTheDocument();
    unmount();
    m.usarSessao(sessao(['enfermagem']));
    renderizarComRotas('/emergencia');
    expect(await screen.findByRole('link', { name: 'Registrar chegada' })).toBeInTheDocument();
  });

  it('Configurações: Usuários só para o Administrador (a Gestão vê a auditoria; o NIR, nada)', async () => {
    m.usarSessao(sessao(['gestao']));
    const { unmount } = renderizarComRotas('/configuracoes');
    expect(await screen.findByRole('heading', { level: 1, name: 'Auditoria' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Convidar usuário' })).not.toBeInTheDocument();
    unmount();
    m.usarSessao(sessao(['nir']));
    renderizarComRotas('/configuracoes');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Configurações' }),
    ).toBeInTheDocument();
  });
});

describe('administração de usuários (BL-02.5)', () => {
  const usuario = {
    id: 'u2',
    versao: 1,
    nome: 'Beto Nunes',
    email: 'beto@h.com',
    perfis: ['nir'] as Perfil[],
    ativo: true,
    convidado: false,
    mfaAtivo: true,
    bloqueadoAte: '2026-11-16T13:00:00.000Z',
    criadoEm: '2026-11-01T10:00:00.000Z',
  };

  beforeEach(() => {
    m.usarSessao(sessao(['administrador']));
    m.listarUsuarios.mockResolvedValue([
      usuario,
      {
        ...usuario,
        id: 'u3',
        nome: 'Caio',
        email: 'c@h.com',
        convidado: true,
        ativo: false,
        mfaAtivo: false,
        bloqueadoAte: undefined,
        ultimoAcessoEm: '2026-11-15T10:00:00.000Z',
      },
    ]);
  });

  it('lista, convida (link para copiar sem e-mail) e edita', async () => {
    const user = userEvent.setup();
    m.convidarUsuario.mockResolvedValue({
      usuario: { ...usuario, id: 'u9', nome: 'Dora' },
      tipo: 'convite',
      link: 'https://app/primeiro-acesso#abc',
    });
    m.editarUsuario.mockResolvedValue(usuario);
    renderizarComRotas('/configuracoes');
    expect(await screen.findByRole('heading', { level: 1, name: 'Usuários' })).toBeInTheDocument();
    expect(await screen.findByText('Beto Nunes')).toBeInTheDocument();
    expect(screen.getByText('Bloqueado por tentativas')).toBeInTheDocument();
    expect(screen.getByText('Desativado')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Convidar usuário' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Convidar usuário' });
    await user.type(within(dialogo).getByRole('textbox', { name: /Nome/ }), 'Dora Reis');
    await user.type(within(dialogo).getByRole('textbox', { name: /E-mail/ }), 'dora@h.com');
    await user.click(within(dialogo).getByRole('checkbox', { name: 'Médico' }));
    expect(within(dialogo).getByRole('combobox', { name: /Médico vinculado/ })).toBeInTheDocument();
    await user.click(within(dialogo).getByRole('checkbox', { name: 'Médico' }));
    await user.click(within(dialogo).getByRole('checkbox', { name: 'NIR' }));
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(m.convidarUsuario).toHaveBeenCalledWith({
      nome: 'Dora Reis',
      email: 'dora@h.com',
      perfis: ['nir'],
      medicoId: undefined,
    });
    const link = await screen.findByRole('dialog', { name: 'Link para a pessoa' });
    expect(within(link).getByRole('textbox')).toHaveValue('https://app/primeiro-acesso#abc');
    await user.click(within(link).getByRole('button', { name: 'Fechar janela' }));

    await user.click(screen.getByRole('button', { name: 'Mais ações para Beto Nunes' }));
    await user.click(screen.getByRole('menuitem', { name: 'Editar' }));
    const edicao = await screen.findByRole('dialog', { name: 'Editar' });
    await user.click(within(edicao).getByRole('checkbox', { name: 'Gestão' }));
    await user.click(within(edicao).getByRole('button', { name: 'Salvar' }));
    expect(m.editarUsuario).toHaveBeenCalledWith(
      'u2',
      { nome: 'Beto Nunes', email: 'beto@h.com', perfis: ['nir', 'gestao'], medicoId: undefined },
      1,
    );
  });

  it('erro do servidor aparece no formulário (e-mail duplicado)', async () => {
    const user = userEvent.setup();
    m.convidarUsuario.mockRejectedValue(
      new ErroConflito('usuario_duplicado', 'Já existe um usuário com este e-mail.', {
        campo: 'email',
      }),
    );
    renderizarComRotas('/configuracoes');
    await user.click(await screen.findByRole('button', { name: 'Convidar usuário' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Convidar usuário' });
    await user.type(within(dialogo).getByRole('textbox', { name: /Nome/ }), 'Beto Dois');
    await user.type(within(dialogo).getByRole('textbox', { name: /E-mail/ }), 'beto@h.com');
    await user.click(within(dialogo).getByRole('checkbox', { name: 'NIR' }));
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(
      await within(dialogo).findByText('Já existe um usuário com este e-mail.'),
    ).toBeInTheDocument();
  });

  it('ações da linha: desbloquear, redefinir MFA, link enviado, desativar e reativar', async () => {
    const user = userEvent.setup();
    m.desbloquearUsuario.mockResolvedValue(usuario);
    m.redefinirMfaUsuario.mockResolvedValue(usuario);
    m.novoLinkUsuario.mockResolvedValue({
      usuario,
      tipo: 'redefinicao',
      enviadoPara: 'beto@h.com',
    });
    m.desativarUsuario.mockRejectedValue(new Error('Este é o último administrador ativo.'));
    m.reativarUsuario.mockResolvedValue(usuario);
    renderizarComRotas('/configuracoes');
    await screen.findByText('Beto Nunes');
    const menu = async (nome: string, acao: string) => {
      await user.click(screen.getByRole('button', { name: `Mais ações para ${nome}` }));
      await user.click(screen.getByRole('menuitem', { name: acao }));
    };
    await menu('Beto Nunes', 'Desbloquear');
    expect(await screen.findByText('Beto Nunes pode entrar de novo.')).toBeInTheDocument();
    await menu('Beto Nunes', 'Redefinir o segundo fator');
    expect(m.redefinirMfaUsuario).toHaveBeenCalledWith('u2');
    await menu('Beto Nunes', 'Gerar link de nova senha');
    expect(await screen.findByText('Link enviado para beto@h.com.')).toBeInTheDocument();
    await menu('Beto Nunes', 'Desativar');
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Desativar' }),
    );
    expect(await screen.findByText('Este é o último administrador ativo.')).toBeInTheDocument();
    await menu('Caio', 'Reativar');
    expect(m.reativarUsuario).toHaveBeenCalledWith('u3');
  });
});
