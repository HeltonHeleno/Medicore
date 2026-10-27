import { FUSO_HOSPITAL } from '../config/limites';

const LOCALE = 'pt-BR';

const numeroFmt = new Intl.NumberFormat(LOCALE);
const horaFmt = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: FUSO_HOSPITAL,
});

/** 1248 → "1.248" */
export function formatNumero(n: number): string {
  return numeroFmt.format(n);
}

/**
 * 72 → "72%"
 * Recebe o valor já em pontos percentuais (0–100), não em fração.
 * O Intl em pt-BR insere um espaço inseparável antes do "%"; o padrão
 * visual do painel é sem espaço, por isso a montagem manual.
 */
export function formatPercentual(n: number, casasDecimais = 0): string {
  const valor = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  }).format(n);
  return `${valor}%`;
}

/** ISO → "16:00" (24h, no fuso do hospital — não no do computador) */
export function formatHora(iso: string): string {
  return horaFmt.format(new Date(iso));
}

/** 12 → "↑ 12%", -5 → "↓ 5%", 0 → "0%" */
export function formatVariacao(n: number): string {
  const seta = n > 0 ? '↑ ' : n < 0 ? '↓ ' : '';
  return `${seta}${formatPercentual(Math.abs(n))}`;
}
