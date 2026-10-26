/**
 * Hooks de dados do painel: um por card, cada um com seu próprio
 * estado de carregamento e erro, para que uma falha não derrube o painel inteiro.
 */
import * as api from '../services/api';
import type { PeriodoInternacao } from '../types';
import { useAsync } from './useAsync';

export const useUsuario = () => useAsync(api.getUsuario);
export const useKpis = () => useAsync(api.getKpis);
export const useResumoDia = () => useAsync(api.getResumoDia);
export const useLeitos = () => useAsync(api.getLeitos);
export const useDepartamentos = () => useAsync(api.getDepartamentos);
export const useInsights = () => useAsync(api.getInsights);
export const useAlertas = () => useAsync(api.getAlertas);
export const useConsultasHoje = () => useAsync(api.getConsultasHoje);
export const useAtividades = () => useAsync(api.getAtividades);

export const useInternacoes = (periodo: PeriodoInternacao) =>
  useAsync(() => api.getInternacoes(periodo), [periodo]);
