import type { EntidadeBase } from './comuns';
import type { Arquivavel } from './internacao';
import type { Sexo } from './paciente';

/** Classificação de risco (D8): escolhida pelo profissional, nunca sugerida pelo sistema. */
export type CorRisco = 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul';
export const CORES_RISCO: readonly CorRisco[] = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul'];

export type StatusAtendimento =
  | 'aguardando_triagem'
  | 'aguardando_atendimento'
  | 'em_atendimento'
  | 'em_observacao'
  | 'aguardando_leito'
  | 'encerrado';

export type ModoChegada = 'meios_proprios' | 'ambulancia' | 'samu' | 'bombeiros' | 'policia';
export type TipoDesfecho = 'alta' | 'internacao' | 'transferencia' | 'obito' | 'evasao';

/** D9: atendimento sem cadastro, vinculado depois (E7). */
export interface IdentificacaoProvisoria {
  descricao: string;
  sexo: Sexo;
  idadeAproximada?: number;
}

/** Todos opcionais (R-E5). */
export interface SinaisVitais {
  pas?: number;
  pad?: number;
  fc?: number;
  fr?: number;
  temperatura?: number;
  spo2?: number;
  dor?: number;
  glicemia?: number;
}
export type CampoSinal = keyof SinaisVitais;

export interface Triagem {
  em: string;
  profissional: string;
  risco: CorRisco;
  sinais: SinaisVitais;
  pesoKg?: number;
  observacao?: string;
  /** Obrigatória quando a retriagem reduz a urgência (R-E3). */
  justificativa?: string;
  autor: string;
}

export interface Reavaliacao {
  em: string;
  sinais: SinaisVitais;
  observacao?: string;
  autor: string;
}

export interface Desfecho {
  tipo: TipoDesfecho;
  em: string;
  hospitalDestino?: string;
  observacao?: string;
  internacaoId?: string;
  /** Quando o desfecho foi registrado (conta a janela do E9). */
  registradoEm: string;
  /** Para reabrir (E9). */
  statusAnterior: StatusAtendimento;
}

export type TipoEventoAtendimento =
  | 'chegada'
  | 'triagem'
  | 'reavaliacao'
  | 'chamado'
  | 'observacao'
  | 'retomado'
  | 'leito_solicitado'
  | 'solicitacao_cancelada'
  | 'vinculado'
  | 'desfecho'
  | 'reaberto';

export interface EventoAtendimento {
  tipo: TipoEventoAtendimento;
  em: string;
  autor: string;
  de?: string;
  para?: string;
  detalhe?: string;
  medicoId?: string;
  /** E3: minutos além do prazo no momento do chamado. */
  excessoMin?: number;
}

export interface Atendimento extends EntidadeBase, Arquivavel {
  /** `E-0001`, sequencial por dia no fuso do hospital (R-E1). */
  numero: string;
  pacienteId?: string;
  provisorio?: IdentificacaoProvisoria;
  chegadaEm: string;
  modoChegada: ModoChegada;
  queixa: string;
  /** Cor atual: da última triagem ou da "emergência imediata" (R-E2). */
  risco?: CorRisco;
  /** Prazo para o atendimento médico (A7). */
  prazo?: string;
  triagens: Triagem[];
  reavaliacoes: Reavaliacao[];
  status: StatusAtendimento;
  medicoId?: string;
  leitoObservacaoId?: string;
  solicitacaoId?: string;
  statusAntesDoLeito?: StatusAtendimento;
  desfecho?: Desfecho;
  eventos: EventoAtendimento[];
}

export interface AlertaSinal {
  campo: CampoSinal;
  texto: string;
}

export interface AtendimentoDetalhado extends Atendimento {
  nomeExibicao: string;
  idade?: number;
  pacienteAlergias?: string;
  medicoNome?: string;
  leitoObservacaoCodigo?: string;
  /** Minutos desde a chegada até o chamado (ou até agora). */
  esperaMin: number;
  acimaDoPrazo: boolean;
  excessoMin: number;
  /** Sinais da última triagem ou reavaliação na faixa de alerta da idade (D18). */
  alertasSinais: AlertaSinal[];
  /** E9: até quando pode ser reaberto (ISO), se ainda puder. */
  reabrirAte?: string;
}

export interface FilaEmergencia {
  aguardandoAtendimento: AtendimentoDetalhado[];
  aguardandoTriagem: AtendimentoDetalhado[];
  emAtendimento: AtendimentoDetalhado[];
  emObservacao: AtendimentoDetalhado[];
  aguardandoLeito: AtendimentoDetalhado[];
}

export interface FiltrosHistoricoEmergencia {
  data?: string;
  risco?: CorRisco;
  desfecho?: TipoDesfecho;
  pagina?: number;
  porPagina?: number;
}

export type PrioridadeAlerta = 'alta' | 'media' | 'baixa';

/** A12: alertas derivados (não gravados). Substitui o `AlertaEmergencia` simulado na Fase 20. */
export interface AlertaOperacional {
  id: string;
  titulo: string;
  local: string;
  responsavel?: string;
  prioridade: PrioridadeAlerta;
  /** Instante de referência para ordenar (o mais antigo primeiro). */
  desde: string;
  referencia: { tipo: 'atendimento' | 'leito' | 'setor'; id: string };
}
