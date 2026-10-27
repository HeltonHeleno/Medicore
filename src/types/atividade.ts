export type TipoAtividade =
  | 'paciente_cadastrado'
  | 'paciente_inativado'
  | 'medico_cadastrado'
  | 'consulta_agendada'
  | 'consulta_reagendada'
  | 'consulta_concluida'
  | 'consulta_cancelada'
  | 'consulta_faltou';

/** Item da linha do tempo do Painel, gerado pelo serviço na mesma transação da operação. */
export interface Atividade {
  id: string;
  tipo: TipoAtividade;
  descricao: string;
  /** ISO 8601 (UTC). */
  em: string;
  referenciaId?: string;
}
