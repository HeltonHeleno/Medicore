import type { EntidadeBase } from './comuns';
import type { CorRisco } from './emergencia';
import type { Precaucao } from './internacao';

/** Setores fixos (D10, D17). Só os do tipo `internacao` entram na ocupação do Painel. */
export type SetorId = 'uti' | 'enfermaria' | 'apartamento' | 'observacao';
export type SetorInternacaoId = Exclude<SetorId, 'observacao'>;
export type TipoSetor = 'internacao' | 'observacao';

export interface Setor {
  id: SetorId;
  nome: string;
  tipo: TipoSetor;
  ordem: number;
}

export type StatusLeito = 'livre' | 'ocupado' | 'reservado' | 'higienizacao' | 'bloqueado';
export type PerfilLeito = 'adulto' | 'pediatrico';
/** R-L13: terminal (60 min de referência) ou isolamento (90 min). */
export type TipoHigienizacao = 'terminal' | 'isolamento';

export interface BloqueioLeito {
  motivo: string;
  /** AAAA-MM-DD */
  previsaoLiberacao?: string;
  em: string;
  autor: string;
}

export interface Leito extends EntidadeBase {
  /** Único. Ex.: `UTI-07`, `ENF-104B`, `APT-212`, `OBS-03`. */
  codigo: string;
  setorId: SetorId;
  quarto?: string;
  perfil: PerfilLeito;
  /** Leito com estrutura de isolamento (R-L6). */
  isolamento: boolean;
  status: StatusLeito;
  /** Ocupado por internação. */
  internacaoId?: string;
  /** Ocupado por atendimento da emergência (setor Observação). */
  atendimentoId?: string;
  /** Reservado para uma solicitação (R-L9). */
  solicitacaoId?: string;
  /** Início do status atual (ISO). */
  desde: string;
  bloqueio?: BloqueioLeito;
  higienizacao?: { tipo: TipoHigienizacao };
}

/** Quem está no leito, já com os nomes resolvidos (R-X5). */
export interface OcupanteLeito {
  pacienteId?: string;
  nome: string;
  idade?: number;
  internacaoId?: string;
  atendimentoId?: string;
  atendimentoNumero?: string;
  /** Dia de internação (o dia da entrada é o dia 1). */
  diaInternacao?: number;
  temAlergia: boolean;
  alergiasNaoInformadas: boolean;
  precaucao?: Precaucao;
  previsaoAlta?: string;
  previsaoAltaVencida?: boolean;
}

/** Leito pronto para o mapa. */
export interface LeitoDetalhado extends Leito {
  setorNome: string;
  ocupante?: OcupanteLeito;
  reserva?: { solicitacaoId: string; pacienteNome: string; prioridade: CorRisco; desde: string };
  /** Minutos no status atual. */
  minutosNoStatus: number;
  /** R-L13: acima do tempo de referência (destaque) ou do dobro (alerta). */
  higienizacaoAtrasada?: 'destaque' | 'alerta';
  /** R-L9: reservado há mais de 2 h. */
  reservaLonga?: boolean;
  /** R-L14: bloqueado com a previsão de liberação vencida. */
  liberacaoVencida?: boolean;
}

export interface FiltrosLeitos {
  setorId?: SetorId;
  status?: StatusLeito;
  perfil?: PerfilLeito;
  soIsolamento?: boolean;
}

/** A11: resultado da avaliação de um leito para um paciente. */
export type MotivoIncompatibilidade = 'situacao' | 'perfil' | 'isolamento' | 'setor';

export interface LeitoAvaliado {
  leito: Leito;
  compativel: boolean;
  motivos: MotivoIncompatibilidade[];
  sugerido: boolean;
}
