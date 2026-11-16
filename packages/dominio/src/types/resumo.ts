import type { CorRisco, TipoDesfecho } from './emergencia';
import type { TipoAlta } from './internacao';

/**
 * Totais de um mês (A15): somados pela retenção antes de apagar os itens antigos,
 * para que gráficos e indicadores não percam histórico. `id` = `AAAA-MM`.
 */
export interface ResumoMensal {
  id: string;
  internacoes: number;
  altasPorTipo: Partial<Record<TipoAlta, number>>;
  atendimentosPorCor: Partial<Record<CorRisco, number>>;
  atendimentosPorDesfecho: Partial<Record<TipoDesfecho, number>>;
  /** Soma e quantidade das esperas até o chamado, por cor (minutos). */
  esperaPorCor: Partial<Record<CorRisco, { soma: number; n: number }>>;
  dispensacoes: number;
  /** Unidades que saíram por medicamento (id do medicamento → quantidade). */
  saidasPorMedicamento: Record<string, number>;
}
