/**
 * Algoritmos de agenda (A1, A2, A3, A5) e transições de status (R-S1–R-S3).
 * Funções puras: recebem tudo por parâmetro (inclusive "agora"), o que facilita testar.
 */
import { BUSCA_PROXIMO_DIA_MAX, TOLERANCIA_PASSADO_MIN } from '../config/limites';
import type {
  Disponibilidade,
  HorarioAgenda,
  MotivoHorarioIndisponivel,
  StatusConsulta,
} from '../types';
import {
  dataDoInstante,
  diaDaSemana,
  horaDoInstante,
  horaDosMinutos,
  instanteNoFuso,
  minutosDaHora,
  somarDias,
  type DataIso,
} from './datas';

/** Intervalo em milissegundos desde a época, semiaberto: [inicio, fim). */
export interface Intervalo {
  inicio: number;
  fim: number;
}

/** A2: dois intervalos semiabertos se sobrepõem? 10:00–10:30 e 10:30–11:00 NÃO se sobrepõem. */
export const sobrepoe = (a: Intervalo, b: Intervalo): boolean =>
  a.inicio < b.fim && b.inicio < a.fim;

export const intervaloDe = (inicioIso: string, duracaoMin: number): Intervalo => {
  const inicio = new Date(inicioIso).getTime();
  return { inicio, fim: inicio + duracaoMin * 60000 };
};

/** O médico atende nesta data (dia da semana)? */
export const atendeNoDia = (d: Disponibilidade, data: DataIso): boolean =>
  (d.diasSemana as number[]).includes(diaDaSemana(data));

/** Faixa [início, fim) em minutos de parede cruza a pausa? */
function cruzaPausa(d: Disponibilidade, iniMin: number, fimMin: number): boolean {
  if (!d.pausa) return false;
  const p = { inicio: minutosDaHora(d.pausa.inicio), fim: minutosDaHora(d.pausa.fim) };
  return sobrepoe({ inicio: iniMin, fim: fimMin }, p);
}

export interface ParametrosHorarios {
  disponibilidade: Disponibilidade;
  data: DataIso;
  duracaoMin: number;
  /** Consultas agendadas do médico (já sem a consulta sendo reagendada). */
  ocupacoesMedico: Intervalo[];
  /** Consultas agendadas do paciente, se já escolhido. */
  ocupacoesPaciente?: Intervalo[];
  agora: Date;
}

/**
 * A1: todos os horários do expediente no dia, com o motivo de cada indisponível.
 * A grade avança de `duracaoPadraoMin` em `duracaoPadraoMin`; a consulta pode ser mais longa.
 */
export function gerarHorarios(p: ParametrosHorarios): HorarioAgenda[] {
  const d = p.disponibilidade;
  if (!atendeNoDia(d, p.data)) return [];

  const inicioExp = minutosDaHora(d.inicio);
  const fimExp = minutosDaHora(d.fim);
  const limitePassado = p.agora.getTime() - TOLERANCIA_PASSADO_MIN * 60000;
  const horarios: HorarioAgenda[] = [];

  for (let t = inicioExp; t < fimExp; t += d.duracaoPadraoMin) {
    const hora = horaDosMinutos(t);
    const inicio = instanteNoFuso(p.data, hora);
    const intervalo = { inicio: inicio.getTime(), fim: inicio.getTime() + p.duracaoMin * 60000 };

    let motivo: MotivoHorarioIndisponivel | undefined;
    if (t + p.duracaoMin > fimExp) motivo = 'fora_expediente';
    else if (cruzaPausa(d, t, t + p.duracaoMin)) motivo = 'pausa';
    else if (intervalo.inicio < limitePassado) motivo = 'passado';
    else if (p.ocupacoesMedico.some((o) => sobrepoe(o, intervalo))) motivo = 'medico_ocupado';
    else if (p.ocupacoesPaciente?.some((o) => sobrepoe(o, intervalo))) motivo = 'paciente_ocupado';

    horarios.push({ hora, inicio: inicio.toISOString(), livre: !motivo, motivo });
  }
  return horarios;
}

/**
 * R-C2: a consulta [inicio, inicio+duração) cabe na disponibilidade?
 * Devolve o motivo se não couber.
 */
export function motivoForaDaDisponibilidade(
  d: Disponibilidade,
  inicioIso: string,
  duracaoMin: number,
): 'fora_expediente' | 'pausa' | null {
  const data = dataDoInstante(inicioIso);
  if (!atendeNoDia(d, data)) return 'fora_expediente';
  const ini = minutosDaHora(horaDoInstante(inicioIso));
  const fim = ini + duracaoMin;
  if (ini < minutosDaHora(d.inicio) || fim > minutosDaHora(d.fim)) return 'fora_expediente';
  if (cruzaPausa(d, ini, fim)) return 'pausa';
  return null;
}

/** A3: quais consultas deixariam de caber numa nova disponibilidade. */
export function consultasForaDaDisponibilidade<T extends { inicio: string; duracaoMin: number }>(
  d: Disponibilidade,
  consultas: readonly T[],
): T[] {
  return consultas.filter((c) => motivoForaDaDisponibilidade(d, c.inicio, c.duracaoMin) !== null);
}

/**
 * A5: próximo dia (a partir de `data + 1`) em que `temHorarioLivre(dia)` é verdadeiro,
 * procurando até `max` dias. `null` se não houver.
 */
export function proximoDiaLivre(
  data: DataIso,
  temHorarioLivre: (dia: DataIso) => boolean,
  max = BUSCA_PROXIMO_DIA_MAX,
): DataIso | null {
  for (let i = 1; i <= max; i++) {
    const dia = somarDias(data, i);
    if (temHorarioLivre(dia)) return dia;
  }
  return null;
}

/**
 * R-S1–R-S3: transições permitidas.
 * - Só `agendada` muda de status.
 * - `concluida` e `faltou` só a partir do início.
 * - `cancelada` a qualquer momento.
 */
export function podeTransitar(
  atual: StatusConsulta,
  novo: StatusConsulta,
  agora: Date,
  inicioIso: string,
): boolean {
  if (atual !== 'agendada') return false;
  if (novo === 'cancelada') return true;
  if (novo === 'concluida' || novo === 'faltou')
    return agora.getTime() >= new Date(inicioIso).getTime();
  return false;
}

/** R-C7: agendada e já terminou sem registro. */
export const estaAtrasada = (status: StatusConsulta, fimIso: string, agora: Date): boolean =>
  status === 'agendada' && new Date(fimIso).getTime() < agora.getTime();
