/**
 * Fase 24 (BL-01.3, R-API2) — Padrão das listas da API: paginação, busca, filtros e ordenação,
 * com os mesmos nomes e valores que as telas usam hoje (`FiltrosPacientes`, `FiltrosEstoque`…).
 *
 * Cada rota de lista estende `consultaLista` com os próprios filtros e a lista de campos de
 * ordenação. A resposta é sempre um `Paginado<T>` (`itens`, `total`, `pagina`, `porPagina`).
 */
import { z } from 'zod';
import { POR_PAGINA } from '../config/limites';
import type { Paginado } from '../types';
import { POR_PAGINA_MAXIMO, paginaEfetiva } from '../utils/paginacao';

export { POR_PAGINA_MAXIMO, paginaEfetiva };
/** Padrão das telas de lista de hoje (`POR_PAGINA`). */
export const POR_PAGINA_PADRAO = POR_PAGINA;

/** Número inteiro vindo da query string (`?pagina=2`). */
const inteiroDaQuery = (minimo: number, maximo: number, padrao: number) =>
  z.coerce.number().int().min(minimo).max(maximo).default(padrao);

export const consultaLista = z.object({
  pagina: inteiroDaQuery(1, Number.MAX_SAFE_INTEGER, 1),
  porPagina: inteiroDaQuery(1, POR_PAGINA_MAXIMO, POR_PAGINA_PADRAO),
  busca: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((s) => s || undefined),
  ordem: z.enum(['asc', 'desc']).default('asc'),
});

export type ConsultaLista = z.infer<typeof consultaLista>;

/** Acrescenta a ordenação permitida da rota (o primeiro campo é o padrão). */
export function comOrdenacao<const C extends readonly [string, ...string[]]>(campos: C) {
  return consultaLista.extend({ ordenarPor: z.enum(campos).default(campos[0]) });
}

/** Status de cadastros (R-G3: por padrão, só ativos). */
export const filtroStatus = z.enum(['ativos', 'inativos', 'todos']).default('ativos');

/** Esquema da resposta de lista, para o OpenAPI e os testes de contrato. */
export function respostaLista<T extends z.ZodType>(item: T) {
  return z.object({
    itens: z.array(item),
    total: z.number().int().min(0),
    pagina: z.number().int().min(1),
    porPagina: z.number().int().min(1).max(POR_PAGINA_MAXIMO),
  });
}

/** `LIMIT`/`OFFSET` da consulta, já com a página efetiva. */
export function janela(consulta: Pick<ConsultaLista, 'pagina' | 'porPagina'>, total: number) {
  const pagina = paginaEfetiva(consulta.pagina, consulta.porPagina, total);
  return { pagina, limite: consulta.porPagina, deslocamento: (pagina - 1) * consulta.porPagina };
}

export function paginado<T>(
  itens: T[],
  total: number,
  consulta: Pick<ConsultaLista, 'pagina' | 'porPagina'>,
): Paginado<T> {
  return {
    itens,
    total,
    pagina: paginaEfetiva(consulta.pagina, consulta.porPagina, total),
    porPagina: consulta.porPagina,
  };
}
