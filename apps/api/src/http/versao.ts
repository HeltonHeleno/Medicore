/**
 * Fase 24 (24.3.3, D25, R-API1) — Versão otimista na API.
 *
 * - Leituras de um registro devolvem `ETag: "v<versao>"`. Com `If-None-Match` igual, 304.
 * - Gravações exigem `If-Match: "v<versao>"` (sem ele, 428). A gravação só acontece se a versão
 *   no banco ainda for essa; senão, 412 com a versão atual (`ErroConcorrencia`).
 */
import {
  ErroConcorrencia,
  ErroNaoEncontrado,
  ErroVersaoObrigatoria,
} from '@medicore/dominio/erros';
import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable, PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Banco } from '../banco/conexao';

export const etag = (versao: number) => `"v${versao}"`;

/** Lê `"v3"`, `W/"v3"` ou `3`. Devolve `undefined` se o valor não for uma versão. */
export function versaoDoCabecalho(valor: string | undefined): number | undefined {
  if (!valor) return undefined;
  const m = /^(?:W\/)?"?v?(\d+)"?$/.exec(valor.trim());
  return m ? Number(m[1]) : undefined;
}

/** R-API1: a versão que o cliente leu. Sem ela, 428. */
export function versaoExigida(requisicao: FastifyRequest): number {
  const versao = versaoDoCabecalho(requisicao.headers['if-match']);
  if (versao === undefined) throw new ErroVersaoObrigatoria();
  return versao;
}

/**
 * Responde um registro com `ETag`. Devolve `true` quando o cliente já tem essa versão
 * (304, sem corpo) — quem chama não envia mais nada.
 */
export function responderComVersao(
  requisicao: FastifyRequest,
  resposta: FastifyReply,
  versao: number,
): boolean {
  resposta.header('ETag', etag(versao));
  resposta.header('Cache-Control', 'no-cache');
  if (versaoDoCabecalho(requisicao.headers['if-none-match']) === versao) {
    resposta.status(304);
    return true;
  }
  return false;
}

type TabelaComVersao = PgTable & {
  id: PgColumn;
  versao: PgColumn;
  atualizadoEm: PgColumn;
};

/**
 * `UPDATE … SET …, versao = versao + 1 WHERE id = ? AND versao = ?`. Se nenhuma linha mudou,
 * descobre por quê: o registro não existe (404) ou a versão mudou (412 com a versão atual).
 */
export async function atualizarComVersao<T extends TabelaComVersao>(
  banco: Pick<Banco, 'update' | 'select'>,
  tabela: T,
  id: string,
  versaoEsperada: number,
  mudancas: PgUpdateSetSource<T>,
  mensagemNaoEncontrado: string,
): Promise<T['$inferSelect']> {
  const condicao: SQL = and(eq(tabela.id, id), eq(tabela.versao, versaoEsperada))!;
  const linhas = (await banco
    .update(tabela)
    .set({
      ...mudancas,
      versao: sql`${tabela.versao} + 1`,
      atualizadoEm: sql`now()`,
    } as PgUpdateSetSource<T>)
    .where(condicao)
    .returning()) as unknown as T['$inferSelect'][];
  if (linhas.length === 1) return linhas[0]!;

  const atual = await banco
    .select({ versao: tabela.versao })
    .from(tabela as PgTable)
    .where(eq(tabela.id, id));
  if (atual.length === 0) throw new ErroNaoEncontrado(mensagemNaoEncontrado);
  throw new ErroConcorrencia(atual[0]!.versao as number);
}

/** Envia o 304 sem corpo (o esquema de resposta da rota descreve só o 200). */
export function naoModificado(resposta: FastifyReply): FastifyReply {
  return resposta.status(304).send();
}
