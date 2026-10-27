import type {
  AlertaEmergencia,
  AtividadePainel,
  ConsultaPainel,
  Departamento,
  Insight,
  Kpis,
  PeriodoInternacao,
  PontoInternacao,
  ResumoDia,
  SetorLeitos,
  Usuario,
} from '../types';
import { horaDosMinutos, hojeNoFuso, instanteNoFuso } from '../utils/datas';

/** Gera o ISO de hoje no horário informado, no fuso do hospital. */
export function hojeAs(hora: number, minuto = 0): string {
  return instanteNoFuso(hojeNoFuso(), horaDosMinutos(hora * 60 + minuto)).toISOString();
}

export const usuario: Usuario = {
  nome: 'Ricardo Almeida',
  tratamento: 'Dr. Ricardo Almeida',
  cargo: 'Administrador',
};

export const kpis: Kpis = {
  totalPacientes: 1248,
  variacaoPacientes: 12,
  medicosPlantao: 42,
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

/** Gerado a cada chamada para que as consultas sejam sempre "de hoje". */
export function criarConsultasHoje(): ConsultaPainel[] {
  return [
    {
      id: 'c1',
      horario: hojeAs(9, 0),
      paciente: 'João Pereira',
      departamento: 'Cardiologia',
      status: 'concluida',
    },
    {
      id: 'c2',
      horario: hojeAs(10, 30),
      paciente: 'Mariana Alves',
      departamento: 'Neurologia',
      status: 'agendada',
    },
    {
      id: 'c3',
      horario: hojeAs(12, 0),
      paciente: 'Carlos Santos',
      departamento: 'Ortopedia',
      status: 'agendada',
    },
    {
      id: 'c4',
      horario: hojeAs(16, 0),
      paciente: 'Daniel Oliveira',
      departamento: 'Clínica Geral',
      status: 'cancelada',
    },
  ];
}

/** Gerado a cada chamada para que as atividades sejam sempre "de hoje". */
export function criarAtividadesHoje(): AtividadePainel[] {
  return [
    { id: 'at1', descricao: 'Novo paciente João Pereira internado', horario: hojeAs(10, 30) },
    { id: 'at2', descricao: 'Estoque de paracetamol atualizado', horario: hojeAs(9, 45) },
    { id: 'at3', descricao: 'Consulta concluída com Mariana Alves', horario: hojeAs(9, 30) },
    {
      id: 'at4',
      descricao: 'Dr. Rafael Costa entrou na equipe de Cardiologia',
      horario: hojeAs(9, 0),
    },
  ];
}
