/**
 * Fase 27 (BL-01.7) — Modo API: toma o lugar de `services/pacientes.ts` quando o app é construído com
 * `VITE_API_URL` (ver `vite.config.ts`). Mesmas funções e assinaturas; os dados vêm da API.
 */

import type * as L from '../pacientes';
import { cadastros as c } from './cliente';
import { emPaginas } from './paginas';

export const listarPacientes: typeof L.listarPacientes = emPaginas(c.listarPacientes);
export const obterPaciente: typeof L.obterPaciente = c.obterPaciente;
export const cpfDisponivel: typeof L.cpfDisponivel = c.cpfDisponivel;
export const pacienteComCpf: typeof L.pacienteComCpf = c.pacienteComCpf;
export const pacienteTemConsultas: typeof L.pacienteTemConsultas = c.pacienteTemConsultas;
export const consultasFuturasDoPaciente: typeof L.consultasFuturasDoPaciente =
  c.consultasFuturasDoPaciente;
export const criarPaciente: typeof L.criarPaciente = c.criarPaciente;
export const atualizarPaciente: typeof L.atualizarPaciente = c.atualizarPaciente;
export const inativarPaciente: typeof L.inativarPaciente = c.inativarPaciente;
export const reativarPaciente: typeof L.reativarPaciente = c.reativarPaciente;
export const excluirPaciente: typeof L.excluirPaciente = c.excluirPaciente;
export const pendenciasDoPaciente: typeof L.pendenciasDoPaciente = c.pendenciasDoPaciente;

export { nomeExibicaoPaciente } from '@medicore/dominio/utils/cadastros';
