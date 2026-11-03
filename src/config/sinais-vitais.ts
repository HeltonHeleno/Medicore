/**
 * Sinais vitais (R-E5, D18).
 *
 * ⚠ As faixas de ALERTA são só uma sinalização visual, não um diagnóstico. O padrão abaixo
 * foi aprovado com a D18 em 28/10/2026 e deve ser revisto pela equipe clínica antes de
 * qualquer uso real. Para desligar a sinalização em menores de 12 anos, use
 * `SINALIZACAO_PEDIATRICA_ATIVA = false` (vale então a faixa de adulto com o aviso).
 */
import type { CampoSinal } from '../types';

/** Faixas fisicamente possíveis: fora delas, o campo tem erro (E-01). */
export const FAIXAS_VALIDAS: Record<CampoSinal, { min: number; max: number; unidade: string }> = {
  pas: { min: 40, max: 300, unidade: 'mmHg' },
  pad: { min: 20, max: 200, unidade: 'mmHg' },
  fc: { min: 20, max: 250, unidade: 'bpm' },
  fr: { min: 4, max: 80, unidade: 'irpm' },
  temperatura: { min: 30, max: 45, unidade: '°C' },
  spo2: { min: 50, max: 100, unidade: '%' },
  dor: { min: 0, max: 10, unidade: '' },
  glicemia: { min: 20, max: 800, unidade: 'mg/dL' },
};

/** Peso opcional na triagem (kg). */
export const FAIXA_PESO = { min: 0.3, max: 400 };

export type FaixaEtaria = 'menor_1' | 'de_1_a_5' | 'de_6_a_11' | 'adulto';

export interface FaixaAlerta {
  fc: { min: number; max: number };
  /** Alerta acima deste valor. */
  frMax: number;
  /** PAS mínima; nas crianças de 1 a 11 anos é `70 + 2 × idade`. */
  pasMin: number | 'pediatrica';
  /** Alerta acima deste valor (só adultos). */
  pasMax?: number;
  spo2Min: number;
}

export const FAIXAS_ALERTA: Record<FaixaEtaria, FaixaAlerta> = {
  menor_1: { fc: { min: 100, max: 180 }, frMax: 60, pasMin: 70, spo2Min: 92 },
  de_1_a_5: { fc: { min: 80, max: 160 }, frMax: 40, pasMin: 'pediatrica', spo2Min: 92 },
  de_6_a_11: { fc: { min: 70, max: 140 }, frMax: 30, pasMin: 'pediatrica', spo2Min: 92 },
  adulto: { fc: { min: 50, max: 130 }, frMax: 30, pasMin: 90, pasMax: 180, spo2Min: 90 },
};

/** Temperatura: alerta em todas as idades. */
export const TEMPERATURA_ALERTA = { min: 35, max: 39.5 };

/** D18 aprovada em 28/10/2026: sinalização pediátrica ligada. */
export const SINALIZACAO_PEDIATRICA_ATIVA = true;
