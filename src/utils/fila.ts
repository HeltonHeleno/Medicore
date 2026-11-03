/**
 * A7 (prazo e ordem da fila) e A8 (número do atendimento).
 */
import { TEMPO_ALVO_MIN } from '../config/limites';
import type { CorRisco } from '../types';
import { dataDoInstante } from './datas';

const PESO: Record<CorRisco, number> = { vermelho: 0, laranja: 1, amarelo: 2, verde: 3, azul: 4 };

/** 0 = vermelho (mais grave) … 4 = azul. */
export const pesoRisco = (cor: CorRisco): number => PESO[cor];

/** `a` é mais grave que `b`? */
export const maisGrave = (a: CorRisco, b: CorRisco): boolean => PESO[a] < PESO[b];

const somarMin = (iso: string, min: number) =>
  new Date(new Date(iso).getTime() + min * 60_000).toISOString();

/**
 * R-E3 / A7: prazo depois de uma classificação.
 * - primeira: momento + tempo-alvo da cor;
 * - mais grave: o menor entre o prazo atual e o novo;
 * - igual ou menos grave: o prazo não é adiado.
 */
export function calcularPrazo(
  atual: { risco?: CorRisco; prazo?: string },
  nova: { risco: CorRisco; em: string },
): string {
  const novoPrazo = somarMin(nova.em, TEMPO_ALVO_MIN[nova.risco]);
  if (!atual.risco || !atual.prazo) return novoPrazo;
  if (maisGrave(nova.risco, atual.risco)) {
    return novoPrazo < atual.prazo ? novoPrazo : atual.prazo;
  }
  return atual.prazo;
}

export interface ItemFila {
  numero: string;
  chegadaEm: string;
  risco?: CorRisco;
  prazo?: string;
}

/** A7: cor, prazo (o mais próximo primeiro), chegada e número. */
export function ordenarFila<T extends ItemFila>(itens: readonly T[]): T[] {
  return [...itens].sort(
    (a, b) =>
      PESO[a.risco ?? 'azul'] - PESO[b.risco ?? 'azul'] ||
      (a.prazo ?? '9').localeCompare(b.prazo ?? '9') ||
      a.chegadaEm.localeCompare(b.chegadaEm) ||
      a.numero.localeCompare(b.numero),
  );
}

export const acimaDoPrazo = (prazo: string | undefined, momento: Date): boolean =>
  prazo !== undefined && momento.getTime() > new Date(prazo).getTime();

export const formatarNumeroAtendimento = (n: number): string => `E-${String(n).padStart(4, '0')}`;

/**
 * A8 / R-E1: próximo número do dia da chegada (no fuso do hospital).
 * O dia vem da própria chegada, que pode ser registrada até 2 h depois: uma chegada das
 * 23:30 registrada às 00:30 entra na sequência do dia anterior. Usa o maior número já
 * dado no dia + 1, para nunca repetir. Deve ser chamado dentro da transação.
 */
export function numeroAtendimento(
  existentes: readonly { chegadaEm: string; numero: string }[],
  chegadaEm: string,
): string {
  const dia = dataDoInstante(chegadaEm);
  let maior = 0;
  for (const a of existentes) {
    if (dataDoInstante(a.chegadaEm) !== dia) continue;
    const n = Number(a.numero.replace(/\D/g, ''));
    if (n > maior) maior = n;
  }
  return formatarNumeroAtendimento(maior + 1);
}
