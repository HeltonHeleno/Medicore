/**
 * Situação e histórico hospitalar nos cadastros (20.10, 20.11, R-X8). Fica fora do `pt-BR.ts`
 * porque só os detalhes de paciente e médico e o agendamento usam, e eles já são carregados
 * sob demanda.
 */
export const th = {
  /** 20.10: detalhe do paciente. */
  situacaoTitulo: 'Situação hospitalar',
  internadoNoLeito: (leito: string) => `Internado(a) no leito ${leito}`,
  emAtendimento: (numero: string) => `Em atendimento na emergência (${numero})`,
  desde: (quando: string) => `desde ${quando}`,
  pedidoDeLeito: 'Há um pedido de leito em aberto.',
  semSituacao: 'Não está internado(a) nem em atendimento na emergência.',
  verInternacao: 'Ver internação',
  verAtendimento: 'Ver atendimento',
  internar: 'Internar',
  registrarChegada: 'Registrar chegada na emergência',
  historicoTitulo: 'Histórico hospitalar',
  internacoes: 'Internações',
  atendimentos7: 'Atendimentos dos últimos 7 dias',
  dispensacoes30: 'Dispensações dos últimos 30 dias',
  semInternacoes: 'Nenhuma internação.',
  semAtendimentos: 'Nenhum atendimento nos últimos 7 dias.',
  semDispensacoes: 'Nenhuma dispensação nos últimos 30 dias.',
  leito: (codigo: string) => `Leito ${codigo}`,
  emCurso: 'em curso',
  alta: (tipo: string, quando: string) => `alta ${tipo} em ${quando}`,
  encerrado: (desfecho: string) => `encerrado: ${desfecho}`,
  itens: (n: number) => (n === 1 ? '1 item' : `${n} itens`),
  estornada: 'estornada',
  arquivado: 'registro arquivado',
  /** 20.11: detalhe do médico. */
  internacoesResponsavel: 'Internações sob responsabilidade',
  atendimentosEmCurso: 'Atendimentos em curso na emergência',
  semInternacoesMedico: 'Nenhuma internação ativa sob responsabilidade.',
  semAtendimentosMedico: 'Nenhum atendimento em curso.',
  chegadaAs: (quando: string) => `chegada ${quando}`,
  /** R-X8: aviso no agendamento. */
  pacienteInternadoAviso: (leito: string) => `Paciente internado em ${leito}`,
};
