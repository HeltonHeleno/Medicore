/**
 * Fase 27 (BL-01.7) — Modo API: toma o lugar de `services/indicadores-operacionais.ts` quando o app é construído com
 * `VITE_API_URL` (ver `vite.config.ts`). Mesmas funções e assinaturas; os dados vêm da API.
 */

import type * as L from '../indicadores-operacionais';
import { operacoes as c } from './cliente';

export const obterIndicadoresOperacionais: typeof L.obterIndicadoresOperacionais =
  c.obterIndicadoresOperacionais;
export const obterIndicadoresLeitos: typeof L.obterIndicadoresLeitos = c.obterIndicadoresLeitos;
export const obterIndicadoresEmergencia: typeof L.obterIndicadoresEmergencia =
  c.obterIndicadoresEmergencia;
export const obterResumoEstoque: typeof L.obterResumoEstoque = c.obterResumoEstoque;
export const listarAlertas: typeof L.listarAlertas = c.listarAlertas;
export const obterSerieInternacoes: typeof L.obterSerieInternacoes = c.obterSerieInternacoes;
