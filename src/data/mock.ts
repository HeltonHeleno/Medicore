import type { Departamento, Kpis, Usuario } from '../types';

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

export const departamentos: Departamento[] = [
  { id: 'cardiologia', nome: 'Cardiologia', desempenho: 88 },
  { id: 'emergencia', nome: 'Emergência', desempenho: 93 },
  { id: 'neurologia', nome: 'Neurologia', desempenho: 80 },
  { id: 'clinica-geral', nome: 'Clínica Geral', desempenho: 79 },
  { id: 'ortopedia', nome: 'Ortopedia', desempenho: 75 },
  { id: 'pediatria', nome: 'Pediatria', desempenho: 65 },
];
