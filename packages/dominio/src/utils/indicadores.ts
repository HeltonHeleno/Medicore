import type { Consulta } from '../types';

export interface IndicadoresMes {
  /** Consultas do período que não foram canceladas. */
  consultas: number;
  /** `faltou / (concluida + faltou)`, de 0 a 1; `null` sem base de cálculo. */
  taxaFaltas: number | null;
  cancelamentos: number;
}

/** Indicadores do médico no mês (11.4.4). */
export function calcularIndicadores(
  consultas: readonly Pick<Consulta, 'status'>[],
): IndicadoresMes {
  const conta = (s: Consulta['status']) => consultas.filter((c) => c.status === s).length;
  const concluidas = conta('concluida');
  const faltas = conta('faltou');
  const cancelamentos = conta('cancelada');
  return {
    consultas: consultas.length - cancelamentos,
    taxaFaltas: concluidas + faltas > 0 ? faltas / (concluidas + faltas) : null,
    cancelamentos,
  };
}
