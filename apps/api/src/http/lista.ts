/**
 * Fase 24 (24.3.4, R-API2) — Peças das listas no banco. O formato da consulta e da resposta
 * fica no domínio (`@medicore/dominio/contrato/lista`), compartilhado com o navegador.
 */
import { sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Ordenação de texto como nas telas (`Intl.Collator('pt-BR', { sensitivity: 'base' })`):
 * "Júlia" igual a "Julia", sem separar maiúsculas, "Leito 2" antes de "Leito 10". Usa a colação
 * `pt_br_base` (ICU, criada na migração 0001); o desempate é sempre pelo `id`.
 */
export const textoPtBr = (coluna: PgColumn | SQL): SQL => sql`${coluna} collate pt_br_base`;
