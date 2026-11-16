/**
 * Textos da seção "Módulos operacionais" da vitrine `/ui` (16.11). A vitrine só existe em
 * desenvolvimento; por isso estes textos ficam fora do `pt-BR.ts` (pacote inicial).
 */
export const tvo = {
  titulo: 'Módulos operacionais',
  descricao:
    'Componentes compartilhados de Gestão de leitos, Emergência e Farmácia, em todos os estados. Confira também em escala de cinza: cada estado tem texto e ícone, não só cor.',
  abas: 'Abas do módulo',
  abasRotulo: 'Seções de exemplo',
  resumo: 'Resumo de números',
  resumoRotulo: 'Resumo de exemplo',
  tempo: 'Tempo decorrido e prazo',
  tempoEspera: 'Espera',
  tempoPrazo: 'Prazo no futuro',
  tempoVencido: 'Prazo vencido',
  quantidade: 'Campo de quantidade',
  quantidadeRotulo: 'Quantidade (comprimidos)',
  linhaDoTempo: 'Linha do tempo',
  riscos: 'Classificação de risco',
  riscosExtenso: 'Por extenso',
  riscosTempoAlvo: 'Com o tempo-alvo',
  riscosCurto: 'Curto',
  leitos: 'Situação do leito',
  estoque: 'Situação do estoque e do lote',
  cartoes: 'Cartões de leito',
  seletor: 'Seletor de leito (com incompatíveis)',
  seletorEscolhido: (codigo: string) => `Escolhido: ${codigo || 'nenhum'}`,
  sinais: 'Sinais vitais com alerta',
  sinaisIdade: 'Idade do paciente',
  sinaisIdades: {
    adulto: 'Adulto (40 anos)',
    crianca: 'Criança (4 anos)',
    bebe: 'Bebê (8 meses)',
    semIdade: 'Sem idade',
  },
  alergia: 'Alerta de alergia na dispensação',
  paciente: 'Busca de paciente',
  pacienteRotulo: 'Paciente',
  pacienteFiltro: 'Paciente internado ou em atendimento',
};
