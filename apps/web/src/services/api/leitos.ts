/**
 * Fase 27 (BL-01.7) — Modo API: toma o lugar de `services/leitos.ts` quando o app é construído com
 * `VITE_API_URL` (ver `vite.config.ts`). Mesmas funções e assinaturas; os dados vêm da API.
 */

import type * as L from '../leitos';
import { operacoes as c } from './cliente';
import { emPaginas } from './paginas';

export const listarLeitos: typeof L.listarLeitos = c.listarLeitos;
export const obterLeito: typeof L.obterLeito = c.obterLeito;
export const buscarPacienteNoMapa: typeof L.buscarPacienteNoMapa = c.buscarPacienteNoMapa;
export const historicoLeito: typeof L.historicoLeito = c.historicoLeito;
export const leitosCompativeis: typeof L.leitosCompativeis = c.leitosCompativeis;
export const listarInternacoes: typeof L.listarInternacoes = emPaginas(c.listarInternacoes);
export const obterInternacao: typeof L.obterInternacao = c.obterInternacao;
export const consultasDuranteInternacao: typeof L.consultasDuranteInternacao =
  c.consultasDuranteInternacao;
export const listarSolicitacoes: typeof L.listarSolicitacoes = c.listarSolicitacoes;
export const obterSolicitacao: typeof L.obterSolicitacao = c.obterSolicitacao;
export const internar: typeof L.internar = c.internar;
export const transferir: typeof L.transferir = c.transferir;
export const darAlta: typeof L.darAlta = c.darAlta;
export const desfazerAlta: typeof L.desfazerAlta = c.desfazerAlta;
export const concluirHigienizacao: typeof L.concluirHigienizacao = c.concluirHigienizacao;
export const reverterHigienizacao: typeof L.reverterHigienizacao = c.reverterHigienizacao;
export const bloquear: typeof L.bloquear = c.bloquear;
export const desbloquear: typeof L.desbloquear = c.desbloquear;
export const editarInternacao: typeof L.editarInternacao = c.editarInternacao;
export const solicitarLeitoEletivo: typeof L.solicitarLeitoEletivo = c.solicitarLeitoEletivo;
export const reservarLeito: typeof L.reservarLeito = c.reservarLeito;
export const cancelarReserva: typeof L.cancelarReserva = c.cancelarReserva;
export const cancelarSolicitacao: typeof L.cancelarSolicitacao = c.cancelarSolicitacao;
export const medicosResponsaveis: typeof L.medicosResponsaveis = c.medicosResponsaveis;
