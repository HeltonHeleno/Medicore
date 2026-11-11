/**
 * Hooks de dados do painel: um por card, cada um com seu próprio
 * estado de carregamento e erro, para que uma falha não derrube o painel inteiro.
 *
 * Desde a Fase 13, consultas, atividades e os KPIs de pacientes e médicos vêm
 * do repositório e se atualizam sozinhos (inclusive quando outra aba grava). Desde a
 * Fase 20, leitos, emergência, alertas, insights e internações vêm dos módulos, por
 * `useIndicadoresOperacionais` (carregado sob demanda, D20).
 */
import { listarAtividades } from '../services/atividades';
import { repoAtividades, repoMedicos, repoPacientes } from '../services/colecoes';
import * as api from '../services/api';
import { indicadoresPainel } from '../services/painel';
import { hojeNoFuso } from '../utils/datas';
import { useAsync } from './useAsync';
import { useColecao } from './useColecao';
import { useAgenda } from './useDados';

export const useUsuario = () => useAsync(api.getUsuario);
export const useKpis = () => useAsync(api.getKpis);
export const useDepartamentos = () => useAsync(api.getDepartamentos);

/** Consultas de hoje (fuso do hospital), em ordem de horário. */
export const useConsultasHoje = () => useAgenda({ data: hojeNoFuso() });

/** Consultas de qualquer dia que já terminaram sem registro (R-C7 / P13). */
export const usePendentesRegistro = () => useAgenda({ pendentes: true });

/** As 4 atividades mais recentes da linha do tempo. */
export const useAtividades = () =>
  useColecao(() => listarAtividades({ limite: 4 }), [], [repoAtividades.nome]);

/** KPIs "Total de pacientes" e "Médicos de plantão". */
export const useIndicadoresPainel = () =>
  useColecao(indicadoresPainel, [], [repoPacientes.nome, repoMedicos.nome]);
