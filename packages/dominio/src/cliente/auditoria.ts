/** Fase 29 (BL-03) — Cliente HTTP da auditoria e do pedido do titular. */
import type {
  DadosDoTitular,
  FiltrosAuditoria,
  RegistroAuditoria,
  ResultadoIntegridade,
} from '../contrato/auditoria';
import type { Paginado } from '../types';
import { criarChamada, type TransporteApi } from './cadastros';

const enc = encodeURIComponent;

/** Os filtros como query string (sem os vazios). */
export function consultaDaAuditoria(f: FiltrosAuditoria): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(f).filter(([, v]) => v !== undefined && v !== '') as [string, string | number][],
  );
}

export function criarClienteAuditoria(transporte: TransporteApi) {
  const chamar = criarChamada(transporte);
  return {
    listar: (f: FiltrosAuditoria) =>
      chamar<Paginado<RegistroAuditoria>>({
        metodo: 'GET',
        caminho: '/auditoria',
        consulta: consultaDaAuditoria(f),
      }),
    pessoas: () =>
      chamar<{ id: string; nome: string }[]>({ metodo: 'GET', caminho: '/auditoria/pessoas' }),
    integridade: () =>
      chamar<ResultadoIntegridade>({ metodo: 'GET', caminho: '/auditoria/integridade' }),
    titular: (pacienteId: string) =>
      chamar<DadosDoTitular>({ metodo: 'GET', caminho: `/pacientes/${enc(pacienteId)}/titular` }),
  };
}

export type ClienteAuditoria = ReturnType<typeof criarClienteAuditoria>;
