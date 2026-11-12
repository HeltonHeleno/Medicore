/**
 * Nomes das coleções dos módulos operacionais, num arquivo à parte e sem dependências:
 * o Painel (pacote inicial) assina essas coleções sem carregar os repositórios, os dados
 * de exemplo nem os serviços dos módulos (D20, RS-12).
 */
export const NOMES_OPERACOES = {
  leitos: 'leitos',
  internacoes: 'internacoes',
  solicitacoes: 'solicitacoes_leito',
  atendimentos: 'atendimentos',
  medicamentos: 'medicamentos',
  lotes: 'lotes',
  movimentacoes: 'movimentacoes',
  dispensacoes: 'dispensacoes',
  resumos: 'resumos_mensais',
} as const;
