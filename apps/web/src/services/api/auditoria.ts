/** Fase 29 (BL-03) — Auditoria no modo API. Toma o lugar de `services/auditoria.ts`. */
import { consultaDaAuditoria, criarClienteAuditoria } from '@medicore/dominio/cliente/auditoria';
import type * as L from '../auditoria';
import { transporte } from './cliente';
import { baseDaApi } from './rede';

const c = criarClienteAuditoria(transporte);

export const listarAuditoria: typeof L.listarAuditoria = c.listar;
export const pessoasDaAuditoria: typeof L.pessoasDaAuditoria = c.pessoas;
export const conferirIntegridade: typeof L.conferirIntegridade = c.integridade;
export const dadosDoTitular: typeof L.dadosDoTitular = c.titular;
export const enderecoDaExportacao: typeof L.enderecoDaExportacao = (f) => {
  const { pagina: _p, porPagina: _pp, ...filtros } = f;
  const busca = new URLSearchParams(
    Object.entries(consultaDaAuditoria(filtros)).map(([k, v]) => [k, String(v)]),
  ).toString();
  return `${baseDaApi(import.meta.env.VITE_API_URL ?? '')}/auditoria/exportar${busca ? `?${busca}` : ''}`;
};
