import type {
  AlertaEmergencia,
  Departamento,
  Insight,
  Kpis,
  PeriodoInternacao,
  PontoInternacao,
  ResumoDia,
  SetorLeitos,
  Usuario,
} from '../types';

export const usuario: Usuario = {
  nome: 'Ricardo Almeida',
  tratamento: 'Dr. Ricardo Almeida',
  cargo: 'Administrador',
};

/** Total de pacientes e médicos de plantão vêm dos cadastros (services/painel.ts). */
export const kpis: Kpis = {
  variacaoPacientes: 12,
  casosEmergencia: 18,
};

export const resumoDia: ResumoDia = {
  previsaoOcupacaoUti: 90,
  medicamentosEstoqueBaixo: 3,
  pacientesRetorno: 5,
};

/** Leitos por setor. Totais, ocupação e disponíveis são calculados em utils/leitos.ts. */
export const setoresLeitos: SetorLeitos[] = [
  { id: 'uti', nome: 'UTI', ocupados: 22, total: 30 },
  { id: 'enfermaria', nome: 'Enfermaria', ocupados: 50, total: 70 },
  { id: 'apartamento', nome: 'Apartamento', ocupados: 14, total: 20 },
];

export const departamentos: Departamento[] = [
  { id: 'cardiologia', nome: 'Cardiologia', desempenho: 88 },
  { id: 'emergencia', nome: 'Emergência', desempenho: 93 },
  { id: 'neurologia', nome: 'Neurologia', desempenho: 80 },
  { id: 'clinica-geral', nome: 'Clínica Geral', desempenho: 79 },
  { id: 'ortopedia', nome: 'Ortopedia', desempenho: 75 },
  { id: 'pediatria', nome: 'Pediatria', desempenho: 65 },
];

export const internacoes: Record<PeriodoInternacao, PontoInternacao[]> = {
  semana: [
    { rotulo: 'Seg', valor: 42 },
    { rotulo: 'Ter', valor: 30 },
    { rotulo: 'Qua', valor: 38 },
    { rotulo: 'Qui', valor: 64 },
    { rotulo: 'Sex', valor: 46 },
    { rotulo: 'Sáb', valor: 70 },
    { rotulo: 'Dom', valor: 60 },
  ],
  mes: [
    { rotulo: 'Sem 1', valor: 286 },
    { rotulo: 'Sem 2', valor: 312 },
    { rotulo: 'Sem 3', valor: 274 },
    { rotulo: 'Sem 4', valor: 350 },
  ],
  ano: [
    { rotulo: 'Jan', valor: 1180 },
    { rotulo: 'Fev', valor: 1094 },
    { rotulo: 'Mar', valor: 1263 },
    { rotulo: 'Abr', valor: 1210 },
    { rotulo: 'Mai', valor: 1342 },
    { rotulo: 'Jun', valor: 1418 },
    { rotulo: 'Jul', valor: 1485 },
    { rotulo: 'Ago', valor: 1376 },
    { rotulo: 'Set', valor: 1301 },
    { rotulo: 'Out', valor: 1352 },
    { rotulo: 'Nov', valor: 1270 },
    { rotulo: 'Dez', valor: 1195 },
  ],
};

export const insights: Insight[] = [
  {
    id: 'i1',
    texto: `A ocupação da UTI pode chegar a ${resumoDia.previsaoOcupacaoUti}% até a noite.`,
  },
  {
    id: 'i2',
    texto: `${resumoDia.medicamentosEstoqueBaixo} medicamentos estão com estoque baixo.`,
  },
  { id: 'i3', texto: `${resumoDia.pacientesRetorno} pacientes precisam de retorno hoje.` },
];

export const alertas: AlertaEmergencia[] = [
  {
    id: 'a1',
    titulo: 'Paciente crítico',
    local: 'UTI, Leito 12',
    medico: 'Dr. Paulo Mendes',
    prioridade: 'alta',
  },
  {
    id: 'a2',
    titulo: 'Acidente',
    local: 'Emergência, Leito 3',
    medico: 'Dr. Marcos Ribeiro',
    prioridade: 'media',
  },
  {
    id: 'a3',
    titulo: 'Infarto',
    local: 'UTI, Leito 7',
    medico: 'Dra. Fernanda Lima',
    prioridade: 'alta',
  },
];
