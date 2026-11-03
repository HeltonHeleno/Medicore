/**
 * Textos da Farmácia (D16). Importado só pelas páginas e serviços do módulo.
 */
import type {
  FormaFarmaceutica,
  SituacaoEstoque,
  TipoMovimentacao,
  UnidadeDispensacao,
} from '../../types';

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

export const tf = {
  titulo: 'Farmácia',
  abas: { estoque: 'Estoque', movimentacoes: 'Movimentações', vencimentos: 'Vencimentos' },
  livroControlados: 'Livro de controlados',
  unidadesPorEmbalagem: 'Unidades por embalagem',
  avisoAlergia: 'Verificação por texto; confira sempre a prescrição.',
  alergiasNaoInformadas: 'Alergias não informadas — confirme com a equipe',
  conferiReceita: 'Conferi a receita/prescrição',
  avisoEscopo: 'A dispensação registra o que saiu, para quem e a pedido de quem. Não é prescrição.',

  formas: {
    comprimido: 'Comprimido',
    capsula: 'Cápsula',
    solucao_oral: 'Solução oral',
    solucao_injetavel: 'Solução injetável',
    po_injetavel: 'Pó para solução injetável',
    pomada: 'Pomada',
    outro: 'Outro',
  } satisfies Record<FormaFarmaceutica, string>,

  /** Nome da unidade no plural, para "60 comprimidos". */
  unidades: {
    comprimido: (n: number) => plural(n, 'comprimido', 'comprimidos'),
    capsula: (n: number) => plural(n, 'cápsula', 'cápsulas'),
    ampola: (n: number) => plural(n, 'ampola', 'ampolas'),
    frasco: (n: number) => plural(n, 'frasco', 'frascos'),
    bisnaga: (n: number) => plural(n, 'bisnaga', 'bisnagas'),
    unidade: (n: number) => plural(n, 'unidade', 'unidades'),
  } satisfies Record<UnidadeDispensacao, (n: number) => string>,

  situacoes: {
    ok: 'OK',
    baixo: 'Baixo',
    zerado: 'Zerado',
  } satisfies Record<SituacaoEstoque, string>,
  vencendo: 'Vencendo',
  vencido: 'Vencido',
  bloqueado: 'Bloqueado',

  movimentacoes: {
    entrada: 'Entrada',
    dispensacao: 'Dispensação',
    devolucao: 'Devolução',
    ajuste_positivo: 'Ajuste positivo',
    ajuste_negativo: 'Ajuste negativo',
    perda: 'Perda/avaria',
    descarte_vencido: 'Descarte de vencido',
  } satisfies Record<TipoMovimentacao, string>,

  motivosDevolucao: ['Não utilizado', 'Alta', 'Suspenso pelo médico'],
  motivosEstorno: ['Registro em paciente errado', 'Medicamento errado', 'Duplicidade'],
  motivosBloqueioLote: ['Quarentena', 'Recolhimento', 'Suspeita de desvio de qualidade'],

  /** Mensagens das regras verificadas pelo serviço (R-F). */
  regras: {
    medicamentoDuplicado: 'Já existe um medicamento com este nome, concentração e forma.',
    medicamentoInativo: 'Este medicamento foi inativado.',
    unidadeTravada: 'A unidade não pode mudar depois da primeira movimentação.',
    inativarComSaldo: (n: number) =>
      plural(
        n,
        'Não é possível inativar: há 1 lote com saldo. Descarte ou ajuste antes.',
        `Não é possível inativar: há ${n} lotes com saldo. Descarte ou ajuste antes.`,
      ),
    alergiaSemJustificativa: 'Possível alergia: marque "Ciente" e escreva a justificativa.',
    controladoSemConfirmacao: 'Medicamento controlado: confirme a conferência da receita.',
    quantidadeAltaSemConfirmacao: 'Quantidade alta: confirme para evitar erro de digitação.',
    devolucaoAcimaDoSaldo: (n: number) => `Só é possível devolver até ${n}.`,
    estornoComDevolucao: 'Esta dispensação já teve devolução. Use a devolução para o restante.',
    estornada: 'Esta dispensação foi estornada.',
    loteBloqueado: 'Este lote está bloqueado.',
    loteNaoBloqueado: 'Este lote não está bloqueado.',
    loteNaoVencido: 'Só lotes vencidos podem ser descartados aqui.',
    termoObrigatorio: 'Informe o número do termo de descarte (medicamento controlado).',
    medicoInativo: 'O médico solicitante foi inativado.',
    itemRepetido: 'O mesmo medicamento aparece duas vezes: una as linhas.',
    saldoNegativo: 'O saldo do lote não pode ficar negativo.',
    validadeCurta: (dias: number) =>
      `A validade é menor que ${dias} dias. Confirme para registrar mesmo assim.`,
    loteExistente: (numero: string) =>
      `O lote ${numero} já existe com a mesma validade. Marque "Somar ao lote existente".`,
    semUnidadesPorEmbalagem:
      'Este medicamento não tem "unidades por embalagem": informe a quantidade em unidades.',
    motivoControladoCurto:
      'Medicamento controlado: descreva o motivo com pelo menos 10 caracteres.',
    destinoSemAtendimento:
      'O paciente precisa estar internado ou com atendimento aberto na emergência.',
  },

  avisos: {
    entradaRegistrada: (qtd: string, medicamento: string, lote: string) =>
      `Entrada registrada: ${qtd} de ${medicamento} (lote ${lote})`,
    dispensacaoRegistrada: (n: number) =>
      plural(n, 'Dispensação registrada (1 item)', `Dispensação registrada (${n} itens)`),
    devolucaoRegistrada: (qtd: string) => `Devolução registrada (${qtd})`,
    lotesDescartados: (n: number, unidades: number) =>
      `${plural(n, '1 lote descartado', `${n} lotes descartados`)} (${unidades} ${plural(unidades, 'unidade', 'unidades')})`,
    conversao: (embalagens: number, porEmbalagem: number, total: string) =>
      `${embalagens} × ${porEmbalagem} = ${total}`,
    prevista: (qtd: number, lote: string, validade: string) =>
      `${qtd} do lote ${lote} (vence ${validade})`,
    possivelAlergia: (termo: string, campo: string) => `Possível alergia: "${termo}" × ${campo}`,
    motivoEstorno: (motivo: string) => `Estorno: ${motivo}`,
    motivoDevolucaoVencido: 'Devolução de lote vencido',
    motivoDevolucaoBloqueado: 'Devolução de lote bloqueado',
  },

  camposAlergia: {
    principioAtivo: 'princípio ativo',
    classe: 'classe',
    nome: 'nome',
  },
};
