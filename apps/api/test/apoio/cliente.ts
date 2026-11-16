/**
 * Fase 25 (25.T.1) — Os testes de serviço do navegador rodando contra a API e o banco.
 *
 * `usarApi(instante)` faz o mesmo que o `prepararServicos` do navegador: relógio fixo e os dados
 * de exemplo semeados com esse relógio antes de cada teste. Devolve:
 * - `cliente`: as mesmas funções dos serviços do navegador (`criarPaciente`, `agendarConsulta`…),
 *   que vão pela rota HTTP (`inject`) até o banco;
 * - `ler`: o lugar dos `repoX.obter/todos()` dos testes do navegador, lendo as tabelas.
 */
import { criarClienteCadastros, type TransporteApi } from '@medicore/dominio/cliente/cadastros';
import type { Atividade, Consulta, Medico, Paciente } from '@medicore/dominio/types';
import { sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { deLinha } from '../../src/banco/conversao';
import * as e from '../../src/banco/esquema';
import { semear } from '../../src/banco/semear';
import { PREFIXO } from '../../src/servidor';
import { criarApiDeTeste, type ApiDeTeste } from './api';

export function transporteInject(api: () => ApiDeTeste): TransporteApi {
  return async (r) => {
    const consulta = new URLSearchParams(
      Object.entries(r.consulta ?? {}).map(([k, v]) => [k, String(v)]),
    ).toString();
    const resposta = await api().app.inject({
      method: r.metodo,
      url: `${PREFIXO}${r.caminho}${consulta ? `?${consulta}` : ''}`,
      payload: r.corpo === undefined ? undefined : (r.corpo as object),
      headers: r.versao === undefined ? {} : { 'if-match': `"v${r.versao}"` },
    });
    return { status: resposta.statusCode, corpo: resposta.body ? resposta.json() : null };
  };
}

/** Lê uma tabela na ordem em que as linhas foram gravadas (como o `todos()` dos repositórios). */
async function lerTabela<D>(api: ApiDeTeste, tabela: PgTable): Promise<D[]> {
  const linhas = (await api.banco.dono
    .select()
    .from(tabela)
    .orderBy(sql`ctid`)) as Record<string, unknown>[];
  return linhas.map((l) => deLinha<D>(tabela, l));
}

export function usarApi(instante: string) {
  let api: ApiDeTeste | undefined;
  const atual = () => {
    if (!api) throw new Error('A API de teste ainda não subiu.');
    return api;
  };
  const cliente = criarClienteCadastros(transporteInject(atual));

  beforeAll(async () => {
    api = await criarApiDeTeste();
  });
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(instante));
    await atual().banco.limpar();
    await semear(atual().banco.dono);
  });
  afterEach(() => vi.useRealTimers());
  afterAll(async () => {
    await api?.encerrar();
  });

  const porId = async <D extends { id: string }>(tabela: PgTable, id: string) =>
    (await lerTabela<D>(atual(), tabela)).find((x) => x.id === id);

  const ler = {
    atividades: () => lerTabela<Atividade>(atual(), e.atividades),
    consultas: () => lerTabela<Consulta>(atual(), e.consultas),
    consulta: (id: string) => porId<Consulta>(e.consultas, id),
    medico: (id: string) => porId<Medico>(e.medicos, id),
    paciente: (id: string) => porId<Paciente>(e.pacientes, id),
  };

  return { cliente, ler, api: atual };
}

export const ajustarRelogio = (instante: string) => vi.setSystemTime(new Date(instante));

/** Devolve o erro lançado pela promessa (falha o teste se ela não lançar). */
export async function erroDe(promessa: Promise<unknown>): Promise<Error & Record<string, unknown>> {
  try {
    await promessa;
  } catch (e) {
    return e as Error & Record<string, unknown>;
  }
  throw new Error('A operação deveria ter falhado');
}
