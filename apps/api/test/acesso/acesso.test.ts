/**
 * Fase 28 (28.T.2) — Acesso: senha (Argon2id), bloqueio progressivo, MFA, convite, senha nova,
 * expiração da sessão, código de segurança, administração de usuários e o que nunca vai para o log.
 */
import { agora } from '@medicore/dominio/utils/relogio';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { enviadorEmMemoria, enviadorResend, ErroEnvioEmail } from '../../src/acesso/email';
import { lerCookie } from '../../src/acesso/guarda';
import { codigoTotp, PASSO_TOTP_S, problemaDaSenha } from '../../src/acesso/segredos';
import * as servico from '../../src/acesso/servico';
import { sessoes, usuarios } from '../../src/banco/esquema';
import { semear } from '../../src/banco/semear';
import { lerConfig, demonstracaoLigada } from '../../src/config';
import { criarServidor } from '../../src/servidor';
import { criarBancoDeTeste, type BancoDeTeste } from '../apoio/banco';
import { cookieDe, entrarComo, type Credenciais } from '../apoio/sessao';

const SENHA = 'cavalo bateria grampo correto';
const INICIO = '2026-11-16T12:00:00.000Z';

let b: BancoDeTeste;
let app: FastifyInstance;
const log: string[] = [];
const caixa = enviadorEmMemoria();

beforeAll(async () => {
  b = await criarBancoDeTeste();
  app = await criarServidor({
    config: { AMBIENTE: 'teste', LOG_NIVEL: 'info', DOCS: false, APP_URL: 'https://app.teste' },
    banco: b.app,
    registrarErro: () => 'evento',
    enviador: caixa,
    destinoLog: { write: (linha: string) => void log.push(linha) },
  });
  await app.ready();
});
afterAll(async () => {
  await app.close();
  await b.encerrar();
});
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(INICIO));
  await b.limpar();
  await semear(b.dono);
  caixa.caixa.length = 0;
});
afterEach(() => vi.useRealTimers());

const avancar = (ms: number) => vi.setSystemTime(new Date(agora().getTime() + ms));

/** Pedido com (ou sem) credenciais; o cabeçalho `cookie` sempre vai (mesmo vazio). */
function pedir(
  metodo: 'GET' | 'POST' | 'PUT',
  url: string,
  extra: { c?: Partial<Credenciais>; payload?: unknown; headers?: Record<string, string> } = {},
) {
  return app.inject({
    method: metodo,
    url: `/api/v1${url}`,
    payload: extra.payload as InjectOptions['payload'],
    headers: {
      cookie: extra.c?.cookie ?? '',
      ...(extra.c?.csrf ? { 'x-csrf-token': extra.c.csrf } : {}),
      ...extra.headers,
    },
  });
}

const credenciais = (r: LightMyRequestResponse): Credenciais => ({
  cookie: cookieDe(r),
  csrf: r.json().csrf,
});

/** O link (só o token) da última mensagem da caixa. */
const tokenDaCaixa = () => /#(.+)$/m.exec(caixa.caixa.at(-1)!.texto)![1]!;

/** Administrador já com senha e MFA; devolve as credenciais da sessão e o segredo do TOTP. */
async function administradorPronto(email = 'ana@hospital.com') {
  const { token, usuario } = await servico.convidar(b.app, {
    nome: 'Ana Administradora',
    email,
    perfis: ['administrador'],
  });
  const aceito = await pedir('POST', '/auth/convite', { payload: { token, senha: SENHA } });
  expect(aceito.json().etapa).toBe('configurar_mfa');
  const c = credenciais(aceito);
  const conf = await pedir('POST', '/auth/mfa/configurar', { c });
  const segredo = conf.json().segredo as string;
  const passo = Math.floor(agora().getTime() / 1000 / PASSO_TOTP_S);
  const confirmado = await pedir('POST', '/auth/mfa/confirmar', {
    c,
    payload: { codigo: codigoTotp(segredo, passo) },
  });
  expect(confirmado.statusCode).toBe(200);
  return {
    c: credenciais(confirmado),
    segredo,
    usuario,
    recuperacao: confirmado.json().codigosRecuperacao as string[],
  };
}

async function convidadoComSenha(perfis: string[], email = 'rita@hospital.com') {
  const { token, usuario } = await servico.convidar(b.app, {
    nome: 'Rita Recepcionista',
    email,
    perfis: perfis as never,
  });
  const r = await pedir('POST', '/auth/convite', { payload: { token, senha: SENHA } });
  expect(r.statusCode).toBe(200);
  return { c: credenciais(r), usuario };
}

describe('entrar (BL-02.1)', () => {
  it('sem sessão, as rotas respondem 401 (E-19); saúde e documentação continuam públicas', async () => {
    expect((await pedir('GET', '/pacientes')).statusCode).toBe(401);
    expect((await pedir('GET', '/pacientes')).json()).toEqual({ codigo: 'sessao' });
    expect((await pedir('GET', '/saude')).statusCode).toBe(200);
    expect((await pedir('GET', '/auth/sessao')).statusCode).toBe(401);
  });

  it('e-mail e senha certos: cookie HttpOnly/Secure/SameSite, sessão ativa e acesso às rotas', async () => {
    await convidadoComSenha(['recepcao']);
    const r = await pedir('POST', '/auth/entrar', {
      payload: { email: ' RITA@hospital.com ', senha: SENHA },
    });
    expect(r.statusCode).toBe(200);
    const setCookie = String(r.headers['set-cookie']);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/Secure/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    expect(setCookie).toMatch(/Path=\/api/);
    expect(r.json()).toMatchObject({ etapa: 'ativa', usuario: { perfis: ['recepcao'] } });
    expect(r.headers['cache-control']).toBe('no-store');
    const c = credenciais(r);
    expect((await pedir('GET', '/pacientes', { c })).statusCode).toBe(200);
    const sessao = await pedir('GET', '/auth/sessao', { c });
    expect(sessao.json().usuario.email).toBe('rita@hospital.com');
    // O banco guarda o hash do token, nunca o token.
    const token = lerCookie(c.cookie, 'medicore_sessao')!;
    const linhas = await b.dono.select().from(sessoes);
    expect(linhas.some((l) => l.id === token)).toBe(false);
  });

  it('mensagem única para e-mail ou senha errados; conta desativada tem a própria', async () => {
    const { usuario } = await convidadoComSenha(['recepcao']);
    const errada = await pedir('POST', '/auth/entrar', {
      payload: { email: 'rita@hospital.com', senha: 'errada' },
    });
    const inexistente = await pedir('POST', '/auth/entrar', {
      payload: { email: 'ninguem@hospital.com', senha: 'errada' },
    });
    expect(errada.statusCode).toBe(409);
    expect(errada.json().mensagem).toBe('E-mail ou senha incorretos.');
    expect(inexistente.json()).toEqual(errada.json());
    await b.dono.update(usuarios).set({ ativo: false }).where(eq(usuarios.id, usuario.id));
    const desativada = await pedir('POST', '/auth/entrar', {
      payload: { email: 'rita@hospital.com', senha: SENHA },
    });
    expect(desativada.json()).toMatchObject({ codigo: 'conta_desativada' });
  });

  it('R-AU3: 5 erros bloqueiam 15 min, 10 erros 1 h (429 E-21), exista a conta ou não', async () => {
    await convidadoComSenha(['recepcao']);
    const tentar = (senha: string, email = 'rita@hospital.com') =>
      pedir('POST', '/auth/entrar', { payload: { email, senha } });
    for (let i = 0; i < 4; i++) expect((await tentar('errada')).statusCode).toBe(409);
    const quinta = await tentar('errada');
    expect(quinta.statusCode).toBe(429);
    expect(quinta.json()).toEqual({ codigo: 'limite', aguardarSegundos: 900 });
    // Bloqueado: nem a senha certa entra.
    expect((await tentar(SENHA)).statusCode).toBe(429);
    avancar(15 * 60_000);
    for (let i = 0; i < 4; i++) expect((await tentar('errada')).statusCode).toBe(409);
    const decima = await tentar('errada');
    expect(decima.json()).toEqual({ codigo: 'limite', aguardarSegundos: 3600 });
    avancar(60 * 60_000);
    expect((await tentar(SENHA)).statusCode).toBe(200);
    // Depois de entrar, a contagem zera.
    expect((await tentar('errada')).statusCode).toBe(409);
    // E-mail sem conta também bloqueia (não revela quem existe).
    for (let i = 0; i < 4; i++) await tentar('x', 'nao@existe.com');
    expect((await tentar('x', 'nao@existe.com')).statusCode).toBe(429);
  });

  it('o administrador desbloqueia', async () => {
    const { c } = await administradorPronto();
    const { usuario } = await convidadoComSenha(['recepcao']);
    for (let i = 0; i < 5; i++) {
      await pedir('POST', '/auth/entrar', { payload: { email: 'rita@hospital.com', senha: 'x' } });
    }
    const lista = await pedir('GET', '/usuarios', { c });
    expect(
      lista.json().find((u: { id: string }) => u.id === usuario.id).bloqueadoAte,
    ).toBeDefined();
    await pedir('POST', `/usuarios/${usuario.id}/desbloquear`, { c });
    const r = await pedir('POST', '/auth/entrar', {
      payload: { email: 'rita@hospital.com', senha: SENHA },
    });
    expect(r.statusCode).toBe(200);
  });
});

describe('segundo fator (BL-02.2, R-AU2)', () => {
  it('Administrador: a senha leva à etapa do código; só o código abre a sessão', async () => {
    const { segredo } = await administradorPronto();
    const r = await pedir('POST', '/auth/entrar', {
      payload: { email: 'ana@hospital.com', senha: SENHA },
    });
    expect(r.json().etapa).toBe('mfa');
    const c = credenciais(r);
    // Na etapa do MFA, nada além das rotas de acesso.
    expect((await pedir('GET', '/pacientes', { c })).statusCode).toBe(401);
    // Sem o código de segurança: 403.
    expect(
      (await pedir('POST', '/auth/mfa', { c: { cookie: c.cookie }, payload: { codigo: '000000' } }))
        .statusCode,
    ).toBe(403);
    const errado = await pedir('POST', '/auth/mfa', { c, payload: { codigo: '000000' } });
    expect(errado.json()).toMatchObject({ codigo: 'codigo_incorreto', campo: 'codigo' });
    const passo = Math.floor(agora().getTime() / 1000 / PASSO_TOTP_S);
    const certo = await pedir('POST', '/auth/mfa', {
      c,
      payload: { codigo: codigoTotp(segredo, passo) },
    });
    expect(certo.json().etapa).toBe('ativa');
    expect((await pedir('GET', '/pacientes', { c: credenciais(certo) })).statusCode).toBe(200);
    // A sessão da etapa MFA foi trocada: o cookie antigo não vale mais.
    expect(
      (await pedir('POST', '/auth/mfa', { c, payload: { codigo: '000000' } })).statusCode,
    ).toBe(401);
  });

  it('código de recuperação entra uma vez só', async () => {
    const { recuperacao } = await administradorPronto();
    expect(recuperacao).toHaveLength(10);
    const entrar = async () =>
      credenciais(
        await pedir('POST', '/auth/entrar', {
          payload: { email: 'ana@hospital.com', senha: SENHA },
        }),
      );
    const c1 = await entrar();
    const r1 = await pedir('POST', '/auth/mfa', {
      c: c1,
      payload: { codigo: recuperacao[0]!.toLowerCase() },
    });
    expect(r1.json().etapa).toBe('ativa');
    const c2 = await entrar();
    const r2 = await pedir('POST', '/auth/mfa', { c: c2, payload: { codigo: recuperacao[0] } });
    expect(r2.statusCode).toBe(409);
  });

  it('a etapa do código dura 5 min', async () => {
    await administradorPronto();
    const r = await pedir('POST', '/auth/entrar', {
      payload: { email: 'ana@hospital.com', senha: SENHA },
    });
    avancar(5 * 60_000);
    expect(
      (await pedir('POST', '/auth/mfa', { c: credenciais(r), payload: { codigo: '123456' } }))
        .statusCode,
    ).toBe(401);
  });

  it('o administrador redefine o MFA: a pessoa configura de novo', async () => {
    const { c } = await administradorPronto();
    const outro = await administradorPronto('beto@hospital.com');
    await pedir('POST', `/usuarios/${outro.usuario.id}/redefinir-mfa`, { c });
    // As sessões do outro terminaram.
    expect((await pedir('GET', '/pacientes', { c: outro.c })).statusCode).toBe(401);
    const r = await pedir('POST', '/auth/entrar', {
      payload: { email: 'beto@hospital.com', senha: SENHA },
    });
    expect(r.json().etapa).toBe('configurar_mfa');
  });

  it('perfil sem MFA (Recepção) entra direto', async () => {
    await convidadoComSenha(['recepcao']);
    const r = await pedir('POST', '/auth/entrar', {
      payload: { email: 'rita@hospital.com', senha: SENHA },
    });
    expect(r.json().etapa).toBe('ativa');
  });
});

describe('sessão (BL-02.4)', () => {
  it('termina com 30 min sem uso; o uso renova', async () => {
    const { c } = await convidadoComSenha(['recepcao']);
    avancar(29 * 60_000);
    expect((await pedir('GET', '/pacientes', { c })).statusCode).toBe(200);
    avancar(29 * 60_000);
    expect((await pedir('GET', '/pacientes', { c })).statusCode).toBe(200);
    avancar(30 * 60_000);
    expect((await pedir('GET', '/pacientes', { c })).statusCode).toBe(401);
  });

  it('termina 12 h depois de entrar, mesmo em uso', async () => {
    const { c } = await convidadoComSenha(['recepcao']);
    for (let i = 0; i < 25; i++) {
      avancar(29 * 60_000);
      await pedir('GET', '/pacientes', { c });
    }
    expect((await pedir('GET', '/pacientes', { c })).statusCode).toBe(401);
  });

  it('gravação sem o código de segurança: 403; com ele, passa', async () => {
    const { c } = await convidadoComSenha(['recepcao']);
    const sem = await pedir('POST', '/pacientes', { c: { cookie: c.cookie }, payload: {} });
    expect(sem.statusCode).toBe(403);
    expect(sem.json().acao).toMatch(/código de segurança/);
    const outro = await pedir('POST', '/pacientes', {
      c: { cookie: c.cookie, csrf: 'x'.repeat(43) },
      payload: {},
    });
    expect(outro.statusCode).toBe(403);
    const com = await pedir('POST', '/pacientes', { c, payload: {} });
    expect(com.statusCode).toBe(422);
  });

  it('sair encerra a sessão e apaga o cookie', async () => {
    const { c } = await convidadoComSenha(['recepcao']);
    const r = await pedir('POST', '/auth/sair', { c });
    expect(r.statusCode).toBe(204);
    expect(String(r.headers['set-cookie'])).toMatch(/Max-Age=0/);
    expect((await pedir('GET', '/pacientes', { c })).statusCode).toBe(401);
  });

  it('conta desativada perde as sessões abertas', async () => {
    const { c: admin } = await administradorPronto();
    const { c, usuario } = await convidadoComSenha(['recepcao']);
    await pedir('POST', `/usuarios/${usuario.id}/desativar`, { c: admin });
    expect((await pedir('GET', '/pacientes', { c })).statusCode).toBe(401);
  });
});

describe('convite e senha (BL-02.2, BL-02.3)', () => {
  it('convite: e-mail com o link (token depois do #), 48 h, uso único, senha forte', async () => {
    const { c } = await administradorPronto();
    const r = await pedir('POST', '/usuarios', {
      c,
      payload: { nome: 'Rita Recepcionista', email: 'rita@hospital.com', perfis: ['recepcao'] },
    });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ tipo: 'convite', enviadoPara: 'rita@hospital.com' });
    expect(r.json().link).toBeUndefined();
    expect(caixa.caixa.at(-1)!.texto).toMatch(/https:\/\/app\.teste\/primeiro-acesso#/);
    const token = tokenDaCaixa();
    expect((await pedir('POST', '/auth/convite/conferir', { payload: { token } })).json()).toEqual({
      nome: 'Rita Recepcionista',
      email: 'rita@hospital.com',
    });
    const curta = await pedir('POST', '/auth/convite', { payload: { token, senha: 'curta' } });
    expect(curta.json()).toEqual({
      codigo: 'validacao',
      campos: { senha: expect.stringMatching(/12 caracteres/) },
    });
    const comum = await pedir('POST', '/auth/convite', {
      payload: { token, senha: 'senha12345678' },
    });
    expect(comum.json().campos.senha).toMatch(/conhecida/);
    expect(
      (await pedir('POST', '/auth/convite', { payload: { token, senha: SENHA } })).statusCode,
    ).toBe(200);
    expect(
      (await pedir('POST', '/auth/convite', { payload: { token, senha: SENHA } })).statusCode,
    ).toBe(404);
  });

  it('convite vence em 48 h; um novo link invalida o anterior', async () => {
    const { token, usuario } = await servico.convidar(b.app, {
      nome: 'Rita Recepcionista',
      email: 'rita@hospital.com',
      perfis: ['recepcao'],
    });
    avancar(48 * 3600_000);
    expect((await pedir('POST', '/auth/convite/conferir', { payload: { token } })).statusCode).toBe(
      404,
    );
    const novo = await servico.novoLinkDoUsuario(b.app, usuario.id);
    expect(novo.tipo).toBe('convite');
    const outro = await servico.novoLinkDoUsuario(b.app, usuario.id);
    expect(
      (await pedir('POST', '/auth/convite/conferir', { payload: { token: novo.token } }))
        .statusCode,
    ).toBe(404);
    expect(
      (await pedir('POST', '/auth/convite/conferir', { payload: { token: outro.token } }))
        .statusCode,
    ).toBe(200);
  });

  it('esqueci a senha: mesma resposta exista a conta ou não; o link (30 min) encerra as sessões', async () => {
    const { c } = await convidadoComSenha(['recepcao']);
    const existe = await pedir('POST', '/auth/esqueci', {
      payload: { email: 'rita@hospital.com' },
    });
    const naoExiste = await pedir('POST', '/auth/esqueci', {
      payload: { email: 'x@hospital.com' },
    });
    expect(existe.statusCode).toBe(202);
    expect(naoExiste.statusCode).toBe(202);
    expect(existe.body).toBe(naoExiste.body);
    expect(caixa.caixa).toHaveLength(1);
    expect(caixa.caixa[0]!.texto).toMatch(/redefinir-senha#/);
    const token = tokenDaCaixa();
    const nova = 'outra frase bem comprida agora';
    expect(
      (await pedir('POST', '/auth/redefinir', { payload: { token, senha: nova } })).statusCode,
    ).toBe(204);
    expect((await pedir('GET', '/pacientes', { c })).statusCode).toBe(401);
    expect(
      (
        await pedir('POST', '/auth/entrar', {
          payload: { email: 'rita@hospital.com', senha: SENHA },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await pedir('POST', '/auth/entrar', {
          payload: { email: 'rita@hospital.com', senha: nova },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await pedir('POST', '/auth/redefinir', { payload: { token, senha: nova } })).statusCode,
    ).toBe(404);
  });

  it('o link de senha nova vence em 30 min', async () => {
    await convidadoComSenha(['recepcao']);
    await pedir('POST', '/auth/esqueci', { payload: { email: 'rita@hospital.com' } });
    avancar(30 * 60_000);
    const r = await pedir('POST', '/auth/redefinir', {
      payload: { token: tokenDaCaixa(), senha: 'outra frase bem comprida agora' },
    });
    expect(r.statusCode).toBe(404);
  });
});

describe('administrar usuários (BL-02.5)', () => {
  it('só o Administrador; a Recepção recebe 403 com a ação', async () => {
    const { c } = await convidadoComSenha(['recepcao']);
    const r = await pedir('GET', '/usuarios', { c });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toEqual({ codigo: 'permissao', acao: 'administrar usuários' });
  });

  it('e-mail duplicado, perfil obrigatório, médico obrigatório e válido', async () => {
    const { c } = await administradorPronto();
    const convidar = (payload: object) => pedir('POST', '/usuarios', { c, payload });
    expect(
      (await convidar({ nome: 'Outra Ana', email: 'ANA@hospital.com', perfis: ['nir'] })).json(),
    ).toMatchObject({
      codigo: 'usuario_duplicado',
    });
    expect(
      (await convidar({ nome: 'Sem Perfil', email: 'a@b.com', perfis: [] })).json().campos.perfis,
    ).toBeDefined();
    expect(
      (await convidar({ nome: 'Doutor Sem', email: 'a@b.com', perfis: ['medico'] })).json().campos
        .medicoId,
    ).toBeDefined();
    expect(
      (
        await convidar({
          nome: 'Doutor Errado',
          email: 'a@b.com',
          perfis: ['medico'],
          medicoId: 'nao-existe',
        })
      ).json().campos.medicoId,
    ).toBeDefined();
    const ok = await convidar({
      nome: 'Helena Duarte',
      email: 'helena@hospital.com',
      perfis: ['medico'],
      medicoId: 'med-helena-duarte',
    });
    expect(ok.json().usuario).toMatchObject({
      medicoId: 'med-helena-duarte',
      convidado: true,
      ativo: true,
    });
  });

  it('editar perfis encerra as sessões da pessoa; versão obrigatória', async () => {
    const { c } = await administradorPronto();
    const rita = await convidadoComSenha(['recepcao']);
    const atual = (await pedir('GET', `/usuarios/${rita.usuario.id}`, { c })).json();
    const corpo = { nome: atual.nome, email: atual.email, perfis: ['recepcao', 'enfermagem'] };
    expect(
      (await pedir('PUT', `/usuarios/${rita.usuario.id}`, { c, payload: corpo })).statusCode,
    ).toBe(428);
    const r = await pedir('PUT', `/usuarios/${rita.usuario.id}`, {
      c,
      payload: corpo,
      headers: { 'if-match': `"v${atual.versao}"` },
    });
    expect(r.json().perfis).toEqual(['enfermagem', 'recepcao']);
    expect((await pedir('GET', '/pacientes', { c: rita.c })).statusCode).toBe(401);
  });

  it('E-17: o último administrador não sai (nem desativado, nem sem o perfil)', async () => {
    const { c, usuario } = await administradorPronto();
    const des = await pedir('POST', `/usuarios/${usuario.id}/desativar`, { c });
    expect(des.json()).toMatchObject({ codigo: 'ultimo_administrador' });
    const atual = (await pedir('GET', `/usuarios/${usuario.id}`, { c })).json();
    const tirar = await pedir('PUT', `/usuarios/${usuario.id}`, {
      c,
      payload: { nome: atual.nome, email: atual.email, perfis: ['gestao'] },
      headers: { 'if-match': `"v${atual.versao}"` },
    });
    expect(tirar.json()).toMatchObject({ codigo: 'ultimo_administrador' });
    // Com outro administrador, pode.
    await administradorPronto('beto@hospital.com');
    expect((await pedir('POST', `/usuarios/${usuario.id}/desativar`, { c })).statusCode).toBe(200);
  });

  it('reativar; link de senha nova para quem já tem senha; contas de demonstração fora da lista', async () => {
    const { c } = await administradorPronto();
    const rita = await convidadoComSenha(['recepcao']);
    await entrarComo(app.inject.bind(app) as never, 'farmacia');
    await pedir('POST', `/usuarios/${rita.usuario.id}/desativar`, { c });
    const r = await pedir('POST', `/usuarios/${rita.usuario.id}/reativar`, { c });
    expect(r.json().ativo).toBe(true);
    const link = await pedir('POST', `/usuarios/${rita.usuario.id}/link`, { c });
    expect(link.json()).toMatchObject({ tipo: 'redefinicao', enviadoPara: 'rita@hospital.com' });
    const lista = (await pedir('GET', '/usuarios', { c })).json() as { email: string }[];
    expect(lista.map((u) => u.email)).toEqual(['ana@hospital.com', 'rita@hospital.com']);
    expect((await pedir('GET', '/usuarios/usu-demo-farmacia', { c })).statusCode).toBe(404);
  });
});

describe('sem e-mail configurado', () => {
  it('o link volta para o administrador; "esqueci" não envia nada', async () => {
    const api = await criarServidor({
      config: { AMBIENTE: 'teste', LOG_NIVEL: 'silent', DOCS: false },
      banco: b.app,
      registrarErro: () => 'x',
    });
    await api.ready();
    try {
      const { c } = await administradorPronto();
      const r = await api.inject({
        method: 'POST',
        url: '/api/v1/usuarios',
        payload: { nome: 'Rita Recepcionista', email: 'rita@hospital.com', perfis: ['recepcao'] },
        headers: { cookie: c.cookie, 'x-csrf-token': c.csrf },
      });
      expect(r.json().link).toMatch(/^http:\/\/localhost:5173\/primeiro-acesso#/);
      expect((await api.inject({ url: '/api/v1/auth/opcoes' })).json()).toEqual({
        demonstracao: true,
        email: false,
      });
    } finally {
      await api.close();
    }
  });

  it('falha do provedor: o link volta para o administrador', async () => {
    const api = await criarServidor({
      config: { AMBIENTE: 'teste', LOG_NIVEL: 'silent', DOCS: false },
      banco: b.app,
      registrarErro: () => 'x',
      enviador: enviadorResend(
        're_chave',
        'MediCore <a@b.com>',
        async () => new Response('', { status: 500 }),
      ),
    });
    await api.ready();
    try {
      const { c } = await administradorPronto();
      const r = await api.inject({
        method: 'POST',
        url: '/api/v1/usuarios',
        payload: { nome: 'Rita Recepcionista', email: 'rita@hospital.com', perfis: ['recepcao'] },
        headers: { cookie: c.cookie, 'x-csrf-token': c.csrf },
      });
      expect(r.json().link).toMatch(/primeiro-acesso#/);
      expect(r.json().enviadoPara).toBeUndefined();
    } finally {
      await api.close();
    }
  });
});

describe('demonstração e configuração', () => {
  it('contas de demonstração: uma por perfil e a equipe completa; nunca na produção', async () => {
    const r = await pedir('POST', '/auth/demonstracao', { payload: { conta: 'farmacia' } });
    expect(r.json()).toMatchObject({
      etapa: 'ativa',
      usuario: { perfis: ['farmacia'], demonstracao: true },
    });
    const todos = await pedir('POST', '/auth/demonstracao', { payload: { conta: 'todos' } });
    expect(todos.json().usuario.perfis).toHaveLength(7);
    expect(todos.json().usuario.medicoId).toBe('med-helena-duarte');
    expect(demonstracaoLigada({ AMBIENTE: 'producao', LOGIN_DEMONSTRACAO: undefined })).toBe(false);
    expect(demonstracaoLigada({ AMBIENTE: 'homologacao', LOGIN_DEMONSTRACAO: 'nao' })).toBe(false);
    const base = { DATABASE_URL: 'postgres://u@h:5432/b' };
    expect(() => lerConfig({ ...base, AMBIENTE: 'producao', LOGIN_DEMONSTRACAO: 'sim' })).toThrow();
    expect(() => lerConfig({ ...base, EMAIL_PROVEDOR: 'resend' })).toThrow();
    expect(
      lerConfig({
        ...base,
        EMAIL_PROVEDOR: 'resend',
        RESEND_API_KEY: 're_1234567890',
        EMAIL_REMETENTE: 'a@b.com',
      }).EMAIL_PROVEDOR,
    ).toBe('resend');

    const prod = await criarServidor({
      config: { AMBIENTE: 'producao', LOG_NIVEL: 'silent', DOCS: false },
      banco: b.app,
      registrarErro: () => 'x',
    });
    await prod.ready();
    try {
      const negado = await prod.inject({
        method: 'POST',
        url: '/api/v1/auth/demonstracao',
        payload: { conta: 'todos' },
      });
      expect(negado.statusCode).toBe(404);
    } finally {
      await prod.close();
    }
  });

  it('o envio pelo Resend manda o e-mail pela API HTTP', async () => {
    const chamadas: [string, RequestInit][] = [];
    const ok = enviadorResend('re_chave', 'MediCore <a@b.com>', async (url, init) => {
      chamadas.push([String(url), init!]);
      return new Response('{}', { status: 200 });
    });
    await ok.enviar({ para: 'x@y.com', assunto: 'A', texto: 'T' });
    expect(chamadas[0]![0]).toBe('https://api.resend.com/emails');
    expect(JSON.parse(String(chamadas[0]![1].body))).toEqual({
      from: 'MediCore <a@b.com>',
      to: ['x@y.com'],
      subject: 'A',
      text: 'T',
    });
    const falha = enviadorResend(
      're_chave',
      'a@b.com',
      async () => new Response('', { status: 422 }),
    );
    await expect(falha.enviar({ para: 'x', assunto: 'a', texto: 't' })).rejects.toBeInstanceOf(
      ErroEnvioEmail,
    );
  });

  it('primeiro administrador: só com o banco sem usuários', async () => {
    const { usuario } = await servico.criarPrimeiroAdministrador(b.app, 'Ana Admin', 'ana@h.com');
    expect(usuario.perfis).toEqual(['administrador']);
    await expect(servico.criarPrimeiroAdministrador(b.app, 'Outra', 'o@h.com')).rejects.toThrow(
      /Já existem/,
    );
  });
});

describe('autor e privacidade (D31, R-AU5)', () => {
  it('a ação grava o nome e o id do usuário', async () => {
    const r = await pedir('POST', '/auth/demonstracao', { payload: { conta: 'nir' } });
    const c = credenciais(r);
    const [leito] = (
      await b.dono.execute<{ id: string; versao: number }>(
        sql`select id, versao from leitos where status = 'livre' limit 1`,
      )
    ).rows;
    const bloqueio = await pedir('POST', `/leitos/${leito!.id}/bloquear`, {
      c,
      payload: { motivo: 'Manutenção do ar-condicionado' },
      headers: { 'if-match': `"v${leito!.versao}"` },
    });
    expect(bloqueio.statusCode).toBe(200);
    expect(bloqueio.json().bloqueio).toMatchObject({
      autor: 'NIR (demonstração)',
      autorId: 'usu-demo-nir',
    });
  });

  it('senha, token, código e cookie nunca aparecem no log', async () => {
    log.length = 0;
    const { segredo, recuperacao } = await administradorPronto();
    const r = await pedir('POST', '/auth/entrar', {
      payload: { email: 'ana@hospital.com', senha: SENHA },
    });
    const passo = Math.floor(agora().getTime() / 1000 / PASSO_TOTP_S);
    const codigo = codigoTotp(segredo, passo);
    await pedir('POST', '/auth/mfa', { c: credenciais(r), payload: { codigo } });
    await pedir('POST', '/auth/esqueci', { payload: { email: 'ana@hospital.com' } });
    const tudo = log.join('\n');
    expect(log.length).toBeGreaterThan(5);
    for (const segredoQueNaoPodeAparecer of [
      SENHA,
      segredo,
      codigo,
      recuperacao[0]!,
      lerCookie(credenciais(r).cookie, 'medicore_sessao')!,
      credenciais(r).csrf,
      tokenDaCaixa(),
      'ana@hospital.com',
    ]) {
      expect(tudo).not.toContain(segredoQueNaoPodeAparecer);
    }
  });

  it('a força da senha confere o e-mail, repetição e sequência', () => {
    expect(problemaDaSenha('anaanaanaana1', 'ana@h.com')).toBe('comum');
    expect(problemaDaSenha('aaaaaaaaaaaaaaa')).toBe('comum');
    expect(problemaDaSenha('123456789012345')).toBe('comum');
    expect(problemaDaSenha(SENHA, 'ana@h.com')).toBeNull();
  });
});
