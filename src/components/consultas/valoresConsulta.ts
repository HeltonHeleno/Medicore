import type { TipoConsulta } from '../../types';

/** Forma dos valores no formulário de agendamento/reagendamento. */
export interface ValoresConsulta {
  pacienteId: string;
  medicoId: string;
  data: string;
  hora: string;
  duracaoMin: number;
  tipo: TipoConsulta;
  motivo: string;
}

/** Durações oferecidas (R-C9: 5–120, múltiplas de 5). */
export const DURACOES = [10, 15, 20, 30, 40, 45, 60, 90, 120];
