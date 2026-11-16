/**
 * A10 — correspondência de alergia por texto (D14).
 * Falso positivo é aceitável (há confirmação); falso negativo é a limitação conhecida,
 * porque as alergias são texto livre. A tela avisa: "Verificação por texto…".
 */
import { normalizar } from './busca';

/** "Penicilina; látex e AINEs" → ["penicilina", "latex", "aines"] */
export function termos(texto: string | undefined): string[] {
  if (!texto) return [];
  return normalizar(texto)
    .split(/[;,/]|\be\b/)
    .map((p) =>
      p
        .replace(/[^\p{L}\p{N}\s+-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((p) => p.replace(/[^\p{L}]/gu, '').length >= 4);
}

export type CampoAlergia = 'principioAtivo' | 'classe' | 'nome';

export interface CorrespondenciaAlergia {
  /** Termo das alergias do paciente que bateu. */
  termo: string;
  campo: CampoAlergia;
  /** Texto do medicamento que bateu. */
  candidato: string;
}

/** Primeiro termo de alergia contido no medicamento (ou o contrário), ou `null`. */
export function correspondenciaAlergia(
  alergias: string | undefined,
  medicamento: { principioAtivo: string; classe?: string; nome: string },
): CorrespondenciaAlergia | null {
  const doPaciente = termos(alergias);
  if (doPaciente.length === 0) return null;
  const campos: [CampoAlergia, string | undefined][] = [
    ['principioAtivo', medicamento.principioAtivo],
    ['classe', medicamento.classe],
    ['nome', medicamento.nome],
  ];
  for (const [campo, texto] of campos) {
    for (const candidato of termos(texto)) {
      for (const termo of doPaciente) {
        if (candidato.includes(termo) || termo.includes(candidato)) {
          return { termo, campo, candidato };
        }
      }
    }
  }
  return null;
}

/** R-F15: campo de alergias vazio é "não informado", não "sem alergias". */
export const alergiasNaoInformadas = (alergias: string | undefined): boolean =>
  !alergias || alergias.trim() === '';
