/**
 * Datas e horários no fuso do hospital (M3).
 *
 * Convenções:
 * - Data sem hora (nascimento, dia da agenda): texto `AAAA-MM-DD`. Nunca vira `Date` com hora,
 *   para não "voltar um dia" ao converter de fuso.
 * - Instante (início de consulta, criadoEm): ISO 8601 em UTC.
 * - Hora de parede (expediente): texto `HH:mm`.
 */
import { FUSO_HOSPITAL } from '../config/limites';
import { agora } from './relogio';

export type DataIso = string; // AAAA-MM-DD
export type HoraHHmm = string; // HH:mm

interface Partes {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
}

const formatadorPartes = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_HOSPITAL,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const pad = (n: number) => String(n).padStart(2, '0');

/** Partes de um instante pelo `Intl` (lento: usado só para preencher o cache abaixo). */
function partesPorIntl(d: Date): Partes {
  const p = Object.fromEntries(
    formatadorPartes.formatToParts(d).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return {
    ano: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: Number(p.hour),
    minuto: Number(p.minute),
  };
}

/**
 * Deslocamento do fuso (em ms) por bloco de 15 minutos. Trocas de horário acontecem em
 * horas cheias, então o deslocamento é o mesmo dentro de um bloco. O cache evita chamar
 * o `Intl` milhares de vezes ao filtrar a agenda (14.5: 3.000 consultas).
 */
const BLOCO_MS = 15 * 60_000;
const cacheDeslocamento = new Map<number, number>();

function deslocamentoMs(ms: number): number {
  const bloco = Math.floor(ms / BLOCO_MS);
  let deslocamento = cacheDeslocamento.get(bloco);
  if (deslocamento === undefined) {
    const inicio = bloco * BLOCO_MS;
    const p = partesPorIntl(new Date(inicio));
    deslocamento = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto) - inicio;
    if (cacheDeslocamento.size > 20_000) cacheDeslocamento.clear();
    cacheDeslocamento.set(bloco, deslocamento);
  }
  return deslocamento;
}

/** Ano, mês, dia, hora e minuto do instante no fuso do hospital. */
export function partesNoFuso(instante: Date | string): Partes {
  const ms = (typeof instante === 'string' ? new Date(instante) : instante).getTime();
  if (Number.isNaN(ms)) return partesPorIntl(new Date(ms)); // mantém o erro do Intl
  const local = new Date(ms + deslocamentoMs(ms));
  return {
    ano: local.getUTCFullYear(),
    mes: local.getUTCMonth() + 1,
    dia: local.getUTCDate(),
    hora: local.getUTCHours(),
    minuto: local.getUTCMinutes(),
  };
}

function lerData(data: DataIso): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = data.split('-').map(Number);
  return { ano, mes, dia };
}

function lerHora(hora: HoraHHmm): { h: number; m: number } {
  const [h, m] = hora.split(':').map(Number);
  return { h, m };
}

/** Diferença, em minutos, entre o fuso do hospital e UTC naquele instante (ex.: -180). */
function deslocamentoMin(instante: Date): number {
  const p = partesNoFuso(instante);
  const comoUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto);
  const semSegundos = Math.floor(instante.getTime() / 60000) * 60000;
  return Math.round((comoUtc - semSegundos) / 60000);
}

/** Data `AAAA-MM-DD` de um instante, no fuso do hospital. */
export function dataDoInstante(instante: Date | string): DataIso {
  const p = partesNoFuso(instante);
  return `${p.ano}-${pad(p.mes)}-${pad(p.dia)}`;
}

/** Hora `HH:mm` de um instante, no fuso do hospital. */
export function horaDoInstante(instante: Date | string): HoraHHmm {
  const p = partesNoFuso(instante);
  return `${pad(p.hora)}:${pad(p.minuto)}`;
}

/** Hoje (`AAAA-MM-DD`) no fuso do hospital. */
export function hojeNoFuso(): DataIso {
  return dataDoInstante(agora());
}

/**
 * Instante correspondente a uma data + hora "de parede" no fuso do hospital.
 * Calcula o deslocamento pelo `Intl` (não assume -03:00), então continua certo
 * se o horário de verão voltar a existir.
 */
export function instanteNoFuso(data: DataIso, hora: HoraHHmm): Date {
  const { ano, mes, dia } = lerData(data);
  const { h, m } = lerHora(hora);
  const comoUtc = Date.UTC(ano, mes - 1, dia, h, m);
  let resultado = comoUtc - deslocamentoMin(new Date(comoUtc)) * 60000;
  // Segunda passada: corrige se a primeira estimativa caiu do outro lado de uma troca de horário.
  resultado = comoUtc - deslocamentoMin(new Date(resultado)) * 60000;
  return new Date(resultado);
}

/** Dia da semana de uma data (0 = domingo … 6 = sábado). Puramente de calendário. */
export function diaDaSemana(data: DataIso): number {
  const { ano, mes, dia } = lerData(data);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

/** Soma (ou subtrai) dias de uma data `AAAA-MM-DD`. */
export function somarDias(data: DataIso, dias: number): DataIso {
  const { ano, mes, dia } = lerData(data);
  const d = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Quantidade de dias de `de` até `ate` (pode ser negativa). */
export function diferencaDias(de: DataIso, ate: DataIso): number {
  const a = lerData(de);
  const b = lerData(ate);
  return Math.round(
    (Date.UTC(b.ano, b.mes - 1, b.dia) - Date.UTC(a.ano, a.mes - 1, a.dia)) / 86_400_000,
  );
}

const ehBissexto = (ano: number) => (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;

/**
 * Idade completa em anos na data de referência (padrão: hoje no fuso do hospital).
 * Quem nasceu em 29/02 faz aniversário em 28/02 nos anos não bissextos.
 */
export function idade(dataNascimento: DataIso, referencia: DataIso = hojeNoFuso()): number {
  const n = lerData(dataNascimento);
  const r = lerData(referencia);
  const diaAniv = n.mes === 2 && n.dia === 29 && !ehBissexto(r.ano) ? 28 : n.dia;
  let anos = r.ano - n.ano;
  if (r.mes < n.mes || (r.mes === n.mes && r.dia < diaAniv)) anos -= 1;
  return anos;
}

/** `2026-10-26` → `26/10/2026` (sem passar por `Date`). */
export function formatarData(data: DataIso): string {
  const { ano, mes, dia } = lerData(data);
  return `${pad(dia)}/${pad(mes)}/${ano}`;
}

const formatadorExtenso = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const formatadorCurto = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});

/** `2026-10-26` → `segunda-feira, 26 de outubro`. */
export function formatarDataExtenso(data: DataIso): string {
  const { ano, mes, dia } = lerData(data);
  return formatadorExtenso.format(new Date(Date.UTC(ano, mes - 1, dia)));
}

/** `2026-10-29` → `qui., 29/10`. */
export function formatarDataCurta(data: DataIso): string {
  const { ano, mes, dia } = lerData(data);
  return formatadorCurto.format(new Date(Date.UTC(ano, mes - 1, dia)));
}

/** `dd/mm/aaaa` → `AAAA-MM-DD` (ou `null` se inválida). */
export function deDataBr(texto: string): DataIso | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const data = `${m[3]}-${m[2]}-${m[1]}`;
  return dataValida(data) ? data : null;
}

/** Verifica se `AAAA-MM-DD` é uma data de calendário real (ex.: rejeita 31/02). */
export function dataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const { ano, mes, dia } = lerData(data);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

/** `HH:mm` → minutos desde 00:00. */
export function minutosDaHora(hora: HoraHHmm): number {
  const { h, m } = lerHora(hora);
  return h * 60 + m;
}

/** Minutos desde 00:00 → `HH:mm`. */
export function horaDosMinutos(minutos: number): HoraHHmm {
  return `${pad(Math.floor(minutos / 60))}:${pad(minutos % 60)}`;
}

/** Soma minutos a um instante. */
export function somarMinutos(instante: Date | string, minutos: number): Date {
  const d = typeof instante === 'string' ? new Date(instante) : instante;
  return new Date(d.getTime() + minutos * 60000);
}

/** Instante ISO → `27/10/2026 · 14:00` no fuso do hospital. */
export function formatarDataHora(instante: Date | string): string {
  return `${formatarData(dataDoInstante(instante))} · ${horaDoInstante(instante)}`;
}
