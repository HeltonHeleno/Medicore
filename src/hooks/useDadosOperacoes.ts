/**
 * Hooks de dados dos módulos operacionais. Recarregam sozinhos quando as coleções de que
 * dependem mudam (nesta aba ou em outra, M6). Importados só pelas páginas dos módulos.
 */
import { COLECOES } from '../services/colecoes-operacoes';
import { listarFila, obterAtendimento, listarHistorico } from '../services/emergencia';
import {
  listarEstoque,
  listarMovimentacoes,
  obterDispensacao,
  obterMedicamento,
} from '../services/farmacia';
import {
  listarInternacoes,
  listarLeitos,
  listarSolicitacoes,
  obterInternacao,
  obterLeito,
} from '../services/leitos';
import type {
  FiltrosEstoque,
  FiltrosHistoricoEmergencia,
  FiltrosInternacoes,
  FiltrosLeitos,
  FiltrosMovimentacoes,
} from '../types';
import { useColecao } from './useColecao';

const LEITOS = COLECOES.leitos;
const EMERGENCIA = COLECOES.emergencia;
const FARMACIA = COLECOES.farmacia;

// Gestão de leitos
export const useMapaLeitos = (filtros: FiltrosLeitos = {}) =>
  useColecao(() => listarLeitos(filtros), [JSON.stringify(filtros)], LEITOS);
export const useLeito = (id: string) => useColecao(() => obterLeito(id), [id], LEITOS);
export const useInternacoes = (filtros: FiltrosInternacoes) =>
  useColecao(() => listarInternacoes(filtros), [JSON.stringify(filtros)], LEITOS);
export const useInternacao = (id: string) => useColecao(() => obterInternacao(id), [id], LEITOS);
export const useSolicitacoes = () => useColecao(() => listarSolicitacoes(), [], LEITOS);

// Emergência
export const useFila = () => useColecao(() => listarFila(), [], EMERGENCIA);
export const useAtendimento = (id: string) =>
  useColecao(() => obterAtendimento(id), [id], EMERGENCIA);
export const useHistoricoEmergencia = (filtros: FiltrosHistoricoEmergencia) =>
  useColecao(() => listarHistorico(filtros), [JSON.stringify(filtros)], EMERGENCIA);

// Farmácia
export const useEstoque = (filtros: FiltrosEstoque) =>
  useColecao(() => listarEstoque(filtros), [JSON.stringify(filtros)], FARMACIA);
export const useMedicamento = (id: string) =>
  useColecao(() => obterMedicamento(id), [id], FARMACIA);
export const useMovimentacoes = (filtros: FiltrosMovimentacoes) =>
  useColecao(() => listarMovimentacoes(filtros), [JSON.stringify(filtros)], FARMACIA);
export const useDispensacao = (id: string) =>
  useColecao(() => obterDispensacao(id), [id], FARMACIA);
