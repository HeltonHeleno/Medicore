import type { Acao } from '@medicore/dominio/permissoes';
import type {
  LeitoAvaliado,
  LeitoDetalhado,
  MotivoIncompatibilidade,
} from '@medicore/dominio/types';

/** Ações possíveis num leito, conforme a matriz de ações por estado. */
export type AcaoLeito =
  | 'internar'
  | 'concluir'
  | 'bloquear'
  | 'desbloquear'
  | 'transferir'
  | 'darAlta'
  | 'cancelarReserva';

/**
 * Matriz de ações por estado (leito). Observação: internar e bloquear não valem para o setor
 * Observação, que é da Emergência; ocupado por atendimento não tem ação de leito (só o link).
 */
export function acoesDoLeito(leito: LeitoDetalhado): AcaoLeito[] {
  const obs = leito.setorId === 'observacao';
  switch (leito.status) {
    case 'livre':
      return obs ? ['bloquear'] : ['internar', 'bloquear'];
    case 'reservado':
      return ['internar', 'cancelarReserva'];
    case 'ocupado':
      return leito.internacaoId ? ['transferir', 'darAlta'] : [];
    case 'higienizacao':
      return ['concluir', 'bloquear'];
    case 'bloqueado':
      return ['desbloquear'];
  }
}

/** Fase 28 (BL-02.6): a permissão de cada ação. */
export const PERMISSAO_ACAO_LEITO: Record<AcaoLeito, Acao> = {
  internar: 'internacao.editar',
  transferir: 'internacao.editar',
  darAlta: 'internacao.alta',
  concluir: 'leitos.higienizacao',
  bloquear: 'leitos.bloqueio',
  desbloquear: 'leitos.bloqueio',
  cancelarReserva: 'leitos.bloqueio',
};

/** Destino de "Internar": pelo leito livre ou pelo pedido que reservou o leito (L6). */
export const destinoInternar = (leito: LeitoDetalhado) =>
  leito.status === 'reservado' && leito.solicitacaoId
    ? `/leitos/internar?solicitacaoId=${leito.solicitacaoId}`
    : `/leitos/internar?leitoId=${leito.id}`;

/** R-L5 e R-L6: só perfil e isolamento admitem exceção com justificativa. */
const EXCECOES: readonly MotivoIncompatibilidade[] = ['perfil', 'isolamento'];

/** O leito só não combina por perfil ou isolamento (pode ser usado com justificativa). */
export const ehExcecao = (a: LeitoAvaliado) =>
  !a.compativel && a.motivos.length > 0 && a.motivos.every((m) => EXCECOES.includes(m));
