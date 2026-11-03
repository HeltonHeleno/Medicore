export type TipoAtividade =
  | 'paciente_cadastrado'
  | 'paciente_inativado'
  | 'medico_cadastrado'
  | 'consulta_agendada'
  | 'consulta_reagendada'
  | 'consulta_concluida'
  | 'consulta_cancelada'
  | 'consulta_faltou'
  // Módulos operacionais (Fase 15)
  | 'paciente_internado'
  | 'paciente_transferido'
  | 'alta_registrada'
  | 'alta_desfeita'
  | 'obito_registrado'
  | 'emergencia_vermelho'
  | 'emergencia_desfecho'
  | 'atendimento_reaberto'
  | 'leito_bloqueado'
  | 'leito_desbloqueado'
  | 'lote_recebido'
  | 'lote_bloqueado'
  | 'lote_vencido'
  | 'estoque_baixo'
  | 'dispensacao_estornada';

/** Item da linha do tempo do Painel, gerado pelo serviço na mesma transação da operação. */
export interface Atividade {
  id: string;
  tipo: TipoAtividade;
  descricao: string;
  /** ISO 8601 (UTC). */
  em: string;
  referenciaId?: string;
}
