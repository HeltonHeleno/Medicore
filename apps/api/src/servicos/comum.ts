/**
 * Fase 25 — Peças comuns dos serviços da API: transação, leitura e gravação com versão,
 * relógio do domínio e conversão entre o domínio (campos ausentes) e o banco (`NULL`).
 *
 * As regras são as mesmas dos serviços do navegador (`apps/web/src/services`), que continuam
 * em uso até a Fase 27; aqui elas rodam numa transação do banco (R-API3).
 */
import { ErroConcorrencia, ErroNaoEncontrado } from '@medicore/dominio/erros';
import { agora } from '@medicore/dominio/utils/relogio';
import { eq, sql } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import type { Banco } from '../banco/conexao';
import { deLinha } from '../banco/conversao';

/** O banco ou uma transação aberta. */
export type Executor = Pick<
  Banco,
  'select' | 'insert' | 'update' | 'delete' | 'execute' | '$count'
>;

export const momento = () => agora().toISOString();

/** Roda `fn` numa transação; se ela lançar, nada é gravado. */
export function emTransacao<T>(banco: Banco, fn: (tx: Executor) => Promise<T>): Promise<T> {
  return banco.transaction((tx) => fn(tx as unknown as Executor));
}

/** Campos `undefined` viram `NULL` (o domínio apaga um campo deixando-o ausente). */
export function paraBanco<T extends Record<string, unknown>>(mudancas: T): T {
  return Object.fromEntries(
    Object.entries(mudancas).map(([k, v]) => [k, v === undefined ? null : v]),
  ) as T;
}

type TabelaComId = PgTable & { id: PgColumn };
type TabelaComVersao = TabelaComId & { versao: PgColumn; atualizadoEm: PgColumn };

/**
 * Um registro, convertido para o domínio. `bloquear: true` faz `SELECT … FOR UPDATE` (quem vai
 * alterar); `'compartilhado'` faz `FOR SHARE` (quem depende do registro não mudar, como o agendamento
 * que confere se o médico está ativo enquanto outra pessoa o inativa).
 */
export async function lerUm<D>(
  tx: Executor,
  tabela: TabelaComId,
  id: string,
  opcoes: { bloquear?: boolean | 'compartilhado' } = {},
): Promise<D | undefined> {
  const consulta = tx
    .select()
    .from(tabela as PgTable)
    .where(eq(tabela.id, id));
  const travada =
    opcoes.bloquear === 'compartilhado'
      ? consulta.for('share')
      : opcoes.bloquear
        ? consulta.for('update')
        : consulta;
  const linhas = (await travada) as Record<string, unknown>[];
  return linhas[0] ? deLinha<D>(tabela, linhas[0]) : undefined;
}

export async function lerOuFalhar<D>(
  tx: Executor,
  tabela: TabelaComId,
  id: string,
  mensagem: string,
  opcoes: { bloquear?: boolean | 'compartilhado' } = {},
): Promise<D> {
  const registro = await lerUm<D>(tx, tabela, id, opcoes);
  if (!registro) throw new ErroNaoEncontrado(mensagem);
  return registro;
}

/** R-G1: a versão que a tela carregou precisa ser a atual (412 com a versão atual). */
export function conferirVersao(atual: { versao: number }, esperada: number | undefined): void {
  if (esperada !== undefined && atual.versao !== esperada) {
    throw new ErroConcorrencia(atual.versao);
  }
}

/** Como o `repositorio.atualizar` do navegador: versão + 1 e `atualizadoEm` agora. */
export async function atualizarRegistro<D extends { id: string; versao: number }>(
  tx: Executor,
  tabela: TabelaComVersao,
  atual: D,
  mudancas: Record<string, unknown>,
): Promise<D> {
  const linhas = (await tx
    .update(tabela)
    .set(
      paraBanco({
        ...mudancas,
        versao: atual.versao + 1,
        atualizadoEm: momento(),
      }) as never,
    )
    .where(eq(tabela.id, atual.id))
    .returning()) as Record<string, unknown>[];
  return deLinha<D>(tabela, linhas[0]!);
}

/** Insere e devolve o registro como o domínio o vê. */
export async function inserirRegistro<D>(
  tx: Executor,
  tabela: PgTable,
  registro: Record<string, unknown>,
): Promise<D> {
  const linhas = (await tx
    .insert(tabela)
    .values(paraBanco(registro) as never)
    .returning()) as Record<string, unknown>[];
  return deLinha<D>(tabela, linhas[0]!);
}

/**
 * Trava, até o fim da transação, uma chave lógica (a agenda de um médico, a de um paciente).
 * Duas gravações na mesma agenda esperam uma pela outra, e a segunda vê a primeira.
 */
export async function travar(tx: Executor, ...chaves: string[]): Promise<void> {
  for (const chave of [...chaves].sort()) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${chave}, 0))`);
  }
}

/** Escapa `%`, `_` e `\` para usar o texto num `LIKE`. */
export const paraLike = (texto: string) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);
