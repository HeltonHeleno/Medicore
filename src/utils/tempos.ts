/**
 * Tempos dos módulos operacionais (seção "Tempos, prazos e relógio").
 * Sempre calculados a partir de instantes gravados e de `agora()`, nunca acumulados (RS-14).
 */
import { t } from '../i18n/pt-BR';
import { dataDoInstante, diferencaDias, hojeNoFuso, horaDoInstante } from './datas';
import { agora } from './relogio';

const MIN = 60_000;
const HORA = 3_600_000;

const ms = (instante: Date | string) =>
  typeof instante === 'string' ? new Date(instante).getTime() : instante.getTime();

/** Minutos inteiros de `de` até `ate` (padrão: agora); nunca negativo. */
export function minutosDesde(de: Date | string, ate: Date | string = agora()): number {
  return Math.max(0, Math.floor((ms(ate) - ms(de)) / MIN));
}

/** "12 min", "1 h 05 min", "2 dias". */
export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return t.tempo.minutos(minutos);
  if (minutos < 48 * 60) return t.tempo.horasMinutos(Math.floor(minutos / 60), minutos % 60);
  return t.tempo.dias(Math.floor(minutos / (24 * 60)));
}

/** "há 12 min", "há 1 h 05 min". */
export const formatarEspera = (minutos: number): string => t.tempo.ha(formatarDuracao(minutos));

/** "até 10:28" (hora no fuso do hospital). */
export const formatarPrazo = (prazo: Date | string): string => t.tempo.ate(horaDoInstante(prazo));

/** Minutos além do prazo (0 se ainda não passou). */
export const excessoMin = (prazo: Date | string, momento: Date | string = agora()): number =>
  minutosDesde(prazo, momento);

/** Dia de internação: o dia da entrada é o dia 1 (no fuso do hospital). */
export function diaDeInternacao(inicio: string, referencia: Date | string = agora()): number {
  return diferencaDias(dataDoInstante(inicio), dataDoInstante(referencia)) + 1;
}

/** Permanência em dias: até a alta ou até hoje (dia da entrada = 1). */
export const permanencia = (inicio: string, fim?: string): number =>
  diaDeInternacao(inicio, fim ?? agora());

/** Dias de hoje até a validade (negativo se já venceu). */
export const diasParaVencer = (validade: string, hoje: string = hojeNoFuso()): number =>
  diferencaDias(hoje, validade);

/** R-F1: vence no fim do dia da validade (vencendo hoje ainda pode ser usado). */
export const estaVencido = (validade: string, hoje: string = hojeNoFuso()): boolean =>
  validade < hoje;

/** "Vence hoje", "Vence em 12 dias", "Venceu há 3 dias". */
export function textoValidade(validade: string, hoje: string = hojeNoFuso()): string {
  const d = diasParaVencer(validade, hoje);
  if (d === 0) return t.tempo.venceHoje;
  return d > 0 ? t.tempo.venceEm(d) : t.tempo.venceuHa(-d);
}

/** D19: fim da janela de correção (ISO). */
export const limiteDaJanela = (registradoEm: string, horas: number): string =>
  new Date(ms(registradoEm) + horas * HORA).toISOString();

/** D19: ainda dentro da janela de correção? */
export const dentroDaJanela = (
  registradoEm: string,
  horas: number,
  momento: Date | string = agora(),
): boolean => ms(momento) <= ms(registradoEm) + horas * HORA;
