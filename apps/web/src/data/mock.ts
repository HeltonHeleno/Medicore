import { DEPARTAMENTOS } from '@medicore/dominio/config/departamentos';
import type { Departamento, Kpis, Usuario } from '@medicore/dominio/types';

export const usuario: Usuario = {
  nome: 'Ricardo Almeida',
  tratamento: 'Dr. Ricardo Almeida',
  cargo: 'Administrador',
};

/**
 * Total de pacientes e médicos de plantão vêm dos cadastros (services/painel.ts); leitos,
 * emergência, alertas, insights e internações vêm dos módulos (Fase 20). Continuam
 * simulados só o usuário, a variação de pacientes e o desempenho por departamento.
 */
export const kpis: Kpis = {
  variacaoPacientes: 12,
};

/** Desempenho ainda simulado (BL-41); os departamentos vêm do domínio. */
const DESEMPENHO_SIMULADO: Record<string, number> = {
  cardiologia: 88,
  emergencia: 93,
  neurologia: 80,
  'clinica-geral': 79,
  ortopedia: 75,
  pediatria: 65,
};

export const departamentos: Departamento[] = DEPARTAMENTOS.map((d) => ({
  ...d,
  desempenho: DESEMPENHO_SIMULADO[d.id] ?? 0,
}));
