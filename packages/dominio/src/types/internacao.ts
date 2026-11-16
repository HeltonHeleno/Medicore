import type { EntidadeBase } from './comuns';
import type { CorRisco } from './emergencia';
import type { SetorInternacaoId } from './leito';

export type Precaucao = 'padrao' | 'contato' | 'goticulas' | 'aerossois';
export type OrigemInternacao = 'emergencia' | 'eletiva' | 'transferencia_externa';
export type TipoAlta = 'melhorada' | 'a_pedido' | 'transferencia' | 'obito';
export type StatusInternacao = 'ativa' | 'encerrada';

/** Registros antigos trocados por uma versão reduzida pela retenção (A15, M30). */
export interface Arquivavel {
  arquivado?: boolean;
}

export interface AltaInternacao {
  tipo: TipoAlta;
  /** Momento da alta (ISO). */
  em: string;
  /** Obrigatório na transferência para outro hospital. */
  hospitalDestino?: string;
  observacao?: string;
  /** Quando a alta foi registrada (conta a janela do L8). */
  registradaEm: string;
}

export type TipoEventoInternacao =
  | 'internada'
  | 'transferida'
  | 'responsavel_alterado'
  | 'previsao_alterada'
  | 'precaucao_alterada'
  | 'motivo_alterado'
  | 'alta'
  | 'alta_desfeita';

/** Histórico imutável da internação (R-X9: todo evento tem autor). */
export interface EventoInternacao {
  tipo: TipoEventoInternacao;
  em: string;
  autor: string;
  /** Valor anterior (leito, médico, data, precaução…). */
  de?: string;
  /** Valor novo. */
  para?: string;
  motivo?: string;
  /** Exceção de perfil ou isolamento (R-L5, R-L6). */
  justificativa?: string;
}

export interface Internacao extends EntidadeBase, Arquivavel {
  pacienteId: string;
  leitoId: string;
  medicoResponsavelId: string;
  origem: OrigemInternacao;
  hospitalOrigem?: string;
  atendimentoId?: string;
  solicitacaoId?: string;
  motivo: string;
  precaucao: Precaucao;
  /** Início (ISO). Pode ser retroativo até 24 h. */
  inicio: string;
  /** AAAA-MM-DD */
  previsaoAlta?: string;
  status: StatusInternacao;
  alta?: AltaInternacao;
  eventos: EventoInternacao[];
}

export interface InternacaoDetalhada extends Internacao {
  pacienteNome: string;
  pacienteIdade?: number;
  pacienteAlergias?: string;
  leitoCodigo: string;
  setorId: string;
  setorNome: string;
  medicoNome: string;
  /** Dias de permanência (o dia da entrada é o dia 1). */
  permanenciaDias: number;
  previsaoAltaVencida: boolean;
  previsaoAltaHoje: boolean;
  /** L8: até quando a alta pode ser desfeita (ISO), se ainda puder. */
  desfazerAltaAte?: string;
}

export interface FiltrosInternacoes {
  status?: StatusInternacao;
  busca?: string;
  setorId?: string;
  medicoId?: string;
  altaPrevista?: 'hoje' | 'vencida';
  pagina?: number;
  porPagina?: number;
}

export type OrigemSolicitacao = 'emergencia' | 'eletiva';
export type StatusSolicitacao = 'pendente' | 'reservada' | 'atendida' | 'cancelada';

export interface SolicitacaoLeito extends EntidadeBase, Arquivavel {
  origem: OrigemSolicitacao;
  atendimentoId?: string;
  pacienteId: string;
  setorDesejado: SetorInternacaoId;
  precaucao: Precaucao;
  motivo: string;
  /** AAAA-MM-DD, nas eletivas. */
  dataPrevista?: string;
  prioridade: CorRisco;
  justificativaPrioridade?: string;
  status: StatusSolicitacao;
  leitoReservadoId?: string;
  reservadaEm?: string;
  internacaoId?: string;
  motivoCancelamento?: string;
  canceladaEm?: string;
  autor: string;
}

export interface SolicitacaoDetalhada extends SolicitacaoLeito {
  pacienteNome: string;
  atendimentoNumero?: string;
  leitoReservadoCodigo?: string;
  /** Minutos desde a criação. */
  esperaMin: number;
  reservaLonga: boolean;
  esperaLonga: boolean;
}
