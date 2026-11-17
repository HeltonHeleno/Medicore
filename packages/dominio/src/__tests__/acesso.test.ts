/**
 * Fase 28 (BL-02) — Perfis e permissões (a matriz da especificação), o autor das ações (D31), o
 * contrato e o cliente HTTP do acesso.
 */
import { criarClienteAcesso } from '../cliente/acesso';
import type { RequisicaoApi, RespostaApi } from '../cliente/cadastros';
import { entradaUsuario, respostaSessao } from '../contrato/acesso';
import { ErroConflito, ErroRede } from '../erros';
import { ACOES, ehPerfil, exigeMfa, PERFIS, PERMISSOES, pode } from '../permissoes';
import {
  autorAtual,
  autorDaAcao,
  autoria,
  autorIdAtual,
  definirFonteDoAutor,
} from '../utils/autor';

describe('permissões (BL-02.6)', () => {
  it('toda ação tem ao menos um perfil, e todo perfil vê', () => {
    for (const acao of ACOES) expect(PERMISSOES[acao].length, acao).toBeGreaterThan(0);
    for (const perfil of PERFIS) expect(pode([perfil], 'ver')).toBe(true);
  });

  it('a matriz da especificação: exemplos de cada lado', () => {
    expect(pode(['recepcao'], 'internacao.alta')).toBe(false);
    expect(pode(['medico'], 'internacao.alta')).toBe(true);
    expect(pode(['farmacia'], 'emergencia.triagem')).toBe(false);
    expect(pode(['enfermagem'], 'emergencia.triagem')).toBe(true);
    expect(pode(['enfermagem'], 'pacientes.verCpf')).toBe(false);
    expect(pode(['administrador'], 'usuarios.administrar')).toBe(true);
    expect(pode(['gestao'], 'usuarios.administrar')).toBe(false);
    // Vários perfis: vale a soma.
    expect(pode(['recepcao', 'farmacia'], 'farmacia.dispensacao')).toBe(true);
    expect(pode([], 'ver')).toBe(false);
  });

  it('MFA só para Administrador e Gestão (R-AU2)', () => {
    expect(exigeMfa(['administrador'])).toBe(true);
    expect(exigeMfa(['recepcao', 'gestao'])).toBe(true);
    expect(exigeMfa(['medico', 'nir'])).toBe(false);
    expect(ehPerfil('nir')).toBe(true);
    expect(ehPerfil('root')).toBe(false);
    expect(ehPerfil(1)).toBe(false);
  });
});

describe('autor das ações (D31)', () => {
  afterEach(() => definirFonteDoAutor(() => undefined));

  it('sem login: o autor de demonstração, sem id', () => {
    expect(autorAtual()).toBe('Usuário de demonstração');
    expect(autorIdAtual()).toBeUndefined();
    expect(autoria()).toEqual({ autor: 'Usuário de demonstração' });
  });

  it('com login: o nome e o id do usuário', () => {
    definirFonteDoAutor(() => ({ usuarioId: 'u1', nome: 'Rita' }));
    expect(autorDaAcao()).toEqual({ usuarioId: 'u1', nome: 'Rita' });
    expect(autoria()).toEqual({ autor: 'Rita', autorId: 'u1' });
  });
});

describe('contrato do acesso', () => {
  it('valida a sessão e a entrada de usuário', () => {
    expect(
      respostaSessao.parse({
        etapa: 'mfa',
        csrf: 'x',
        expiraEm: '2026-11-16T12:00:00.000Z',
        usuario: { id: 'u', nome: 'A', email: 'a@b.c', perfis: ['gestao'], demonstracao: false },
      }).etapa,
    ).toBe('mfa');
    expect(entradaUsuario.safeParse({ nome: 'Ab', email: 'x', perfis: ['nir'] }).success).toBe(
      false,
    );
    expect(
      entradaUsuario.safeParse({ nome: 'Ana Lima', email: 'a@b.com', perfis: ['dono'] }).success,
    ).toBe(false);
  });
});

describe('cliente do acesso', () => {
  function cliente(respostas: RespostaApi[]) {
    const pedidos: RequisicaoApi[] = [];
    const c = criarClienteAcesso(async (r) => {
      pedidos.push(r);
      return respostas.shift() ?? { status: 200, corpo: {} };
    });
    return { c, pedidos };
  }

  it('sessão: 401 vira null; sem rede, ErroRede', async () => {
    const { c } = cliente([
      { status: 401, corpo: { codigo: 'sessao' } },
      { status: 0, corpo: null },
    ]);
    expect(await c.sessao()).toBeNull();
    await expect(c.sessao()).rejects.toBeInstanceOf(ErroRede);
    const ok = cliente([{ status: 200, corpo: { etapa: 'ativa' } }]);
    expect(await ok.c.sessao()).toEqual({ etapa: 'ativa' });
  });

  it('cada função chama a rota certa; erro do servidor vira a classe do contrato', async () => {
    const { c, pedidos } = cliente([]);
    await c.opcoes();
    await c.entrar('a@b.c', 's');
    await c.entrarDemonstracao('nir');
    await c.confirmarMfa('123456');
    await c.configurarMfa();
    await c.concluirMfa('123456');
    await c.conferirConvite('t');
    await c.aceitarConvite('t', 's');
    await c.esqueciSenha('a@b.c');
    await c.redefinirSenha('t', 's');
    await c.sair();
    await c.listarUsuarios();
    await c.obterUsuario('u/1');
    await c.convidarUsuario({ nome: 'Ana', email: 'a@b.c', perfis: ['nir'] });
    await c.editarUsuario('u1', { nome: 'Ana', email: 'a@b.c', perfis: ['nir'] }, 2);
    await c.desativarUsuario('u1');
    await c.reativarUsuario('u1');
    await c.desbloquearUsuario('u1');
    await c.redefinirMfaUsuario('u1');
    await c.novoLinkUsuario('u1');
    expect(pedidos.map((p) => `${p.metodo} ${p.caminho}`)).toEqual([
      'GET /auth/opcoes',
      'POST /auth/entrar',
      'POST /auth/demonstracao',
      'POST /auth/mfa',
      'POST /auth/mfa/configurar',
      'POST /auth/mfa/confirmar',
      'POST /auth/convite/conferir',
      'POST /auth/convite',
      'POST /auth/esqueci',
      'POST /auth/redefinir',
      'POST /auth/sair',
      'GET /usuarios',
      'GET /usuarios/u%2F1',
      'POST /usuarios',
      'PUT /usuarios/u1',
      'POST /usuarios/u1/desativar',
      'POST /usuarios/u1/reativar',
      'POST /usuarios/u1/desbloquear',
      'POST /usuarios/u1/redefinir-mfa',
      'POST /usuarios/u1/link',
    ]);
    expect(pedidos[14]!.versao).toBe(2);
    const falha = cliente([
      { status: 409, corpo: { codigo: 'ultimo_administrador', mensagem: 'x' } },
    ]);
    await expect(falha.c.desativarUsuario('u1')).rejects.toBeInstanceOf(ErroConflito);
  });
});
