import type { EntidadeBase } from './comuns';

/** Situação de uma consulta. */
export type StatusConsulta = 'agendada' | 'concluida' | 'cancelada' | 'faltou';

export type TipoConsulta = 'primeira_vez' | 'retorno' | 'exame' | 'teleconsulta';

export type TipoEventoConsulta = 'agendada' | 'reagendada' | 'concluida' | 'faltou' | 'cancelada';

/** Histórico imutável da consulta (M8). */
export interface EventoConsulta {
  tipo: TipoEventoConsulta;
  /** ISO 8601 (UTC). */
  em: string;
  detalhe?: string;
  /** Reagendamento: início anterior. */
  de?: string;
  /** Reagendamento: novo início. */
  para?: string;
}

export interface Consulta extends EntidadeBase {
  pacienteId: string;
  medicoId: string;
  /** Copiado do médico no agendamento. */
  departamentoId: string;
  /** ISO 8601 (UTC). */
  inicio: string;
  duracaoMin: number;
  tipo: TipoConsulta;
  status: StatusConsulta;
  motivo?: string;
  motivoCancelamento?: string;
  eventos: EventoConsulta[];
}

/** Consulta pronta para exibir: com nomes resolvidos e campos calculados. */
export interface ConsultaDetalhada extends Consulta {
  /** Já considera o nome social (R-P6). */
  pacienteNome: string;
  pacienteAlergias?: string;
  medicoNome: string;
  departamentoNome: string;
  /** ISO 8601 (UTC). */
  fim: string;
  /** Agendada e já terminou sem registro (R-C7). */
  atrasada: boolean;
}

/** Dados que a tela envia para agendar ou reagendar. */
export interface EntradaConsulta {
  pacienteId: string;
  medicoId: string;
  /** AAAA-MM-DD no fuso do hospital. */
  data: string;
  /** HH:mm no fuso do hospital. */
  hora: string;
  duracaoMin: number;
  tipo: TipoConsulta;
  motivo?: string;
}

export interface FiltrosAgenda {
  /** AAAA-MM-DD; se informado, só esse dia. */
  data?: string;
  /** Intervalo [de, ate] em AAAA-MM-DD. */
  de?: string;
  ate?: string;
  medicoId?: string;
  pacienteId?: string;
  departamentoId?: string;
  status?: StatusConsulta;
  /** Só consultas aguardando registro (R-C7), de qualquer dia. */
  pendentes?: boolean;
}

/** Motivo pelo qual um horário não está livre (A1). */
export type MotivoHorarioIndisponivel =
  'passado' | 'pausa' | 'medico_ocupado' | 'paciente_ocupado' | 'fora_expediente';

export interface HorarioAgenda {
  /** HH:mm */
  hora: string;
  /** ISO 8601 (UTC). */
  inicio: string;
  livre: boolean;
  motivo?: MotivoHorarioIndisponivel;
}
