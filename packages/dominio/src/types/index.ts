/** Nível de prioridade de um alerta de emergência. */
export type Prioridade = 'alta' | 'media' | 'baixa';

/** Período disponível no gráfico de tendência de internações. */
export type PeriodoInternacao = 'semana' | 'mes' | 'ano';

export interface Usuario {
  nome: string;
  /** Tratamento usado na saudação, ex.: "Dr. Ricardo Almeida". */
  tratamento: string;
  cargo: string;
  avatarUrl?: string;
}

/** Indicador ainda simulado (os demais KPIs vêm dos cadastros e dos módulos). */
export interface Kpis {
  /** Variação em relação ao dia anterior, em %. Ex.: 12 = +12%. Simulada até haver histórico. */
  variacaoPacientes: number;
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

// Tipos dos cadastros (Fase 8 em diante)
export * from './comuns';
export * from './paciente';
export * from './medico';
export * from './consulta';
export * from './atividade';

// Módulos operacionais (Fase 15)
export * from './leito';
export * from './internacao';
export * from './emergencia';
export * from './farmacia';
export * from './resumo';
