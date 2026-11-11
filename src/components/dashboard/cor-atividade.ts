import type { TipoAtividade } from '../../types';

/**
 * 20.7: cor do marcador da linha do tempo por tipo de atividade. Decorativa (o texto diz o que
 * houve); mantém o marcador redondo do Painel, sem mudar o visual da Fase 14.
 */
const CORES: Partial<Record<TipoAtividade, string>> = {
  emergencia_vermelho: 'bg-danger',
  obito_registrado: 'bg-danger',
  estoque_baixo: 'bg-danger',
  lote_vencido: 'bg-danger',
  consulta_cancelada: 'bg-danger',
  leito_bloqueado: 'bg-warning',
  lote_bloqueado: 'bg-warning',
  alta_desfeita: 'bg-warning',
  atendimento_reaberto: 'bg-warning',
  dispensacao_estornada: 'bg-warning',
  consulta_faltou: 'bg-warning',
  paciente_internado: 'bg-primary',
  paciente_transferido: 'bg-primary',
  alta_registrada: 'bg-primary',
  emergencia_desfecho: 'bg-primary',
  leito_desbloqueado: 'bg-primary',
  lote_recebido: 'bg-primary',
};

export const corAtividade = (tipo: TipoAtividade): string => CORES[tipo] ?? 'bg-text';
