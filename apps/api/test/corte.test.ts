/**
 * Fase 27 — O que a API ganhou para o navegador usá-la e para os ambientes:
 * CORS, rotas de teste dos testes de ponta a ponta, rota das rotinas (Cloud Scheduler) e a
 * restauração diária da demonstração (27.2.2).
 */
import { agora, definirDeslocamentoDoRelogio } from '@medicore/dominio/utils/relogio';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { semear } from '../src/banco/semear';
import { ErroConfiguracao, lerConfig } from '../src/config';
import { executarRotinasDoDia } from '../src/rotinas/agendador';
import { chaveConfere } from '../src/rotas/rotinas';
import { criarServidor, origensPermitidas } from '../src/servidor';
import { criarBancoDeTeste, type BancoDeTeste } from './apoio/banco';
import { comSessao } from './apoio/sessao';

const CHAVE = 'chave-das-rotinas-com-mais-de-32-caracteres';
let b: BancoDeTeste;
let app: Awaited<ReturnType<typeof criarServidor>>;
const registrarErro = vi.fn(() => 'evento');

beforeAll(async () => {
  b = await criarBancoDeTeste();
  app = await criarServidor({
    config: {
      AMBIENTE: 'teste',
      LOG_NIVEL: 'silent',
      DOCS: false,
      CORS_ORIGENS: ['http://localhost:4173', 'https://medicore-*-equipe.vercel.app'],
    },
    banco: b.app,
    registrarErro,
    bancoDeTeste: b.dono,
    rotinas: { chave: CHAVE, opcoes: { restaurarDemonstracao: b.dono } },
  });
  await app.ready();
  comSessao(app);
});
afterAll(async () => {
  definirDeslocamentoDoRelogio(0);
  await app.close();
  await b.encerrar();
});
beforeEach(async () => {
  await b.limpar();
  await semear(b.dono);
});

const pedir = (
  method: 'GET' | 'POST' | 'PUT' | 'OPTIONS',
  url: string,
  extra: { payload?: unknown; headers?: Record<string, string> } = {},
) =>
  app.inject({
    method,
    url: `/api/v1${url}`,
    payload: extra.payload as object | undefined,
    headers: extra.headers,
  });

describe('configuração dos ambientes', () => {
  it('ROTAS_TESTE só com AMBIENTE=teste; a chave das rotinas tem 32+ caracteres', () => {
    const base = { DATABASE_URL: 'postgres://u@h:5432/b' };
    expect(lerConfig({ ...base, AMBIENTE: 'teste', ROTAS_TESTE: 'sim' }).ROTAS_TESTE).toBe(true);
    expect(() => lerConfig({ ...base, AMBIENTE: 'producao', ROTAS_TESTE: 'sim' })).toThrow(
      ErroConfiguracao,
    );
    expect(() => lerConfig({ ...base, ROTINAS_CHAVE: 'curta' })).toThrow(ErroConfiguracao);
    expect(
      lerConfig({ ...base, CORS_ORIGENS: 'https://a.app, https://b.app' }).CORS_ORIGENS,
    ).toEqual(['https://a.app', 'https://b.app']);
  });

  it('CORS: só os endereços configurados; `*` vale um trecho do nome, sem atravessar pontos', async () => {
    const [exata, prevista] = origensPermitidas([
      'http://localhost:4173',
      'https://medicore-*-equipe.vercel.app',
    ]);
    expect(exata).toBe('http://localhost:4173');
    expect((prevista as RegExp).test('https://medicore-git-fase-27-equipe.vercel.app')).toBe(true);
    expect((prevista as RegExp).test('https://medicore-x.evil.com/-equipe.vercel.app')).toBe(false);

    const permitido = await pedir('OPTIONS', '/leitos', {
      headers: {
        origin: 'https://medicore-abc123-equipe.vercel.app',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'if-match,content-type',
      },
    });
    expect(permitido.headers['access-control-allow-origin']).toBe(
      'https://medicore-abc123-equipe.vercel.app',
    );
    expect(String(permitido.headers['access-control-allow-headers'])).toMatch(/If-Match/i);
    const leitura = await pedir('GET', '/saude', { headers: { origin: 'http://localhost:4173' } });
    expect(leitura.headers['access-control-expose-headers']).toBe('ETag');
    const negado = await pedir('GET', '/saude', { headers: { origin: 'https://outro.site' } });
    expect(negado.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('rotas de teste (27.T.1)', () => {
  it('reiniciar acerta o relógio e semeia nesse instante; relogio só acerta', async () => {
    const r = await pedir('POST', '/_teste/reiniciar', {
      payload: { agora: '2026-11-09T12:40:00.000Z' },
    });
    expect(r.statusCode).toBe(200);
    expect(Math.abs(agora().getTime() - Date.parse('2026-11-09T12:40:00.000Z'))).toBeLessThan(
      5_000,
    );
    await pedir('POST', '/_teste/relogio', { payload: { agora: '2026-11-10T13:40:00.000Z' } });
    expect(agora().toISOString().slice(0, 13)).toBe('2026-11-10T13');
    definirDeslocamentoDoRelogio(0);
  });

  it('lê e grava uma coleção direto (como "outra pessoa")', async () => {
    const leitos = (await pedir('GET', '/_teste/colecoes/leitos')).json() as {
      id: string;
      quarto?: string;
    }[];
    expect(leitos.length).toBeGreaterThan(100);
    const mudados = leitos.map((l, i) => (i === 0 ? { ...l, quarto: 'Q-teste' } : l));
    expect((await pedir('PUT', '/_teste/colecoes/leitos', { payload: mudados })).statusCode).toBe(
      200,
    );
    const depois = (await pedir('GET', `/leitos/${leitos[0]!.id}`)).json();
    expect(depois.quarto).toBe('Q-teste');
    expect((await pedir('GET', '/_teste/colecoes/nao-existe')).statusCode).toBe(422);
  });

  it('as rotas de teste ficam fora do OpenAPI', async () => {
    const api = await criarServidor({
      config: { AMBIENTE: 'teste', LOG_NIVEL: 'silent', DOCS: true },
      banco: b.app,
      registrarErro,
      bancoDeTeste: b.dono,
    });
    await api.ready();
    const doc = (await api.inject({ url: '/api/v1/openapi.json' })).json();
    expect(Object.keys(doc.paths).some((p) => p.includes('_teste'))).toBe(false);
    await api.close();
  });
});

describe('rotinas pelo Cloud Scheduler (27.2.4)', () => {
  it('sem a chave certa, 404; com ela, roda as rotinas uma vez por dia', async () => {
    expect((await pedir('POST', '/rotinas/executar')).statusCode).toBe(404);
    expect(
      (await pedir('POST', '/rotinas/executar', { headers: { 'x-rotinas-chave': 'errada' } }))
        .statusCode,
    ).toBe(404);
    const r = await pedir('POST', '/rotinas/executar', { headers: { 'x-rotinas-chave': CHAVE } });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({
      demonstracao: 'restaurada',
      invariantes: { violacoes: 0 },
    });
    const de_novo = (
      await pedir('POST', '/rotinas/executar', { headers: { 'x-rotinas-chave': CHAVE } })
    ).json();
    expect(de_novo).toEqual({
      demonstracao: 'ja_executada',
      retencao: 'ja_executada',
      invariantes: 'ja_executada',
      auditoria: 'ja_executada',
    });
    expect(chaveConfere(undefined, CHAVE)).toBe(false);
  });

  it('27.2.2: a demonstração volta aos dados de exemplo todo dia', async () => {
    await b.dono.execute(sql`delete from atividades`);
    await b.dono.execute(sql`update pacientes set telefone = '(11) 90000-0000'`);
    const r = await executarRotinasDoDia(b.app, registrarErro, { restaurarDemonstracao: b.dono });
    expect(r.demonstracao).toBe('restaurada');
    const [{ n }] = (
      await b.dono.execute<{ n: number }>(sql`select count(*)::int as n from atividades`)
    ).rows;
    expect(n).toBeGreaterThan(0);
    const [{ m }] = (
      await b.dono.execute<{ m: number }>(
        sql`select count(*)::int as m from pacientes where telefone = '(11) 90000-0000'`,
      )
    ).rows;
    expect(m).toBe(0);
  });

  it('sem a conexão do dono (fora da demonstração), não restaura', async () => {
    const r = await executarRotinasDoDia(b.app, registrarErro);
    expect(r.demonstracao).toBeUndefined();
  });
});
