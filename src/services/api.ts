/**
 * Serviço simulado. Cada função imita uma chamada à API real:
 * é assíncrona, tem latência e devolve cópias dos dados mockados.
 * Para integrar o backend, troque o corpo das funções por chamadas HTTP
 * mantendo as mesmas assinaturas.
 */
import { departamentos, kpis, usuario } from '../data/mock';
import { t } from '../i18n/pt-BR';
import type { Departamento, Kpis, Usuario } from '../types';

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

export const getUsuario = (): Promise<Usuario> => responder(usuario);

export const getKpis = (): Promise<Kpis> => responder(kpis);

export const getDepartamentos = (): Promise<Departamento[]> => responder(departamentos);
