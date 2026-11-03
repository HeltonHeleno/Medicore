import type { CampoSinal, SinaisVitais } from '../../types';

export const CAMPOS_SINAIS: readonly CampoSinal[] = [
  'pas',
  'pad',
  'fc',
  'fr',
  'temperatura',
  'spo2',
  'dor',
  'glicemia',
];

export type CampoSinalOuPeso = CampoSinal | 'pesoKg';
/** Valores como digitados (aceita vírgula decimal). */
export type ValoresSinais = Partial<Record<CampoSinalOuPeso, string>>;

/** "37,8" → 37.8; vazio ou inválido → undefined. */
export function lerNumero(texto: string | undefined): number | undefined {
  if (texto === undefined || texto.trim() === '') return undefined;
  const n = Number(texto.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/** Converte os textos digitados em `SinaisVitais` (só os preenchidos). */
export function paraSinais(valores: ValoresSinais): SinaisVitais {
  const sinais: SinaisVitais = {};
  for (const c of CAMPOS_SINAIS) {
    const n = lerNumero(valores[c]);
    if (n !== undefined) sinais[c] = n;
  }
  return sinais;
}
