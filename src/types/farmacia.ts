import type { EntidadeBase } from './comuns';
import type { Arquivavel } from './internacao';

export type FormaFarmaceutica =
  | 'comprimido'
  | 'capsula'
  | 'solucao_oral'
  | 'solucao_injetavel'
  | 'po_injetavel'
  | 'pomada'
  | 'outro';

/** Unidade de dispensação (D11): sempre inteira. */
export type UnidadeDispensacao =
  'comprimido' | 'capsula' | 'ampola' | 'frasco' | 'bisnaga' | 'unidade';

/** Listas da Portaria 344/98 usadas nos dados de exemplo (R-F7). */
export type ListaControlado = 'A1' | 'A2' | 'A3' | 'B1' | 'B2' | 'C1' | 'C5';

export interface Medicamento extends EntidadeBase {
  nome: string;
  nomeComercial?: string;
  principioAtivo: string;
  classe?: string;
  concentracao: string;
  forma: FormaFarmaceutica;
  unidade: UnidadeDispensacao;
  controlado?: { lista: ListaControlado };
  /** Entrada por embalagem (M27). Travado depois da primeira movimentação. */
  unidadesPorEmbalagem?: number;
  estoqueMinimo: number;
  ativo: boolean;
  inativadoEm?: string;
  motivoInativacao?: string;
}

export interface BloqueioLote {
  motivo: string;
  referencia?: string;
  em: string;
  autor: string;
}

export interface Lote extends EntidadeBase {
  medicamentoId: string;
  numero: string;
  /** AAAA-MM-DD */
  validade: string;
  fabricante?: string;
  notaFiscal?: string;
  quantidadeInicial: number;
  quantidadeAtual: number;
  /** Primeira entrada (ISO): desempate do FEFO. */
  entradaEm: string;
  bloqueio?: BloqueioLote;
  /** Soma das movimentações removidas pela retenção (INV-7). */
  saldoArquivado: number;
}

export type TipoMovimentacao =
  | 'entrada'
  | 'dispensacao'
  | 'devolucao'
  | 'ajuste_positivo'
  | 'ajuste_negativo'
  | 'perda'
  | 'descarte_vencido';

/** Imutável (R-F9): correções são movimentos contrários. */
export interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  medicamentoId: string;
  loteId: string;
  /** Sempre > 0; o sentido vem do tipo. */
  quantidade: number;
  saldoLoteApos: number;
  dispensacaoId?: string;
  motivo?: string;
  /** Termo de descarte (controlados, F6). */
  termo?: string;
  autor: string;
  em: string;
}

export interface AlocacaoLote {
  loteId: string;
  quantidade: number;
}

export interface ItemDispensacao {
  medicamentoId: string;
  quantidade: number;
  /** Lotes escolhidos pelo FEFO, na ordem de saída. */
  lotes: AlocacaoLote[];
  devolvido: number;
}

export type TipoAlertaDispensacao = 'alergia' | 'controlado' | 'quantidade_alta';

export interface AlertaConfirmado {
  tipo: TipoAlertaDispensacao;
  medicamentoId: string;
  termo?: string;
  justificativa?: string;
}

export interface Dispensacao extends EntidadeBase, Arquivavel {
  pacienteId: string;
  destino: { tipo: 'internacao' | 'emergencia'; id: string };
  medicoSolicitanteId: string;
  itens: ItemDispensacao[];
  alertasConfirmados: AlertaConfirmado[];
  status: 'realizada' | 'estornada';
  estorno?: { em: string; motivo: string; autor: string };
  em: string;
  autor: string;
}

export type SituacaoEstoque = 'ok' | 'baixo' | 'zerado';

export interface LoteDetalhado extends Lote {
  vencido: boolean;
  vencendo: boolean;
  /** Dias até a validade (negativo se vencido). */
  diasParaVencer: number;
}

export interface EstoqueMedicamento {
  medicamento: Medicamento;
  /** R-F1: lotes não vencidos e não bloqueados. */
  disponivel: number;
  vencido: number;
  bloqueado: number;
  situacao: SituacaoEstoque;
  vencendo: boolean;
  proximoVencimento?: string;
}

export interface FiltrosEstoque {
  busca?: string;
  situacao?: SituacaoEstoque | 'vencendo' | 'vencidos';
  forma?: FormaFarmaceutica;
  soControlados?: boolean;
  status?: 'ativos' | 'inativos' | 'todos';
  pagina?: number;
  porPagina?: number;
}

export interface FiltrosMovimentacoes {
  tipo?: TipoMovimentacao;
  de?: string;
  ate?: string;
  medicamentoId?: string;
  pacienteId?: string;
  pagina?: number;
  porPagina?: number;
}

/** M28: conferência por medicamento controlado e período. */
export interface LivroControlados {
  medicamento: Medicamento;
  de: string;
  ate: string;
  saldoInicial: number;
  entradas: number;
  saidas: number;
  saldoFinal: number;
  movimentacoes: Movimentacao[];
}

export interface ResumoEstoque {
  baixo: number;
  zerado: number;
  vencendo: number;
  vencidos: number;
}
