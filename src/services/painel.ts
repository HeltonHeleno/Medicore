/**
 * Indicadores do Painel calculados a partir dos cadastros (Fase 13).
 * A variação diária de pacientes, os casos de emergência, os leitos e o resumo
 * da UTI continuam simulados em `api.ts` até haver histórico/backend.
 */
import { atendeNoDia } from '../utils/agenda';
import { hojeNoFuso } from '../utils/datas';
import { repoMedicos, repoPacientes } from './colecoes';
import { executar } from './infra';

export interface IndicadoresPainel {
  /** KPI "Total de pacientes": cadastros ativos. */
  pacientesAtivos: number;
  /** KPI "Médicos de plantão": ativos que atendem no dia da semana de hoje. */
  medicosPlantao: number;
}

export const indicadoresPainel = (): Promise<IndicadoresPainel> =>
  executar(() => {
    const hoje = hojeNoFuso();
    return {
      pacientesAtivos: repoPacientes.todos().filter((p) => p.ativo).length,
      medicosPlantao: repoMedicos
        .todos()
        .filter((m) => m.ativo && atendeNoDia(m.disponibilidade, hoje)).length,
    };
  });
