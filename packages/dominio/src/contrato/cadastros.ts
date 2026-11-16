/**
 * Fase 25 (BL-01.4) — Contrato das rotas de cadastros e agenda: o formato das consultas (query
 * string) e das respostas. A API usa estes esquemas para validar, serializar e documentar
 * (OpenAPI); os testes de contrato conferem cada resposta contra eles.
 *
 * As entradas (corpo das gravações) são os esquemas de `schemas/` (os mesmos do formulário).
 */
import { z } from 'zod';
import { comOrdenacao, filtroStatus } from './lista';

// ───────────────────────── peças comuns ─────────────────────────

const instante = z.string().describe('Data e hora em ISO 8601, UTC');
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD');
const uf = z.string().length(2);

const base = {
  id: z.string(),
  criadoEm: instante,
  atualizadoEm: instante,
  versao: z.number().int().min(1),
};

const inativavel = {
  ativo: z.boolean(),
  inativadoEm: instante.optional(),
  motivoInativacao: z.string().optional(),
};

export const pendenciaModulo = z.object({
  tipo: z.enum(['internacao', 'atendimento']),
  id: z.string(),
  descricao: z.string(),
});

export const referenciaCadastro = z
  .object({ id: z.string(), nomeExibicao: z.string() })
  .nullable()
  .describe('Cadastro que já usa o documento, ou null');

// ───────────────────────── pacientes ─────────────────────────

const endereco = z.object({
  cep: z.string(),
  logradouro: z.string(),
  numero: z.string(),
  complemento: z.string().optional(),
  bairro: z.string(),
  cidade: z.string(),
  uf,
});

export const paciente = z.object({
  ...base,
  ...inativavel,
  nome: z.string(),
  nomeSocial: z.string().optional(),
  cpf: z.string(),
  dataNascimento: data,
  sexo: z.enum(['feminino', 'masculino', 'outro', 'nao_informado']),
  telefone: z.string(),
  email: z.string().optional(),
  endereco: endereco.optional(),
  convenio: z.union([
    z.object({ tipo: z.literal('particular') }),
    z.object({
      tipo: z.literal('convenio'),
      nome: z.string(),
      carteirinha: z.string(),
      validade: data.optional(),
    }),
  ]),
  responsavel: z
    .object({ nome: z.string(), cpf: z.string(), parentesco: z.string(), telefone: z.string() })
    .optional(),
  tipoSanguineo: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  alergias: z.string().optional(),
  contatoEmergencia: z
    .object({ nome: z.string(), telefone: z.string(), parentesco: z.string() })
    .optional(),
  observacoes: z.string().optional(),
  consentimentoLgpd: z.object({ aceito: z.literal(true), em: instante }),
  obito: z
    .object({
      em: instante,
      referencia: z.object({ tipo: z.enum(['internacao', 'atendimento']), id: z.string() }),
    })
    .optional(),
});

export const pacienteResumo = z.object({
  id: z.string(),
  nomeExibicao: z.string(),
  cpfMascarado: z.string(),
  idade: z.number().int(),
  telefone: z.string(),
  convenioNome: z.string(),
  temAlergias: z.boolean(),
  proximaConsulta: instante.optional(),
  ativo: z.boolean(),
});

export const filtrosPacientes = comOrdenacao(['nome', 'idade', 'proximaConsulta'] as const).extend({
  status: filtroStatus,
});

// ───────────────────────── médicos ─────────────────────────

export const disponibilidade = z.object({
  diasSemana: z.array(z.number().int().min(0).max(6)),
  inicio: z.string(),
  fim: z.string(),
  pausa: z.object({ inicio: z.string(), fim: z.string() }).optional(),
  duracaoPadraoMin: z.number().int(),
});

export const medico = z.object({
  ...base,
  ...inativavel,
  nome: z.string(),
  tratamento: z.enum(['Dr.', 'Dra.']),
  crm: z.object({ numero: z.string(), uf }),
  departamentoId: z.string(),
  telefone: z.string(),
  email: z.string(),
  disponibilidade,
});

export const medicoResumo = z.object({
  id: z.string(),
  nomeExibicao: z.string(),
  crmFormatado: z.string(),
  departamentoId: z.string(),
  departamentoNome: z.string(),
  diasResumo: z.string(),
  consultasHoje: z.number().int(),
  ativo: z.boolean(),
});

export const filtrosMedicos = comOrdenacao(['nome', 'departamento'] as const).extend({
  status: filtroStatus,
  departamentoId: z.string().optional(),
});

export const departamento = z.object({ id: z.string(), nome: z.string() });

// ───────────────────────── consultas e agenda ─────────────────────────

const statusConsulta = z.enum(['agendada', 'concluida', 'cancelada', 'faltou']);

export const consulta = z.object({
  ...base,
  pacienteId: z.string(),
  medicoId: z.string(),
  departamentoId: z.string(),
  inicio: instante,
  duracaoMin: z.number().int(),
  tipo: z.string(),
  status: statusConsulta,
  motivo: z.string().optional(),
  motivoCancelamento: z.string().optional(),
  eventos: z.array(
    z.object({
      tipo: z.enum(['agendada', 'reagendada', 'concluida', 'faltou', 'cancelada']),
      em: instante,
      detalhe: z.string().optional(),
      de: instante.optional(),
      para: instante.optional(),
    }),
  ),
});

export const consultaDetalhada = consulta.extend({
  pacienteNome: z.string(),
  pacienteAlergias: z.string().optional(),
  medicoNome: z.string(),
  departamentoNome: z.string(),
  fim: instante,
  atrasada: z.boolean(),
});

/** A agenda é uma janela de datas (não paginada): até `LIMITE_AGENDA` consultas. */
export const LIMITE_AGENDA = 1000;

const booleanoDaQuery = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

export const filtrosAgenda = z.object({
  data: data.optional(),
  de: data.optional(),
  ate: data.optional(),
  medicoId: z.string().optional(),
  pacienteId: z.string().optional(),
  departamentoId: z.string().optional(),
  status: statusConsulta.optional(),
  pendentes: booleanoDaQuery,
});

export const horarioAgenda = z.object({
  hora: z.string(),
  inicio: instante,
  livre: z.boolean(),
  motivo: z
    .enum(['passado', 'pausa', 'medico_ocupado', 'paciente_ocupado', 'fora_expediente'])
    .optional(),
});

export const consultaHorarios = z.object({
  medicoId: z.string(),
  data,
  duracaoMin: z.coerce.number().int().min(5).max(240),
  pacienteId: z.string().optional(),
  ignorarConsultaId: z.string().optional(),
});

export const loteRegistro = z.object({
  ids: z.array(z.string()).min(1).max(100),
  acao: z.enum(['concluida', 'faltou']),
});

// ───────────────────────── atividades e Painel ─────────────────────────

export const atividade = z.object({
  id: z.string(),
  tipo: z.string(),
  descricao: z.string(),
  em: instante,
  referenciaId: z.string().optional(),
});

export const indicadoresCadastros = z.object({
  pacientesAtivos: z.number().int(),
  medicosPlantao: z.number().int(),
});
