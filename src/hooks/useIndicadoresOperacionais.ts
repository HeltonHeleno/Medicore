/**
 * D20 / M31: indicadores dos módulos no Painel, carregados **sob demanda**. O serviço de
 * indicadores (e, com ele, os repositórios e os dados de exemplo dos módulos) só é baixado
 * quando o Painel pede; os cards abrem com o esqueleto e se preenchem em seguida.
 * Recarregam sozinhos quando uma coleção dos módulos muda, nesta aba ou em outra (M6).
 */
import { NOMES_OPERACOES } from '../services/nomes-colecoes-operacoes';
import type { PeriodoInternacao } from '../types';
import { useColecao } from './useColecao';

const carregar = () => import('../services/indicadores-operacionais');

/** Tudo o que o Painel lê dos módulos (e os pacientes, pelos nomes nos alertas). */
export const COLECOES_PAINEL: readonly string[] = [...Object.values(NOMES_OPERACOES), 'pacientes'];

export const useIndicadoresOperacionais = () =>
  useColecao(() => carregar().then((m) => m.obterIndicadoresOperacionais()), [], COLECOES_PAINEL);

export const useSerieInternacoes = (periodo: PeriodoInternacao) =>
  useColecao(
    () => carregar().then((m) => m.obterSerieInternacoes(periodo)),
    [periodo],
    [NOMES_OPERACOES.internacoes, NOMES_OPERACOES.resumos],
  );
