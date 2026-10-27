import type { StatusConsulta } from './consulta';

/** Nível de prioridade de um alerta de emergência. */
export type Prioridade = 'alta' | 'media' | 'baixa';

/** Período disponível no gráfico de tendência de internações. */
export type PeriodoInternacao = 'semana' | 'mes' | 'ano';

/** Identificador dos setores de leitos. */
export type SetorLeitosId = 'uti' | 'enfermaria' | 'apartamento';

export interface Usuario {
  nome: string;
  /** Tratamento usado na saudação, ex.: "Dr. Ricardo Almeida". */
  tratamento: string;
  cargo: string;
  avatarUrl?: string;
}

export interface Kpis {
  totalPacientes: number;
  /** Variação em relação ao dia anterior, em %. Ex.: 12 = +12%. */
  variacaoPacientes: number;
  medicosPlantao: number;
  casosEmergencia: number;
}

/** Números do dia usados no subtítulo do card de boas-vindas. */
export interface ResumoDia {
  /** Ocupação prevista da UTI até a noite, em %. */
  previsaoOcupacaoUti: number;
  medicamentosEstoqueBaixo: number;
  pacientesRetorno: number;
}

export interface SetorLeitos {
  id: SetorLeitosId;
  nome: string;
  ocupados: number;
  total: number;
}

export interface Departamento {
  id: string;
  nome: string;
  /** Desempenho de 0 a 100. */
  desempenho: number;
}

export interface PontoInternacao {
  /** Rótulo do eixo X, ex.: "Seg", "Sem 1", "Jan". */
  rotulo: string;
  valor: number;
}

export interface AlertaEmergencia {
  id: string;
  titulo: string;
  local: string;
  medico: string;
  prioridade: Prioridade;
}

/** Consulta como o card "Consultas de hoje" do Painel a recebe (até a Fase 13). */
export interface ConsultaPainel {
  id: string;
  /** Data e hora em ISO 8601. */
  horario: string;
  paciente: string;
  departamento: string;
  status: StatusConsulta;
}

/** Atividade como a linha do tempo do Painel a recebe (até a Fase 13). */
export interface AtividadePainel {
  id: string;
  descricao: string;
  /** Data e hora em ISO 8601. */
  horario: string;
}

export interface Insight {
  id: string;
  texto: string;
}

// Tipos dos cadastros (Fase 8 em diante)
export * from './comuns';
export * from './paciente';
export * from './medico';
export * from './consulta';
export * from './atividade';
