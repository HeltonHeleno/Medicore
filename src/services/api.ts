/**
 * Serviço simulado. Cada função imita uma chamada à API real:
 * é assíncrona, tem latência e devolve cópias dos dados mockados.
 * Para integrar o backend, troque o corpo das funções por chamadas HTTP
 * mantendo as mesmas assinaturas.
 */
import {
  alertas,
  criarAtividadesHoje,
  criarConsultasHoje,
  departamentos,
  insights,
  internacoes,
  kpis,
  resumoDia,
  setoresLeitos,
  usuario,
} from '../data/mock';
import { t } from '../i18n/pt-BR';
import type {
  AlertaEmergencia,
  Atividade,
  Consulta,
  Departamento,
  Insight,
  Kpis,
  PeriodoInternacao,
  PontoInternacao,
  ResumoDia,
  SetorLeitos,
  Usuario,
} from '../types';

/** Latência simulada em ms. Zero nos testes para não atrasar a suíte. */
const LATENCIA_PADRAO = import.meta.env.MODE === 'test' ? 0 : 400;

/** Com VITE_SIMULAR_ERRO=true no .env.local, todas as chamadas falham. */
const SIMULAR_ERRO = import.meta.env.VITE_SIMULAR_ERRO === 'true';

export function delay(ms = LATENCIA_PADRAO): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function responder<T>(dados: T): Promise<T> {
  await delay();
  if (SIMULAR_ERRO) throw new Error(t.erro.simulado);
  return structuredClone(dados);
}

const ORDEM_PRIORIDADE = { alta: 0, media: 1, baixa: 2 } as const;

export const getUsuario = (): Promise<Usuario> => responder(usuario);

export const getKpis = (): Promise<Kpis> => responder(kpis);

export const getResumoDia = (): Promise<ResumoDia> => responder(resumoDia);

export const getLeitos = (): Promise<SetorLeitos[]> => responder(setoresLeitos);

export const getDepartamentos = (): Promise<Departamento[]> => responder(departamentos);

export const getInternacoes = (periodo: PeriodoInternacao): Promise<PontoInternacao[]> =>
  responder(internacoes[periodo]);

export const getInsights = (): Promise<Insight[]> => responder(insights);

/** Alertas ordenados por prioridade (alta primeiro). */
export const getAlertas = (): Promise<AlertaEmergencia[]> =>
  responder(
    [...alertas].sort((a, b) => ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade]),
  );

/** Consultas de hoje em ordem crescente de horário. */
export const getConsultasHoje = (): Promise<Consulta[]> =>
  responder(criarConsultasHoje().sort((a, b) => a.horario.localeCompare(b.horario)));

/** Atividades de hoje, da mais recente para a mais antiga. */
export const getAtividades = (): Promise<Atividade[]> =>
  responder(criarAtividadesHoje().sort((a, b) => b.horario.localeCompare(a.horario)));
