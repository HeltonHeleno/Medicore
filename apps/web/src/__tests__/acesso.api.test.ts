/**
 * Fase 28 (BL-02) — O acesso no modo API (`services/api/acesso.ts`) e o transporte: cookie,
 * código de segurança nas gravações, sessão guardada e o aviso de sessão terminada (E-19).
 * E o modo navegador (`services/acesso.ts`), que não tem login.
 */
import { ErroConflito, ErroSessao } from '@medicore/dominio/erros';
import * as local from '../services/acesso';
import * as api from '../services/api/acesso';
import { aoTerminarSessao, criarTransporte, definirCodigoSeguranca } from '../services/api/rede';

const sessao = (etapa: 'ativa' | 'mfa' = 'ativa', csrf = 'codigo-1') => ({
  etapa,
  csrf,
  expiraEm: '2026-11-16T12:30:00.000Z',
  usuario: {
    id: 'u1',
    nome: 'Rita',
    email: 'rita@h.com',
    perfis: ['recepcao'],
    demonstracao: false,
  },
});
const json = (status: number, corpo?: unknown) =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), { status });

let respostas: Response[];
let chamadas: [string, RequestInit][];
beforeEach(() => {
  respostas = [];
  chamadas = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      chamadas.push([url, init]);
      return respostas.shift() ?? json(204);
    }),
  );
});
afterEach(async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => json(204)),
  );
  await api.sair().catch(() => {});
  vi.unstubAllGlobals();
});

describe('sessão no modo API', () => {
  it('entrar guarda a sessão e o código; a gravação seguinte leva o código', async () => {
    const ouvinte = vi.fn();
    const parar = api.assinarSessao(ouvinte);
    respostas.push(json(200, sessao()));
    await api.entrar('rita@h.com', 'senha');
    expect(api.sessaoAtual()?.usuario.nome).toBe('Rita');
    expect(ouvinte).toHaveBeenCalled();
    respostas.push(json(201, { usuario: {}, tipo: 'convite' }));
    await api.convidarUsuario({ nome: 'Ana', email: 'a@h.com', perfis: ['nir'] });
    const [url, init] = chamadas.at(-1)!;
    expect(url).toBe('/api/v1/usuarios');
    expect(init.headers).toHaveProperty('X-CSRF-Token', 'codigo-1');
    parar();
  });

  it('carregar sem sessão devolve null; erro de senha vira ErroConflito', async () => {
    respostas.push(json(401, { codigo: 'sessao' }));
    expect(await api.carregarSessao()).toBeNull();
    respostas.push(
      json(409, { codigo: 'codigo_incorreto', mensagem: 'E-mail ou senha incorretos.' }),
    );
    await expect(api.entrar('x', 'y')).rejects.toBeInstanceOf(ErroConflito);
    respostas.push(json(500, { codigo: 'interno' }));
    await expect(api.carregarSessao()).rejects.toBeInstanceOf(Error);
  });

  it('401 com a tela aberta marca a sessão como terminada; entrar de novo desmarca', async () => {
    respostas.push(json(200, sessao()));
    await api.carregarSessao();
    respostas.push(json(401, { codigo: 'sessao' }));
    await expect(api.listarUsuarios()).rejects.toBeInstanceOf(ErroSessao);
    expect(api.sessaoTerminou()).toBe(true);
    respostas.push(json(200, sessao('ativa', 'codigo-2')));
    await api.entrarDemonstracao('todos');
    expect(api.sessaoTerminou()).toBe(false);
  });

  it('MFA: a etapa, a configuração e os códigos de recuperação', async () => {
    respostas.push(json(200, sessao('mfa')));
    expect((await api.entrar('a', 'b')).etapa).toBe('mfa');
    respostas.push(json(200, { segredo: 'ABC', qrSvg: '<svg/>' }));
    expect(await api.configurarMfa()).toEqual({ segredo: 'ABC', qrSvg: '<svg/>' });
    respostas.push(json(200, { ...sessao(), codigosRecuperacao: ['AAAA-BBBB'] }));
    const r = await api.concluirMfa('123456');
    expect(r.codigosRecuperacao).toEqual(['AAAA-BBBB']);
    expect(api.sessaoAtual()).not.toHaveProperty('codigosRecuperacao');
    respostas.push(json(200, sessao()));
    await api.confirmarMfa('123456');
    expect(api.sessaoAtual()?.etapa).toBe('ativa');
  });

  it('convite, esqueci, redefinir, opções e a administração chamam as rotas certas', async () => {
    respostas.push(json(200, { nome: 'Ana', email: 'a@h.com' }));
    await api.conferirConvite('t'.repeat(30));
    respostas.push(json(200, sessao()));
    await api.aceitarConvite('t'.repeat(30), 'senha longa demais');
    respostas.push(json(202, {}));
    await api.esqueciSenha('a@h.com');
    respostas.push(json(204));
    await api.redefinirSenha('t'.repeat(30), 'senha longa demais');
    respostas.push(json(200, { demonstracao: true, email: false }));
    await api.opcoesAcesso();
    for (const fn of [
      () => api.listarUsuarios(),
      () => api.obterUsuario('u 1'),
      () => api.editarUsuario('u1', { nome: 'A', email: 'a@h.com', perfis: ['nir'] }, 3),
      () => api.desativarUsuario('u1'),
      () => api.reativarUsuario('u1'),
      () => api.desbloquearUsuario('u1'),
      () => api.redefinirMfaUsuario('u1'),
      () => api.novoLinkUsuario('u1'),
    ]) {
      respostas.push(json(200, {}));
      await fn();
    }
    const caminhos = chamadas.map(([u, i]) => `${i.method} ${u}`);
    expect(caminhos).toEqual([
      'POST /api/v1/auth/convite/conferir',
      'POST /api/v1/auth/convite',
      'POST /api/v1/auth/esqueci',
      'POST /api/v1/auth/redefinir',
      'GET /api/v1/auth/opcoes',
      'GET /api/v1/usuarios',
      'GET /api/v1/usuarios/u%201',
      'PUT /api/v1/usuarios/u1',
      'POST /api/v1/usuarios/u1/desativar',
      'POST /api/v1/usuarios/u1/reativar',
      'POST /api/v1/usuarios/u1/desbloquear',
      'POST /api/v1/usuarios/u1/redefinir-mfa',
      'POST /api/v1/usuarios/u1/link',
    ]);
    expect(chamadas[7]![1].headers).toHaveProperty('If-Match', '"v3"');
  });

  it('sair limpa a sessão mesmo se a rede falhar', async () => {
    respostas.push(json(200, sessao()));
    await api.entrar('a', 'b');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('rede'))),
    );
    await expect(api.sair()).rejects.toThrow();
    expect(api.sessaoAtual()).toBeNull();
  });
});

describe('modo navegador: sem login', () => {
  it('nenhuma sessão, nada a assinar, e as ações de acesso não existem', async () => {
    expect(local.COM_LOGIN).toBe(false);
    expect(local.sessaoAtual()).toBeNull();
    expect(local.sessaoTerminou()).toBe(false);
    local.assinarSessao(() => {})();
    local.usarSessao(null);
    expect(await local.carregarSessao()).toBeNull();
    expect(await local.opcoesAcesso()).toEqual({ demonstracao: false, email: false });
    await local.sair();
    for (const fn of [
      () => local.entrar('a', 'b'),
      () => local.entrarDemonstracao('todos'),
      () => local.confirmarMfa('1'),
      () => local.configurarMfa(),
      () => local.concluirMfa('1'),
      () => local.conferirConvite('t'),
      () => local.aceitarConvite('t', 's'),
      () => local.esqueciSenha('e'),
      () => local.redefinirSenha('t', 's'),
      () => local.listarUsuarios(),
      () => local.obterUsuario('u'),
      () => local.convidarUsuario({ nome: '', email: '', perfis: [] }),
      () => local.editarUsuario('u', { nome: '', email: '', perfis: [] }, 1),
      () => local.desativarUsuario('u'),
      () => local.reativarUsuario('u'),
      () => local.desbloquearUsuario('u'),
      () => local.redefinirMfaUsuario('u'),
      () => local.novoLinkUsuario('u'),
    ]) {
      await expect(fn()).rejects.toThrow(/Sem login/);
    }
  });
});

// Por último: troca quem recebe o aviso de sessão terminada (o do modo API fica de fora).
describe('transporte (R-AU4, E-19)', () => {
  it('leva o cookie, o código de segurança só nas gravações e avisa o 401 fora de /auth', async () => {
    const buscar = vi.fn(async () => json(401, { codigo: 'sessao' }));
    const enviar = criarTransporte('https://x/api/v1', buscar);
    const perdida = vi.fn();
    aoTerminarSessao(perdida);
    definirCodigoSeguranca('abc');
    await enviar({ metodo: 'GET', caminho: '/pacientes' });
    await enviar({ metodo: 'POST', caminho: '/pacientes', corpo: {} });
    const [, get] = buscar.mock.calls[0] as unknown as [string, RequestInit];
    const [, post] = buscar.mock.calls[1] as unknown as [string, RequestInit];
    expect(get.credentials).toBe('include');
    expect(get.headers).not.toHaveProperty('X-CSRF-Token');
    expect(post.headers).toHaveProperty('X-CSRF-Token', 'abc');
    expect(perdida).toHaveBeenCalledTimes(2);
    await enviar({ metodo: 'POST', caminho: '/auth/entrar', corpo: {} });
    expect(perdida).toHaveBeenCalledTimes(2);
    definirCodigoSeguranca(null);
  });
});
