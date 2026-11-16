/**
 * Fase 27 (BL-01.7) — Modo API: toma o lugar de `services/medicos.ts` quando o app é construído com
 * `VITE_API_URL` (ver `vite.config.ts`). Mesmas funções e assinaturas; os dados vêm da API.
 */

import type * as L from '../medicos';
import { departamentos } from '../../data/mock';
import { cadastros as c } from './cliente';
import { emPaginas } from './paginas';

/** Os departamentos vêm da API; o desempenho continua simulado no app até o BL-41. */
export const listarDepartamentos: typeof L.listarDepartamentos = async () => {
  const simulados = new Map(departamentos.map((d) => [d.id, d.desempenho]));
  return (await c.listarDepartamentos()).map((d) => ({
    ...d,
    desempenho: simulados.get(d.id) ?? 0,
  }));
};
export const listarMedicos: typeof L.listarMedicos = emPaginas(c.listarMedicos);
export const obterMedico: typeof L.obterMedico = c.obterMedico;
export const crmDisponivel: typeof L.crmDisponivel = c.crmDisponivel;
export const medicoComCrm: typeof L.medicoComCrm = c.medicoComCrm;
export const consultasFuturasDoMedico: typeof L.consultasFuturasDoMedico =
  c.consultasFuturasDoMedico;
export const consultasAfetadas: typeof L.consultasAfetadas = c.consultasAfetadas;
export const criarMedico: typeof L.criarMedico = c.criarMedico;
export const atualizarMedico: typeof L.atualizarMedico = c.atualizarMedico;
export const inativarMedico: typeof L.inativarMedico = c.inativarMedico;
export const reativarMedico: typeof L.reativarMedico = c.reativarMedico;
export const pendenciasDoMedico: typeof L.pendenciasDoMedico = c.pendenciasDoMedico;

export { nomeDepartamento } from '@medicore/dominio/config/departamentos';
export { nomeExibicaoMedico, resumirDisponibilidade } from '@medicore/dominio/utils/cadastros';
