/**
 * Textos da Gestão de leitos (D16). Importado só pelas páginas e serviços do módulo,
 * para não entrar no pacote inicial (verificado por `npm run pacote:medir`).
 */
import type {
  MotivoIncompatibilidade,
  OrigemInternacao,
  PerfilLeito,
  Precaucao,
  StatusLeito,
  StatusSolicitacao,
  TipoAlta,
  TipoEventoInternacao,
  TipoHigienizacao,
} from '../../types';

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

export const tl = {
  titulo: 'Gestão de leitos',
  abas: { mapa: 'Mapa', internacoes: 'Internações' },
  internarPaciente: 'Internar paciente',
  internarNesteLeito: 'Internar neste leito',

  status: {
    livre: 'Livre',
    ocupado: 'Ocupado',
    reservado: 'Reservado',
    higienizacao: 'Em higienização',
    bloqueado: 'Bloqueado',
  } satisfies Record<StatusLeito, string>,

  perfis: { adulto: 'Adulto', pediatrico: 'Pediátrico' } satisfies Record<PerfilLeito, string>,

  precaucoes: {
    padrao: 'Padrão',
    contato: 'Contato',
    goticulas: 'Gotículas',
    aerossois: 'Aerossóis',
  } satisfies Record<Precaucao, string>,

  higienizacao: {
    terminal: 'Higienização terminal',
    isolamento: 'Higienização de isolamento',
  } satisfies Record<TipoHigienizacao, string>,

  origens: {
    emergencia: 'Emergência',
    eletiva: 'Eletiva',
    transferencia_externa: 'Transferência de outro hospital',
  } satisfies Record<OrigemInternacao, string>,

  tiposAlta: {
    melhorada: 'melhorada',
    a_pedido: 'a pedido',
    transferencia: 'transferência para outro hospital',
    obito: 'óbito',
  } satisfies Record<TipoAlta, string>,

  statusSolicitacao: {
    pendente: 'Pendente',
    reservada: 'Leito reservado',
    atendida: 'Atendida',
    cancelada: 'Cancelada',
  } satisfies Record<StatusSolicitacao, string>,

  eventos: {
    internada: 'Internação',
    transferida: 'Transferência',
    responsavel_alterado: 'Médico responsável alterado',
    previsao_alterada: 'Previsão de alta alterada',
    precaucao_alterada: 'Precaução alterada',
    motivo_alterado: 'Motivo alterado',
    alta: 'Alta',
    alta_desfeita: 'Alta desfeita',
  } satisfies Record<TipoEventoInternacao, string>,

  incompatibilidade: {
    situacao: 'Leito não está livre',
    perfil: 'Perfil do leito diferente da idade do paciente',
    isolamento: 'Leito sem isolamento',
    setor: 'Fora do setor desejado',
  } satisfies Record<MotivoIncompatibilidade, string>,

  motivosTransferencia: [
    'Piora clínica (UTI)',
    'Melhora (sai da UTI)',
    'Isolamento',
    'Pedido do paciente',
  ],
  motivosBloqueio: ['Manutenção', 'Equipamento com defeito', 'Reforma'],

  /** Mensagens das regras verificadas pelo serviço (R-L). */
  regras: {
    leitoNaoLivre: 'O leito escolhido não está livre.',
    leitoReservadoOutra: 'Este leito está reservado para outro pedido.',
    perfilIncompativel:
      'O perfil do leito não combina com a idade do paciente. Para usar mesmo assim, escreva a justificativa.',
    semIsolamento:
      'A precaução exige leito de isolamento. Para usar mesmo assim, escreva a justificativa.',
    observacaoSoEmergencia: 'Leitos de observação são usados só pela emergência.',
    internacaoEncerrada: 'Esta internação já foi encerrada.',
    internacaoAtiva: 'Esta internação ainda está ativa.',
    emAtendimentoUsePedido:
      'O paciente está em atendimento na emergência: interne pelo pedido de leito do atendimento.',
    inicioFuturo: 'O início não pode estar no futuro.',
    inicioMuitoAntigo: (horas: number) => `O início pode ser no máximo ${horas} h antes de agora.`,
    altaAntesInicio: 'A alta não pode ser antes do início da internação.',
    altaFutura: 'A alta não pode estar no futuro.',
    previsaoAntesInicio: 'A previsão de alta não pode ser antes do início.',
    bloquearSoLivre: 'Só é possível bloquear um leito livre ou em higienização.',
    leitoOriginalOcupado:
      'O leito original já foi ocupado. Transfira o paciente para outro leito com "Internar novamente".',
    mesmoLeito: 'Escolha um leito diferente do atual.',
    solicitacaoFechada: 'Este pedido de leito não está mais em aberto.',
    precaucaoSemIsolamento:
      'O leito atual não tem isolamento. Transfira o paciente ou escreva a justificativa.',
    dataPrevistaInvalida: (dias: number) => `A data prevista deve ser de hoje até ${dias} dias.`,
  },

  /** Textos usados na tela e nos avisos (Fase 17). */
  avisos: {
    internado: (nome: string, leito: string) => `${nome} internado(a) no leito ${leito}`,
    transferido: (de: string, para: string) => `Transferido de ${de} para ${para}`,
    altaRegistrada: (leito: string) => `Alta registrada. Leito ${leito} em higienização`,
    altaDesfeita: 'Alta desfeita. O paciente voltou ao leito.',
    podeDesfazerAte: (hora: string) => `Pode ser desfeita até ${hora}`,
    higienizacaoConcluida: (n: number) => plural(n, '1 leito liberado', `${n} leitos liberados`),
    leitosQueMudaram: (n: number) =>
      plural(
        n,
        '1 leito mudou de situação e foi ignorado',
        `${n} leitos mudaram de situação e foram ignorados`,
      ),
    previsaoLeitos: (n: number) => `Previsão: +${n} ${plural(n, 'leito', 'leitos')} em 24 h`,
    diaInternacao: (n: number) => `Dia ${n} de internação`,
    permanencia: (n: number) => `Permanência: ${n} ${plural(n, 'dia', 'dias')}`,
    altaPrevistaVencida: 'Alta prevista vencida',
    altaPrevistaHoje: 'Alta prevista para hoje',
    liberacaoVencida: 'Liberação prevista vencida',
    consultasDuranteInternacao: (n: number) =>
      plural(
        n,
        '1 consulta agendada durante a internação',
        `${n} consultas agendadas durante a internação`,
      ),
    registroArquivado: 'Registro arquivado',
  },
};
