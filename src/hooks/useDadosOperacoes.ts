/**
 * Hooks de dados dos módulos operacionais. Recarregam sozinhos quando as coleções de que
 * dependem mudam (nesta aba ou em outra, M6). Importados só pelas páginas dos módulos.
 */
import { COLECOES } from '../services/colecoes-operacoes';
import {
  listarAlertas,
  obterIndicadoresEmergencia,
  obterIndicadoresLeitos,
  obterResumoEstoque,
} from '../services/indicadores-operacionais';
import { listarFila, obterAtendimento, listarHistorico } from '../services/emergencia';
import {
  destinoDetalhado,
  listarDispensacoesDoDestino,
  listarEstoque,
  listarLotesVencimento,
  listarMovimentacoes,
  livroControlados,
  obterDispensacao,
  obterMedicamento,
} from '../services/farmacia';
import {
  historicoLeito,
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
import { situacaoHospitalar } from '../services/situacao-hospitalar';
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
export const useIndicadoresLeitos = () => useColecao(() => obterIndicadoresLeitos(), [], LEITOS);
export const useHistoricoLeito = (id: string) => useColecao(() => historicoLeito(id), [id], LEITOS);
export const useSituacaoHospitalar = (pacienteId: string) =>
  useColecao(
    () =>
      pacienteId
        ? situacaoHospitalar(pacienteId)
        : Promise.resolve<Awaited<ReturnType<typeof situacaoHospitalar>>>({}),
    [pacienteId],
    LEITOS,
  );

// Emergência
export const useFila = () => useColecao(() => listarFila(), [], EMERGENCIA);
export const useAtendimento = (id: string) =>
  useColecao(() => obterAtendimento(id), [id], EMERGENCIA);
export const useHistoricoEmergencia = (filtros: FiltrosHistoricoEmergencia) =>
  useColecao(() => listarHistorico(filtros), [JSON.stringify(filtros)], EMERGENCIA);
export const useIndicadoresEmergencia = () =>
  useColecao(() => obterIndicadoresEmergencia(), [], EMERGENCIA);
/** Alertas dependem de leitos, pedidos e atendimentos. */
export const useAlertas = () =>
  useColecao(() => listarAlertas(), [], [...new Set([...LEITOS, ...EMERGENCIA])]);

// Farmácia
export const useEstoque = (filtros: FiltrosEstoque) =>
  useColecao(() => listarEstoque(filtros), [JSON.stringify(filtros)], FARMACIA);
export const useMedicamento = (id: string) =>
  useColecao(() => obterMedicamento(id), [id], FARMACIA);
export const useMovimentacoes = (filtros: FiltrosMovimentacoes) =>
  useColecao(() => listarMovimentacoes(filtros), [JSON.stringify(filtros)], FARMACIA);
export const useDispensacao = (id: string) =>
  useColecao(() => obterDispensacao(id), [id], FARMACIA);
export const useResumoEstoque = () => useColecao(() => obterResumoEstoque(), [], FARMACIA);
export const useLotesVencimento = () => useColecao(() => listarLotesVencimento(), [], FARMACIA);
export const useLivroControlados = (medicamentoId: string, de: string, ate: string) =>
  useColecao(
    () =>
      medicamentoId && de && ate && de <= ate
        ? livroControlados(medicamentoId, de, ate)
        : Promise.resolve(null),
    [medicamentoId, de, ate],
    FARMACIA,
  );
/** Destino da dispensação depende da internação ou do atendimento do paciente. */
export const useDestinoDispensacao = (pacienteId: string) =>
  useColecao(
    () => (pacienteId ? destinoDetalhado(pacienteId) : Promise.resolve(null)),
    [pacienteId],
    [...new Set([...LEITOS, ...EMERGENCIA])],
  );
export const useDispensacoesDoDestino = (destinoId: string) =>
  useColecao(() => listarDispensacoesDoDestino(destinoId), [destinoId], FARMACIA);
