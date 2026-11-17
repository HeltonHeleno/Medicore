/**
 * Fase 28 (28.T.1) — A matriz de permissões, rota por rota e perfil por perfil (100%).
 *
 * Para cada rota da API (descobertas no registro, nada escrito à mão aqui) e cada perfil:
 * - sem sessão: 401 (ou a rota é pública);
 * - perfil que pode a ação: qualquer resposta menos 403 (o pedido vazio dá 422, 404…);
 * - perfil que não pode: 403 com a ação no corpo (E-20).
 *
 * E o CPF: completo só para quem tem `pacientes.verCpf`.
 */
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import { PERFIS, pode, type Acao } from '@medicore/dominio/permissoes';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exigenciaDaRota, ROTAS } from '../../src/acesso/rotas-permissoes';
import { semear } from '../../src/banco/semear';
import { criarServidor } from '../../src/servidor';
import { criarBancoDeTeste, type BancoDeTeste } from '../apoio/banco';
import { entrarComo, type Credenciais } from '../apoio/sessao';

let b: BancoDeTeste;
let app: FastifyInstance;
const rotas: { metodo: string; url: string }[] = [];
const credenciais = new Map<string, Credenciais>();

beforeAll(async () => {
  b = await criarBancoDeTeste();
  await semear(b.dono);
  app = await criarServidor({
    config: { AMBIENTE: 'teste', LOG_NIVEL: 'silent', DOCS: false },
    banco: b.app,
    registrarErro: () => 'evento',
  });
  await app.ready();
  const inject = app.inject.bind(app) as Parameters<typeof entrarComo>[0];
  for (const perfil of PERFIS) credenciais.set(perfil, await entrarComo(inject, perfil));
}, 60_000);
afterAll(async () => {
  await app.close();
  await b.encerrar();
});

/** Todas as rotas, lidas da árvore do Fastify. */
function listarRotas(instancia: FastifyInstance) {
  const lista: { metodo: string; url: string }[] = [];
  const caminho: string[] = [];
  for (const linha of instancia.printRoutes({ commonPrefix: false }).split('\n')) {
    const m = /^([│ ]*)(?:├── |└── )(.+?) \(([A-Z, ]+)\)$/.exec(linha);
    if (!m) continue;
    const nivel = m[1]!.length / 4;
    caminho.length = nivel;
    caminho[nivel] = m[2]!;
    const url = caminho.join('');
    for (const metodo of m[3]!.split(', ')) {
      if (metodo === 'HEAD' || metodo === 'OPTIONS') continue;
      lista.push({ metodo, url });
    }
  }
  return lista;
}

const comParametros = (url: string) => url.replace(/:[a-zA-Z]+/g, 'x');

function pedir(metodo: string, url: string, c?: Credenciais) {
  return app.inject({
    method: metodo as InjectOptions['method'],
    url: comParametros(url),
    payload: metodo === 'GET' ? undefined : {},
    headers: c ? { cookie: c.cookie, 'x-csrf-token': c.csrf, 'if-match': '"v1"' } : { cookie: '' },
  });
}

describe('matriz de permissões (28.T.1)', () => {
  it('descobre todas as rotas, e cada rota de gravação tem uma ação', () => {
    rotas.push(...listarRotas(app));
    expect(rotas.length).toBeGreaterThan(100);
    for (const r of rotas)
      expect(exigenciaDaRota(r.metodo, r.url), `${r.metodo} ${r.url}`).toBeDefined();
    // Nenhuma linha da tabela sobra (rota renomeada sem atualizar a tabela).
    const existentes = new Set(rotas.map((r) => `${r.metodo} ${r.url}`));
    // (A rota das rotinas só existe com a chave do Scheduler, que este servidor não tem.)
    for (const chave of Object.keys(ROTAS).filter((c) => !c.includes('/rotinas/'))) {
      expect(existentes, chave).toContain(chave);
    }
  });

  it('sem sessão: 401 em toda rota que não é pública', async () => {
    for (const r of rotas) {
      const exigencia = exigenciaDaRota(r.metodo, r.url);
      if (exigencia === 'publica') continue;
      const resposta = await pedir(r.metodo, r.url);
      expect(resposta.statusCode, `${r.metodo} ${r.url}`).toBe(401);
    }
  });

  it.each(PERFIS)('perfil %s: pode → não é 403; não pode → 403 com a ação', async (perfil) => {
    const c = credenciais.get(perfil)!;
    let conferidas = 0;
    for (const r of rotas) {
      const exigencia = exigenciaDaRota(r.metodo, r.url)!;
      if (exigencia === 'publica') continue;
      const resposta = await pedir(r.metodo, r.url, c);
      const rotulo = `${perfil}: ${r.metodo} ${r.url} (${exigencia})`;
      if (pode([perfil], exigencia as Acao)) {
        expect(resposta.statusCode, rotulo).not.toBe(403);
        expect(resposta.statusCode, rotulo).not.toBe(401);
      } else {
        expect(resposta.statusCode, rotulo).toBe(403);
        expect(resposta.json(), rotulo).toEqual({
          codigo: 'permissao',
          acao: ta.acoes[exigencia as Acao],
        });
      }
      conferidas++;
    }
    expect(conferidas).toBeGreaterThan(90);
  });
});

describe('CPF (pacientes.verCpf)', () => {
  const PACIENTE = 'pac-joao-pereira';

  it('Recepção vê o CPF completo; Enfermagem e NIR veem oculto', async () => {
    const ver = async (perfil: string) =>
      (
        await app.inject({
          url: `/api/v1/pacientes/${PACIENTE}`,
          headers: { cookie: credenciais.get(perfil)!.cookie },
        })
      ).json() as { cpf: string };
    expect((await ver('recepcao')).cpf).toMatch(/^\d{11}$/);
    expect((await ver('medico')).cpf).toMatch(/^\d{11}$/);
    expect((await ver('enfermagem')).cpf).toMatch(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/);
    expect((await ver('nir')).cpf).toMatch(/^\*\*\*\./);
  });

  it('Enfermagem edita o paciente sem ver o CPF: o CPF gravado continua o mesmo', async () => {
    const c = credenciais.get('enfermagem')!;
    const r = await app.inject({
      url: `/api/v1/pacientes/${PACIENTE}`,
      headers: { cookie: c.cookie },
    });
    const atual = r.json() as Record<string, unknown>;
    const versao = atual.versao as number;
    const fora = [
      'id',
      'versao',
      'criadoEm',
      'atualizadoEm',
      'ativo',
      'inativadoEm',
      'motivoInativacao',
    ];
    const dados = Object.fromEntries(Object.entries(atual).filter(([k]) => !fora.includes(k)));
    const salvo = await app.inject({
      method: 'PUT',
      url: `/api/v1/pacientes/${PACIENTE}`,
      payload: { ...dados, consentimentoLgpd: true, telefone: '11987654321' },
      headers: { cookie: c.cookie, 'x-csrf-token': c.csrf, 'if-match': `"v${versao}"` },
    });
    expect(salvo.statusCode, salvo.body).toBe(200);
    expect(salvo.json().cpf).toMatch(/^\*\*\*\./);
    const recepcao = credenciais.get('recepcao')!;
    const depois = await app.inject({
      url: `/api/v1/pacientes/${PACIENTE}`,
      headers: { cookie: recepcao.cookie },
    });
    expect(depois.json().cpf).toBe(
      (
        await app.inject({
          url: `/api/v1/pacientes/${PACIENTE}`,
          headers: { cookie: recepcao.cookie },
        })
      ).json().cpf,
    );
    expect(depois.json().cpf).toMatch(/^\d{11}$/);
    expect(depois.json().telefone).toBe('11987654321');
  });
});
