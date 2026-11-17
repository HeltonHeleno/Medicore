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
import { nomesPerfis } from '@medicore/dominio/i18n/pt-BR/perfis';
import type { Usuario } from '@medicore/dominio/types';
import { hojeNoFuso } from '@medicore/dominio/utils/datas';
import { useAsync, type EstadoAsync } from './useAsync';
import { useSessao } from './useSessao';
import { useColecao } from './useColecao';
import { useAgenda } from './useDados';

/**
 * Quem está usando. Fase 28: com login (modo API), o usuário da sessão e os perfis; sem login, o
 * usuário simulado de sempre.
 */
export function useUsuario(): EstadoAsync<Usuario> {
  const sessao = useSessao();
  const simulado = useAsync(api.getUsuario);
  if (!sessao) return simulado;
  const { nome, perfis } = sessao.usuario;
  return {
    data: { nome, tratamento: nome, cargo: perfis.map((p) => nomesPerfis[p]).join(', ') },
    carregando: false,
    erro: null,
    recarregar: simulado.recarregar,
  };
}
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
