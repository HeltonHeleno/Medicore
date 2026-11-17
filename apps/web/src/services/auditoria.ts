/**
 * Fase 29 (BL-03) — Auditoria no modo navegador: não existe (não há login nem servidor). As telas
 * da auditoria só aparecem com login. No modo API, `services/api/auditoria.ts` toma o lugar deste.
 */
import type {
  DadosDoTitular,
  FiltrosAuditoria,
  RegistroAuditoria,
  ResultadoIntegridade,
} from '@medicore/dominio/contrato/auditoria';
import type { Paginado } from '@medicore/dominio/types';

const semServidor = async (): Promise<never> => {
  throw new Error('Sem auditoria no modo navegador.');
};

export const listarAuditoria: (f: FiltrosAuditoria) => Promise<Paginado<RegistroAuditoria>> =
  semServidor;
export const pessoasDaAuditoria: () => Promise<{ id: string; nome: string }[]> = semServidor;
export const conferirIntegridade: () => Promise<ResultadoIntegridade> = semServidor;
export const dadosDoTitular: (pacienteId: string) => Promise<DadosDoTitular> = semServidor;
/** Endereço do CSV (o navegador baixa com o cookie da sessão). */
export const enderecoDaExportacao = (_f: FiltrosAuditoria): string => '';
