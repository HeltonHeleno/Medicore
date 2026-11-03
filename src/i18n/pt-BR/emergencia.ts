/**
 * Textos da Emergência (D16). Importado só pelas páginas e serviços do módulo.
 */
import type {
  CampoSinal,
  CorRisco,
  ModoChegada,
  StatusAtendimento,
  TipoDesfecho,
  TipoEventoAtendimento,
} from '../../types';

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

export const te = {
  titulo: 'Emergência',
  abas: { fila: 'Fila', alertas: 'Alertas', historico: 'Histórico' },
  registrarChegada: 'Registrar chegada',
  emergenciaImediata: 'Emergência imediata (vermelho)',
  confirmarEmergenciaImediata:
    'O paciente vai direto para atendimento médico, sem triagem. Confirmar?',
  semIdentificacao: 'Sem identificação',
  avisoEscopo:
    'Classificação feita pelo profissional. A sinalização dos sinais vitais é só um apoio visual, não um diagnóstico.',

  cores: {
    vermelho: 'Vermelho',
    laranja: 'Laranja',
    amarelo: 'Amarelo',
    verde: 'Verde',
    azul: 'Azul',
  } satisfies Record<CorRisco, string>,

  significados: {
    vermelho: 'emergência',
    laranja: 'muito urgente',
    amarelo: 'urgente',
    verde: 'pouco urgente',
    azul: 'não urgente',
  } satisfies Record<CorRisco, string>,

  corPorExtenso: (cor: CorRisco) => `${te.cores[cor]} — ${te.significados[cor]}`,

  status: {
    aguardando_triagem: 'Aguardando triagem',
    aguardando_atendimento: 'Aguardando atendimento',
    em_atendimento: 'Em atendimento',
    em_observacao: 'Em observação',
    aguardando_leito: 'Aguardando leito',
    encerrado: 'Encerrado',
  } satisfies Record<StatusAtendimento, string>,

  modosChegada: {
    meios_proprios: 'Meios próprios',
    ambulancia: 'Ambulância',
    samu: 'SAMU',
    bombeiros: 'Bombeiros',
    policia: 'Polícia',
  } satisfies Record<ModoChegada, string>,

  queixasSugeridas: ['Dor torácica', 'Falta de ar', 'Febre', 'Trauma', 'Dor abdominal'],

  desfechos: {
    alta: 'alta',
    internacao: 'internação',
    transferencia: 'transferência',
    obito: 'óbito',
    evasao: 'evasão',
  } satisfies Record<TipoDesfecho, string>,

  eventos: {
    chegada: 'Chegada',
    triagem: 'Triagem',
    reavaliacao: 'Reavaliação',
    chamado: 'Chamado para atendimento',
    observacao: 'Observação',
    retomado: 'Atendimento retomado',
    leito_solicitado: 'Leito solicitado',
    solicitacao_cancelada: 'Pedido de leito cancelado',
    vinculado: 'Paciente identificado',
    desfecho: 'Encerramento',
    reaberto: 'Atendimento reaberto',
  } satisfies Record<TipoEventoAtendimento, string>,

  sinais: {
    pas: 'Pressão sistólica (mmHg)',
    pad: 'Pressão diastólica (mmHg)',
    fc: 'Frequência cardíaca (bpm)',
    fr: 'Frequência respiratória (irpm)',
    temperatura: 'Temperatura (°C)',
    spo2: 'Saturação de O₂ (%)',
    dor: 'Dor (0 a 10)',
    glicemia: 'Glicemia (mg/dL)',
  } satisfies Record<CampoSinal, string>,
  peso: 'Peso (kg)',

  /** Sinalização de alerta (texto, nunca só cor). */
  alertaSinal: {
    abaixo: (valor: string) => `Atenção: abaixo de ${valor}`,
    acima: (valor: string) => `Atenção: acima de ${valor}`,
    aPartirDe: (valor: string) => `Atenção: ${valor} ou mais`,
    faixaAdulto: 'Sem idade informada: usando a faixa de adulto',
  },

  /** Mensagens das regras verificadas pelo serviço (R-E). */
  regras: {
    semIdentificacao: 'Informe o paciente ou a identificação provisória.',
    chegadaFutura: 'A chegada não pode estar no futuro.',
    chegadaAntiga: (horas: number) => `A chegada pode ser registrada até ${horas} h depois.`,
    atendimentoEncerrado: 'Este atendimento já foi encerrado.',
    transicao: (de: string) => `Ação não disponível para um atendimento "${de}".`,
    exigeCadastro: 'Para pedir leito, identifique o paciente com um cadastro (E7).',
    justificativaRetriagem: 'Explique por que a classificação ficou menos grave.',
    evasaoCedo: (min: number) => `A evasão só pode ser registrada depois de ${min} min.`,
    leitoNaoObservacao: 'Escolha um leito do setor Observação.',
    desfechoNaoPermitido: 'Este encerramento não está disponível na situação atual.',
    reabrirInternacao:
      'Atendimento encerrado por internação: desfaça a alta na internação, se for o caso.',
    jaVinculado: 'Este atendimento já está ligado a um cadastro.',
    leitoObservacaoOcupado: 'O leito de observação foi ocupado. Escolha outro leito.',
  },

  avisos: {
    chegadaRegistrada: (numero: string) => `Chegada registrada: ${numero}`,
    triagemRegistrada: (cor: string, prazo: string) => `Triagem registrada: ${cor} (até ${prazo})`,
    encerrado: (numero: string, desfecho: string) => `Atendimento ${numero} encerrado: ${desfecho}`,
    acimaDoPrazo: (min: number) => `Acima do prazo (+${min} min)`,
    ate: (hora: string) => `até ${hora}`,
    aguardandoLeitoHa: (tempo: string) => `Aguardando leito há ${tempo}`,
    leitoReservado: (leito: string) => `Leito ${leito} reservado`,
    novoNaFila: (cor: string, numero: string) => `Novo paciente na fila: ${cor}, ${numero}`,
    atendimentosHoje: (n: number) => plural(n, '1 atendimento hoje', `${n} atendimentos hoje`),
  },

  /** A12 */
  alertas: {
    vermelhoAguardando: 'Emergência — aguardando médico',
    acimaDoPrazo: (cor: string, min: number) => `Acima do prazo (${cor}, +${min} min)`,
    semTriagem: (min: number) => `Sem triagem há ${min} min`,
    observacaoLonga: (leito: string) => `Observação acima de 24 h: ${leito}`,
    sinaisAtencao: (sinais: string) => `Sinais vitais de atenção: ${sinais}`,
    aguardandoLeito: (tempo: string) => `Aguardando leito há ${tempo}`,
    utiOcupacao: (p: number) => `UTI com ${p}% de ocupação`,
    higienizacaoAtrasada: (leito: string) => `Higienização atrasada: ${leito}`,
    reservaLonga: (tempo: string, leito: string) => `Reserva há ${tempo}: ${leito}`,
    localEmergencia: 'Emergência',
  },
};
