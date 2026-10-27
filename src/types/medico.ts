import type { EntidadeBase, Inativavel, Ordem, StatusFiltro, UF } from './comuns';

export type Tratamento = 'Dr.' | 'Dra.';

/** 0 = domingo … 6 = sábado. */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Crm {
  /** 4 a 7 dígitos. */
  numero: string;
  uf: UF;
}

export interface Disponibilidade {
  diasSemana: DiaSemana[];
  /** HH:mm */
  inicio: string;
  /** HH:mm */
  fim: string;
  /** Intervalo sem atendimento (R-M4). */
  pausa?: { inicio: string; fim: string };
  /** Define a grade de horários (A1). */
  duracaoPadraoMin: 15 | 20 | 30 | 45 | 60;
}

export interface Medico extends EntidadeBase, Inativavel {
  nome: string;
  tratamento: Tratamento;
  crm: Crm;
  departamentoId: string;
  telefone: string;
  email: string;
  disponibilidade: Disponibilidade;
}

/** Linha da lista de médicos. */
export interface MedicoResumo {
  id: string;
  nomeExibicao: string;
  crmFormatado: string;
  departamentoId: string;
  departamentoNome: string;
  diasResumo: string;
  consultasHoje: number;
  ativo: boolean;
}

export type OrdenacaoMedicos = 'nome' | 'departamento';

export interface FiltrosMedicos {
  busca?: string;
  departamentoId?: string;
  status?: StatusFiltro;
  ordenarPor?: OrdenacaoMedicos;
  ordem?: Ordem;
  pagina?: number;
  porPagina?: number;
}
