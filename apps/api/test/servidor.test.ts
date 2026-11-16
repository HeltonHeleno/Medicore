/** 24.2.1 / 24.3.2 / 24.3.6 — Configuração, logs sem dados pessoais, tradutor de erros, monitoramento. */
import { ErroConflito } from '@medicore/dominio/erros';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { conectar, desconectar } from '../src/banco/conexao';
import { deLinha, instanteIso } from '../src/banco/conversao';
import { pacientes } from '../src/banco/esquema';
import { ErroConfiguracao, lerConfig } from '../src/config';
import { conflitoDoBanco, erroSemDados, traduzirErro } from '../src/http/erros';
import { etag, versaoDoCabecalho } from '../src/http/versao';
import { iniciarMonitoramento } from '../src/monitoramento';
import { criarServidor } from '../src/servidor';

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn(() => 'abc123') }));
vi.mock('@sentry/node', () => sentry);

afterEach(() => vi.clearAllMocks());

describe('configuração (24.2.1)', () => {
  it('lê os padrões e valida', () => {
    const c = lerConfig({ DATABASE_URL: 'postgres://u@h:5432/b' });
    expect(c).toMatchObject({
      PORTA: 3000,
      HOST: '0.0.0.0',
      AMBIENTE: 'desenvolvimento',
      DOCS: true,
      ROTINAS: true,
    });
    expect(lerConfig({ DATABASE_URL: 'postgres://u@h:5432/b', ROTINAS: 'nao' }).ROTINAS).toBe(
      false,
    );
  });

  it('variável errada impede a API de subir, citando o nome e nunca o valor', () => {
    let erro: ErroConfiguracao | undefined;
    try {
      lerConfig({ DATABASE_URL: 'nao-e-url-senha-secreta', PORTA: 'abc', AMBIENTE: 'ferias' });
    } catch (e) {
      erro = e as ErroConfiguracao;
    }
    expect(erro).toBeInstanceOf(ErroConfiguracao);
    expect(erro!.problemas.map((p) => p.split(':')[0])).toEqual(
      expect.arrayContaining(['DATABASE_URL', 'PORTA', 'AMBIENTE']),
    );
    expect(erro!.message).not.toContain('senha-secreta');
  });

  it('variável vazia conta como ausente', () => {
    expect(
      lerConfig({ DATABASE_URL: 'postgres://u@h/b', SENTRY_DSN: '' }).SENTRY_DSN,
    ).toBeUndefined();
  });
});

describe('tradutor de erros (24.3.2)', () => {
  const registrar = vi.fn((_erro: unknown) => 'id1');

  it('erro do Drizzle: a restrição vira conflito; o resto vira 500 sem SQL nem valores', () => {
    const pg = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: 'pacientes_cpf_unico',
    });
    const drizzle = Object.assign(new Error('Failed query: insert ... params: Ana,39053344705'), {
      query: 'insert into pacientes',
      params: ['Ana', '39053344705'],
      cause: pg,
    });
    expect(conflitoDoBanco(drizzle)).toMatchObject({ codigo: 'cpf_duplicado' });

    const outro = Object.assign(new Error('Failed query: select ... params: Ana Silva'), {
      query: 'select',
      params: ['Ana Silva'],
      cause: Object.assign(new Error('syntax'), { code: '42601' }),
    });
    expect(traduzirErro(outro, registrar)).toEqual({
      status: 500,
      corpo: { codigo: 'interno', id: 'id1' },
    });
    const enviado = registrar.mock.calls.at(-1)![0] as Error;
    expect(enviado.message).toBe('Falha no banco (42601)');
    expect(`${enviado.message}${enviado.stack}`).not.toMatch(/Ana|select|params/);
  });

  it('falha de serialização e deadlock viram conflito (a repetição automática é da Fase 26)', () => {
    for (const code of ['40001', '40P01', '23503', '23514']) {
      expect(conflitoDoBanco({ code })).toBeInstanceOf(ErroConflito);
      expect(conflitoDoBanco({ code })?.codigo).toBe('conflito_dados');
    }
    expect(conflitoDoBanco({ code: '42601' })).toBeNull();
    expect(conflitoDoBanco(new Error('x'))).toBeNull();
  });

  it('erro do Fastify de cliente (ex.: 415) vira 422, nunca 500', () => {
    const r = traduzirErro(
      Object.assign(new Error('Unsupported Media Type'), { statusCode: 415 }),
      registrar,
    );
    expect(r.status).toBe(422);
  });

  it('erros que não são do banco passam sem mudança para o monitoramento', () => {
    const e = new TypeError('x');
    expect(erroSemDados(e)).toBe(e);
  });
});

describe('versão no cabeçalho (24.3.3)', () => {
  it.each([
    ['"v3"', 3],
    ['W/"v3"', 3],
    ['3', 3],
    [' "v12" ', 12],
    ['"abc"', undefined],
    [undefined, undefined],
  ])('%s → %s', (valor, esperado) => {
    expect(versaoDoCabecalho(valor)).toBe(esperado);
  });
  it('ETag forte', () => expect(etag(7)).toBe('"v7"'));
});

describe('conversão linha → domínio', () => {
  it('tira nulos e devolve instantes em ISO UTC', () => {
    expect(instanteIso('2026-11-16 11:00:00+00')).toBe('2026-11-16T11:00:00.000Z');
    const p = deLinha<Record<string, unknown>>(pacientes, {
      id: 'pac-x',
      nome: 'X',
      email: null,
      criadoEm: '2026-11-16 11:00:00.5+00',
      dataNascimento: '1980-01-02',
    });
    expect(p).toEqual({
      id: 'pac-x',
      nome: 'X',
      criadoEm: '2026-11-16T11:00:00.500Z',
      dataNascimento: '1980-01-02',
    });
  });
});

describe('monitoramento da API (24.3.6)', () => {
  it('sem DSN: não carrega o SDK e o 500 ainda tem um código', async () => {
    const registrar = await iniciarMonitoramento({ AMBIENTE: 'teste' }, '1.2.0');
    expect(registrar(new Error('x'))).toMatch(/^[0-9a-f]{32}$/);
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('com DSN: coleta de dados pessoais desligada e limpeza em tudo que sai', async () => {
    const registrar = await iniciarMonitoramento(
      { AMBIENTE: 'homologacao', SENTRY_DSN: 'https://chave@o0.ingest.sentry.io/1' },
      '1.2.0',
    );
    expect(registrar(new Error('x'))).toBe('abc123');
    const opcoes = sentry.init.mock.calls[0]![0] as Record<string, unknown> & {
      beforeSend: (e: object) => object;
    };
    expect(opcoes).toMatchObject({
      environment: 'homologacao',
      release: 'medicore-api@1.2.0',
      dataCollection: {
        userInfo: false,
        httpHeaders: false,
        httpBodies: [],
        databaseQueryData: false,
      },
    });
    expect(
      opcoes.beforeSend({
        message: '"Ana" CPF 12345678909',
        request: { url: '/api/v1/pacientes/pac-ana?busca=Ana' },
      }),
    ).toMatchObject({
      message: '"[removido]" CPF [cpf]',
      request: { url: '/api/v1/pacientes/:id' },
    });
    const extras = opcoes as unknown as {
      beforeBreadcrumb: (m: object) => object | null;
      beforeSendSpan: (s: { name: string }) => { name: string };
    };
    expect(extras.beforeBreadcrumb({ category: 'ui.input', message: 'Ana' })).toBeNull();
    expect(extras.beforeSendSpan({ name: '/api/v1/pacientes/pac-ana' }).name).toBe(
      '/api/v1/pacientes/:id',
    );
  });
});

describe('logs sem dados pessoais (24.2.1, R-API4)', () => {
  it('a requisição aparece com método, rota sem valores e código; nada de busca nem cabeçalhos', async () => {
    const linhas: string[] = [];
    const banco = conectar('postgres://ninguem@127.0.0.1:1/nada', 1);
    const app = await criarServidor({
      config: { AMBIENTE: 'teste', LOG_NIVEL: 'info', DOCS: false },
      banco,
      registrarErro: () => 'x',
      destinoLog: { write: (linha: string) => void linhas.push(linha) },
    });
    try {
      const r = await app.inject({
        method: 'GET',
        url: '/api/v1/saude?busca=Maria%20Oliveira',
        headers: { cookie: 'sessao=segredo', authorization: 'Bearer segredo' },
      });
      // Sem banco: 503, e o corpo diz só que o banco está indisponível.
      expect(r.statusCode).toBe(503);
      expect(r.json()).toMatchObject({ status: 'sem_banco', banco: 'indisponivel' });
    } finally {
      await app.close();
      await desconectar(banco);
    }
    const log = linhas.join('');
    expect(log).toContain('"rota":"/api/v1/saude"');
    expect(log).toContain('"status":503');
    expect(log).not.toMatch(/Maria|segredo|busca/);
  });
});
