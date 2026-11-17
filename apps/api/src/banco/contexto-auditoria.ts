/**
 * Fase 29 (BL-03.1) — O contexto da auditoria de cada transação: quem (usuário da sessão), de onde
 * (IP, navegador), quando (o relógio do domínio) e a origem (`api` ou `rotina`).
 *
 * `conectar()` marca esse contexto no começo de **toda** transação com `SET LOCAL` (vale só até o
 * fim dela), e os gatilhos do banco (`0005_auditoria.sql`) o gravam junto com o antes → depois.
 * `SET` não tira o retrato da transação, então as travas da Fase 26 continuam valendo.
 */
import { agora } from '@medicore/dominio/utils/relogio';

export interface ContextoAuditoria {
  usuarioId?: string;
  usuarioNome?: string;
  ip?: string;
  agente?: string;
  origem: 'api' | 'rotina';
}

let fonte: () => ContextoAuditoria | undefined = () => undefined;

/** A API liga aqui o contexto da requisição atual (`acesso/contexto.ts`). */
export function definirFonteDoContexto(fn: () => ContextoAuditoria | undefined): void {
  fonte = fn;
}

export const contextoAtualDaAuditoria = (): ContextoAuditoria => fonte() ?? { origem: 'rotina' };

/** `SET LOCAL medicore.contexto = '{…}'` (o `SET` não aceita parâmetro: o texto é escapado). */
export function comandoDoContexto(c: ContextoAuditoria = contextoAtualDaAuditoria()): string {
  const json = JSON.stringify({ ...c, em: agora().toISOString() });
  return `set local medicore.contexto = '${json.replace(/'/g, "''")}'`;
}
