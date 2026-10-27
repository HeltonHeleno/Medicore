/**
 * Hooks de dados por entidade. Todos recarregam sozinhos quando os dados mudam.
 */
import { repoConsultas, repoMedicos, repoPacientes } from '../services/colecoes';
import { horariosLivres, listarConsultas, obterConsulta } from '../services/consultas';
import { listarMedicos, obterMedico } from '../services/medicos';
import { listarPacientes, obterPaciente } from '../services/pacientes';
import type { FiltrosAgenda, FiltrosMedicos, FiltrosPacientes } from '../types';
import { useColecao } from './useColecao';

const PACIENTES = [repoPacientes.nome, repoConsultas.nome];
const MEDICOS = [repoMedicos.nome, repoConsultas.nome];
const TODAS = [repoPacientes.nome, repoMedicos.nome, repoConsultas.nome];

export const usePaciente = (id: string) => useColecao(() => obterPaciente(id), [id], PACIENTES);

export const useMedico = (id: string) => useColecao(() => obterMedico(id), [id], MEDICOS);

export const useConsulta = (id: string) => useColecao(() => obterConsulta(id), [id], TODAS);

export const useListaPacientes = (filtros: FiltrosPacientes) =>
  useColecao(() => listarPacientes(filtros), [JSON.stringify(filtros)], PACIENTES);

export const useListaMedicos = (filtros: FiltrosMedicos) =>
  useColecao(() => listarMedicos(filtros), [JSON.stringify(filtros)], MEDICOS);

export const useAgenda = (filtros: FiltrosAgenda) =>
  useColecao(() => listarConsultas(filtros), [JSON.stringify(filtros)], TODAS);

export interface ParametrosHorarios {
  medicoId: string;
  data: string;
  duracaoMin: number;
  pacienteId?: string;
  ignorarConsultaId?: string;
}

/** Sem médico ou data escolhidos, devolve lista vazia sem consultar. */
export const useHorariosLivres = (p: Partial<ParametrosHorarios>) =>
  useColecao(
    () =>
      p.medicoId && p.data && p.duracaoMin
        ? horariosLivres(p.medicoId, p.data, p.duracaoMin, p.pacienteId, p.ignorarConsultaId)
        : Promise.resolve([]),
    [p.medicoId, p.data, p.duracaoMin, p.pacienteId, p.ignorarConsultaId],
    [repoMedicos.nome, repoConsultas.nome],
  );
