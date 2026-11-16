/**
 * Fase 24 — Linha do banco → objeto do domínio.
 *
 * - `null` vira campo ausente (o domínio usa campos opcionais, nunca `null`).
 * - `timestamptz` volta como ISO em UTC (`2026-11-16T11:00:00.000Z`), como o domínio grava.
 * - Colunas que só existem no banco (o `fim` da consulta, o `dia` do atendimento) saem.
 */
import { getTableColumns, getTableName } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

/** Colunas que existem só no banco, por tabela. */
const SO_NO_BANCO: Record<string, readonly string[]> = {
  consultas: ['fim'],
  atendimentos: ['dia'],
};

const cacheInstantes = new WeakMap<PgTable, Set<string>>();

function colunasDeInstante(tabela: PgTable): Set<string> {
  let conjunto = cacheInstantes.get(tabela);
  if (!conjunto) {
    conjunto = new Set(
      Object.entries(getTableColumns(tabela))
        .filter(([, coluna]) => coluna.columnType === 'PgTimestampString')
        .map(([chave]) => chave),
    );
    cacheInstantes.set(tabela, conjunto);
  }
  return conjunto;
}

/** `2026-11-16 11:00:00+00` → `2026-11-16T11:00:00.000Z`. */
export const instanteIso = (valor: string) => new Date(valor).toISOString();

export function deLinha<D>(tabela: PgTable, linha: Record<string, unknown>): D {
  const instantes = colunasDeInstante(tabela);
  const omitir = new Set(SO_NO_BANCO[getTableName(tabela)] ?? []);
  const objeto: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(linha)) {
    if (valor === null || omitir.has(chave)) continue;
    objeto[chave] = instantes.has(chave) && typeof valor === 'string' ? instanteIso(valor) : valor;
  }
  return objeto as D;
}
