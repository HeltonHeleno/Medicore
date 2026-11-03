import type { AtendimentoDetalhado, FilaEmergencia } from '../../types';

export type GrupoFila = keyof FilaEmergencia;
export const GRUPOS_FILA: readonly GrupoFila[] = [
  'aguardandoAtendimento',
  'aguardandoTriagem',
  'emAtendimento',
  'emObservacao',
  'aguardandoLeito',
];

/** Critério do "Mostrar só": uma cor, um grupo ou nada (`null` = grupo escondido). */
export function filtrarGrupo(
  lista: readonly AtendimentoDetalhado[],
  grupo: GrupoFila,
  mostrar: string,
): AtendimentoDetalhado[] | null {
  if (!mostrar) return [...lista];
  if ((GRUPOS_FILA as readonly string[]).includes(mostrar))
    return mostrar === grupo ? [...lista] : null;
  return lista.filter((a) => a.risco === mostrar);
}
