import type { SetorLeitos } from '../types';

export function totalLeitos(setores: SetorLeitos[]): number {
  return setores.reduce((soma, s) => soma + s.total, 0);
}

export function leitosOcupados(setores: SetorLeitos[]): number {
  return setores.reduce((soma, s) => soma + s.ocupados, 0);
}

export function leitosDisponiveis(setores: SetorLeitos[]): number {
  return totalLeitos(setores) - leitosOcupados(setores);
}

/** Percentual de ocupação arredondado (0–100). Retorna 0 quando não há leitos. */
export function percentualOcupacao(setores: SetorLeitos[]): number {
  const total = totalLeitos(setores);
  if (total === 0) return 0;
  return Math.round((leitosOcupados(setores) / total) * 100);
}

/** Resumo completo, prático para os cards de KPI e de ocupação. */
export function resumoLeitos(setores: SetorLeitos[]) {
  return {
    total: totalLeitos(setores),
    ocupados: leitosOcupados(setores),
    disponiveis: leitosDisponiveis(setores),
    percentual: percentualOcupacao(setores),
  };
}
