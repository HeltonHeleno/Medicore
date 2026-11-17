/**
 * Fase 27 (BL-01.7) — Modo API: toma o lugar de `services/emergencia.ts` quando o app é construído com
 * `VITE_API_URL` (ver `vite.config.ts`). Mesmas funções e assinaturas; os dados vêm da API.
 */

import type * as L from '../emergencia';
import { operacoes as c } from './cliente';
import { emPaginas } from './paginas';

export const listarFila: typeof L.listarFila = c.listarFila;
export const obterAtendimento: typeof L.obterAtendimento = c.obterAtendimento;
export const listarHistorico: typeof L.listarHistorico = emPaginas(c.listarHistorico);
export const registrarChegada: typeof L.registrarChegada = c.registrarChegada;
export const triar: typeof L.triar = c.triar;
export const reavaliar: typeof L.reavaliar = c.reavaliar;
export const chamar: typeof L.chamar = c.chamar;
export const colocarEmObservacao: typeof L.colocarEmObservacao = c.colocarEmObservacao;
export const retomarAtendimento: typeof L.retomarAtendimento = c.retomarAtendimento;
export const solicitarLeito: typeof L.solicitarLeito = c.solicitarLeito;
export const encerrar: typeof L.encerrar = c.encerrar;
export const reabrir: typeof L.reabrir = c.reabrir;
export const vincularPaciente: typeof L.vincularPaciente = c.vincularPaciente;
export const leitosParaObservacao: typeof L.leitosParaObservacao = c.leitosParaObservacao;
export const medicosParaChamar: typeof L.medicosParaChamar = c.medicosParaChamar;

export { desfechosPermitidos } from '@medicore/dominio/utils/operacoes';
