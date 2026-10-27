/** Campos que o serviço controla em toda entidade cadastrada. */
export interface EntidadeBase {
  /** UUID gerado pelo serviço. */
  id: string;
  /** ISO 8601 (UTC). */
  criadoEm: string;
  /** ISO 8601 (UTC). */
  atualizadoEm: string;
  /** Começa em 1 e sobe a cada alteração; usado para detectar edição concorrente (R-G1). */
  versao: number;
}

/** Campos de exclusão lógica (D3). */
export interface Inativavel {
  ativo: boolean;
  inativadoEm?: string;
  motivoInativacao?: string;
}

/** Campos que a tela envia ao criar/editar (o serviço preenche o resto). */
export type Entrada<T extends EntidadeBase> = Omit<
  T,
  keyof EntidadeBase | 'ativo' | 'inativadoEm' | 'motivoInativacao'
>;

export type UF =
  | 'AC'
  | 'AL'
  | 'AP'
  | 'AM'
  | 'BA'
  | 'CE'
  | 'DF'
  | 'ES'
  | 'GO'
  | 'MA'
  | 'MT'
  | 'MS'
  | 'MG'
  | 'PA'
  | 'PB'
  | 'PR'
  | 'PE'
  | 'PI'
  | 'RJ'
  | 'RN'
  | 'RS'
  | 'RO'
  | 'RR'
  | 'SC'
  | 'SP'
  | 'SE'
  | 'TO';

export const UFS: readonly UF[] = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

export type StatusFiltro = 'ativos' | 'inativos' | 'todos';
export type Ordem = 'asc' | 'desc';

/** Resultado paginado de uma listagem. */
export interface Paginado<T> {
  itens: T[];
  total: number;
  pagina: number;
  porPagina: number;
}
