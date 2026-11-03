/**
 * A9 — FEFO (vence primeiro, sai primeiro), R-F1, R-F3, R-F5 e R-F13.
 */
import type { AlocacaoLote, Lote } from '../types';
import { estaVencido } from './tempos';

/** O lote pode sair do estoque? (não vencido, não bloqueado e com saldo) */
export const loteDisponivel = (lote: Lote, hoje: string): boolean =>
  !estaVencido(lote.validade, hoje) && !lote.bloqueio && lote.quantidadeAtual > 0;

/** R-F1: soma dos lotes não vencidos e não bloqueados. */
export const disponivelDe = (lotes: readonly Lote[], hoje: string): number =>
  lotes.filter((l) => loteDisponivel(l, hoje)).reduce((s, l) => s + l.quantidadeAtual, 0);

/** Lotes na ordem de saída. */
export const ordemFefo = (lotes: readonly Lote[], hoje: string): Lote[] =>
  lotes
    .filter((l) => loteDisponivel(l, hoje))
    .sort(
      (a, b) =>
        a.validade.localeCompare(b.validade) ||
        a.entradaEm.localeCompare(b.entradaEm) ||
        a.numero.localeCompare(b.numero),
    );

export interface PlanoFefo {
  alocacoes: AlocacaoLote[];
  disponivel: number;
  /** Quanto faltou (0 = atendido por inteiro). */
  falta: number;
}

/** Divide a quantidade entre os lotes que vencem primeiro. */
export function planejarFefo(lotes: readonly Lote[], quantidade: number, hoje: string): PlanoFefo {
  const ordem = ordemFefo(lotes, hoje);
  const alocacoes: AlocacaoLote[] = [];
  let restante = quantidade;
  for (const lote of ordem) {
    if (restante <= 0) break;
    const usar = Math.min(restante, lote.quantidadeAtual);
    alocacoes.push({ loteId: lote.id, quantidade: usar });
    restante -= usar;
  }
  return {
    alocacoes,
    disponivel: ordem.reduce((s, l) => s + l.quantidadeAtual, 0),
    falta: Math.max(0, restante),
  };
}

/**
 * F4: quanto de cada lote ainda pode voltar, na ordem inversa da saída
 * (o último lote usado devolve primeiro), dado o total já devolvido do item.
 */
export function devolucaoPorLote(
  saida: readonly AlocacaoLote[],
  jaDevolvido: number,
  devolverAgora: number,
): AlocacaoLote[] {
  const inversa = [...saida].reverse();
  let pular = jaDevolvido;
  let restante = devolverAgora;
  const resultado: AlocacaoLote[] = [];
  for (const a of inversa) {
    let livre = a.quantidade;
    const pulado = Math.min(pular, livre);
    pular -= pulado;
    livre -= pulado;
    if (livre <= 0 || restante <= 0) continue;
    const usar = Math.min(livre, restante);
    resultado.push({ loteId: a.loteId, quantidade: usar });
    restante -= usar;
  }
  return resultado;
}
