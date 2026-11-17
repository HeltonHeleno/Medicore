/**
 * Fase 27 (BL-01.7) — Modo API: toma o lugar de `services/consultas.ts` quando o app é construído com
 * `VITE_API_URL` (ver `vite.config.ts`). Mesmas funções e assinaturas; os dados vêm da API.
 */

import type * as L from '../consultas';
import { cadastros as c } from './cliente';

export const listarConsultas: typeof L.listarConsultas = c.listarConsultas;
export const obterConsulta: typeof L.obterConsulta = c.obterConsulta;
export const horariosLivres: typeof L.horariosLivres = c.horariosLivres;
export const proximoDiaDisponivel: typeof L.proximoDiaDisponivel = c.proximoDiaDisponivel;
export const agendarConsulta: typeof L.agendarConsulta = c.agendarConsulta;
export const reagendarConsulta: typeof L.reagendarConsulta = c.reagendarConsulta;
export const cancelarConsulta: typeof L.cancelarConsulta = c.cancelarConsulta;
export const concluirConsulta: typeof L.concluirConsulta = c.concluirConsulta;
export const marcarFalta: typeof L.marcarFalta = c.marcarFalta;
export const registrarEmLote: typeof L.registrarEmLote = c.registrarEmLote;
