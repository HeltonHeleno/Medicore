/**
 * Fase 25 (25.1.6) — Indicadores do Painel calculados a partir dos cadastros
 * (KPIs "Total de pacientes" e "Médicos de plantão").
 */
import type { Disponibilidade } from '@medicore/dominio/types';
import { atendeNoDia } from '@medicore/dominio/utils/agenda';
import { hojeNoFuso } from '@medicore/dominio/utils/datas';
import { eq } from 'drizzle-orm';
import { medicos, pacientes } from '../banco/esquema';
import type { Executor } from './comum';

export interface IndicadoresCadastros {
  pacientesAtivos: number;
  medicosPlantao: number;
}

export async function indicadoresCadastros(banco: Executor): Promise<IndicadoresCadastros> {
  const hoje = hojeNoFuso();
  const pacientesAtivos = await banco.$count(pacientes, eq(pacientes.ativo, true));
  const disponibilidades = await banco
    .select({ d: medicos.disponibilidade })
    .from(medicos)
    .where(eq(medicos.ativo, true));
  return {
    pacientesAtivos,
    medicosPlantao: disponibilidades.filter((m) => atendeNoDia(m.d as Disponibilidade, hoje))
      .length,
  };
}
