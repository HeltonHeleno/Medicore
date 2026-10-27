import { t } from '../../i18n/pt-BR';
import { resumirDisponibilidade } from '../../services/medicos';
import type { DiaSemana, Disponibilidade } from '../../types';
import { horariosPorDia } from '../../utils/agenda';
import { minutosDaHora } from '../../utils/datas';
import type { ValoresMedico } from './valoresMedico';

const m = t.medicos;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Disponibilidade válida a partir dos valores do formulário, ou `null` se ainda incompleta. */
export function disponibilidadeDosValores(
  v: ValoresMedico['disponibilidade'],
): Disponibilidade | null {
  if (!v.diasSemana.length || !HORA.test(v.inicio) || !HORA.test(v.fim)) return null;
  if (minutosDaHora(v.fim) <= minutosDaHora(v.inicio)) return null;
  const pausaValida =
    HORA.test(v.pausa.inicio) &&
    HORA.test(v.pausa.fim) &&
    minutosDaHora(v.pausa.fim) > minutosDaHora(v.pausa.inicio);
  return {
    diasSemana: [...new Set(v.diasSemana)].sort((a, b) => a - b) as DiaSemana[],
    inicio: v.inicio,
    fim: v.fim,
    ...(pausaValida ? { pausa: { inicio: v.pausa.inicio, fim: v.pausa.fim } } : {}),
    duracaoPadraoMin: v.duracaoPadraoMin as Disponibilidade['duracaoPadraoMin'],
  };
}

/** "Seg a Sex · 08:00–17:00 · pausa 12:00–13:00 · 16 horários de 30 min por dia" (A1 sem consultas). */
export function textoPrevia(d: Disponibilidade): string {
  return [
    resumirDisponibilidade(d),
    d.pausa && m.previa.pausa(d.pausa.inicio, d.pausa.fim),
    m.previa.horarios(horariosPorDia(d), d.duracaoPadraoMin),
  ]
    .filter(Boolean)
    .join(' · ');
}
