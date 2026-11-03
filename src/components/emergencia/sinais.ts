import { te } from '../../i18n/pt-BR/emergencia';
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

const r = te.detalheTela;
const numero = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** Texto curto dos sinais ("PA 120/80 · FC 88 · SpO₂ 97"); só os informados. */
export function textoSinais(s: SinaisVitais): string {
  const partes: string[] = [];
  if (s.pas !== undefined || s.pad !== undefined)
    partes.push(
      r.sinaisResumo.pa(
        s.pas !== undefined ? numero(s.pas) : '—',
        s.pad !== undefined ? numero(s.pad) : '—',
      ),
    );
  for (const c of CAMPOS_SINAIS) {
    if (c === 'pas' || c === 'pad' || s[c] === undefined) continue;
    partes.push(r.sinaisResumo.valor(r.rotulosCurtos[c], numero(s[c]!)));
  }
  return partes.join(' · ');
}
