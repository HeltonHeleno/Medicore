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
