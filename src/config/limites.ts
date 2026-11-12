/** Desempenho a partir do qual a barra do departamento fica vermelha (sobrecarga). */
export const LIMITE_ALERTA_DEPARTAMENTO = 90;

/**
 * Fuso do hospital. Todas as datas "do dia" e horários exibidos usam este fuso,
 * independentemente do fuso configurado no computador de quem usa o sistema.
 */
export const FUSO_HOSPITAL = 'America/Sao_Paulo';

/** R-C8: antecedência máxima para agendar uma consulta. */
export const ANTECEDENCIA_MAX_DIAS = 180;

/** R-C1: tolerância para considerar um horário "no passado". */
export const TOLERANCIA_PASSADO_MIN = 5;

/** A5: quantos dias à frente procurar o próximo dia com horário livre. */
export const BUSCA_PROXIMO_DIA_MAX = 60;

/** R-C9: limites de duração de uma consulta (em minutos, múltiplos de 5). */
export const DURACAO_MIN = 5;
export const DURACAO_MAX = 120;

/** Durações padrão aceitas na disponibilidade do médico. */
export const DURACOES_PADRAO = [15, 20, 30, 45, 60] as const;

/** Itens por página nas listas. */
export const POR_PAGINA = 10;

/** Quantidade máxima de atividades guardadas para a linha do tempo do Painel. */
export const MAX_ATIVIDADES = 200;

/** Limite de referência do localStorage (~5 MB em UTF-16). */
export const LIMITE_ARMAZENAMENTO_BYTES = 5 * 1024 * 1024;

/** Fração do limite a partir da qual o usuário é avisado. */
export const ALERTA_ARMAZENAMENTO = 0.8;

// ───────────────────────── Módulos operacionais (Fase 15) ─────────────────────────

/** R-E3: tempo-alvo até o atendimento médico, por cor (minutos). */
export const TEMPO_ALVO_MIN = {
  vermelho: 0,
  laranja: 10,
  amarelo: 60,
  verde: 120,
  azul: 240,
} as const;

/** R-L9: reserva de leito em destaque depois deste tempo (horas). */
export const RESERVA_DESTAQUE_H = 2;
/** R-L13 / L4: tempo de referência da higienização (minutos). Passou do dobro: alerta. */
export const HIGIENIZACAO_REF_MIN = { terminal: 60, isolamento: 90 } as const;
/** A12: aguardando leito há mais deste tempo gera alerta (horas). */
export const AGUARDANDO_LEITO_ALERTA_H = 4;
/** R-E13: aguardando triagem há mais deste tempo gera alerta (minutos). */
export const SEM_TRIAGEM_ALERTA_MIN = 15;
/** R-E13: em observação há mais deste tempo gera alerta (horas). */
export const OBSERVACAO_ALERTA_H = 24;
/** R-E11: evasão só depois deste tempo sem resposta (minutos). */
export const EVASAO_MIN = 30;
/** R-F6: lote "vencendo" quando a validade está a até N dias. */
export const VENCENDO_DIAS = 60;
/** R-F2: validade curta na entrada (aviso, não erro). */
export const VALIDADE_CURTA_DIAS = 30;
/** A12: ocupação da UTI a partir da qual há alerta (%). */
export const UTI_ALERTA_OCUPACAO = 90;
/** L1: início da internação pode ser retroativo até N horas. */
export const INTERNACAO_RETROATIVA_H = 24;
/** E1: chegada pode ser registrada até N horas depois. */
export const CHEGADA_RETROATIVA_H = 2;
/** L9: data prevista da internação eletiva até N dias à frente. */
export const ELETIVA_MAX_DIAS = 30;
/** F3: itens por dispensação. */
export const MAX_ITENS_DISPENSACAO = 10;
/** R-F14: quantidade por item acima da qual há confirmação. */
export const LIMITE_CONFIRMACAO_QUANTIDADE = 60;
/** E8 / A13: janela da espera média por cor (horas). */
export const JANELA_ESPERA_MEDIA_H = 24;

/** D19: janelas de correção (horas). */
export const JANELAS_CORRECAO_H = {
  alta: 6,
  atendimento: 2,
  dispensacao: 24,
} as const;

/**
 * D15: retenção (dias) e teto por coleção. Itens mais antigos são somados nos resumos
 * mensais e removidos (A15); os ainda referenciados viram registros arquivados.
 */
export const RETENCAO_DIAS = {
  internacoes: 30,
  solicitacoes_leito: 7,
  atendimentos: 7,
  /** Lotes zerados há mais de N dias saem. */
  lotes: 90,
  movimentacoes: 60,
  dispensacoes: 30,
  /** Meses. */
  resumos_mensais: 24,
} as const;

/**
 * Tetos revistos na Fase 21 (21.4.2): com os tamanhos medidos (atendimento ~2,3 KB,
 * dispensação ~1,2 KB, internação ~1,3 KB em UTF-16), os tetos originais somavam 5,2 MB e o
 * cenário da D15 (600 pacientes + 2.000 consultas + módulos no teto) passava de 148% do limite.
 * Com estes, o pior caso fica em ~74%. As retenções em dias não mudaram: o teto só age no uso
 * intenso, removendo primeiro os itens fechados mais antigos (já somados nos resumos).
 * Medicamentos e lotes não são cortados pela retenção (catálogo e lotes com saldo); os tetos
 * deles são o volume de referência do cenário de carga.
 */
export const TETO_COLECAO = {
  leitos: 130,
  internacoes: 200,
  solicitacoes_leito: 50,
  atendimentos: 120,
  medicamentos: 150,
  lotes: 350,
  movimentacoes: 800,
  dispensacoes: 200,
  resumos_mensais: 24,
} as const;
