/**
 * Fase 29 (BL-03) — Contrato da auditoria: a consulta (filtros e resposta), o histórico de acesso
 * do paciente, o pedido do titular e a conferência de integridade. Usado pela API e pelo navegador.
 */
import { z } from 'zod';
import { consultaLista, respostaLista } from './lista';

export const ACOES_AUDITORIA = [
  'inclusao',
  'alteracao',
  'exclusao',
  'leitura',
  'exportacao',
] as const;
export type AcaoAuditoria = (typeof ACOES_AUDITORIA)[number];

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD.');

export const filtrosAuditoria = consultaLista.omit({ busca: true, ordem: true }).extend({
  usuarioId: z.string().max(100).optional(),
  pacienteId: z.string().max(100).optional(),
  acao: z.enum(ACOES_AUDITORIA).optional(),
  entidade: z.string().max(50).optional(),
  /** Período, no fuso do hospital (inclusive). */
  de: dataIso.optional(),
  ate: dataIso.optional(),
});
export type FiltrosAuditoria = z.input<typeof filtrosAuditoria>;

export const registroAuditoria = z.object({
  id: z.number().int(),
  em: z.string(),
  usuarioId: z.string().optional(),
  usuarioNome: z.string().optional(),
  ip: z.string().optional(),
  agente: z.string().optional(),
  origem: z.string(),
  acao: z.enum(ACOES_AUDITORIA),
  entidade: z.string(),
  registroId: z.string().optional(),
  pacienteId: z.string().optional(),
  /** Gravações: `{ campo: { antes, depois } }` ou `{ campo: { adicionados } }` (nomes do domínio). */
  campos: z.record(z.string(), z.unknown()).optional(),
  /** Leituras e exportações: o que foi visto, sem o conteúdo. */
  detalhe: z.string().optional(),
});
export type RegistroAuditoria = z.infer<typeof registroAuditoria>;

export const listaAuditoria = respostaLista(registroAuditoria);

/** Quem aparece na trilha (para o filtro "pessoa"). */
export const pessoaAuditoria = z.object({ id: z.string(), nome: z.string() });

export const resultadoIntegridade = z.object({
  diasConferidos: z.number().int(),
  registrosConferidos: z.number().int(),
  violacoes: z.array(
    z.object({
      dia: z.string(),
      quantidadeSelada: z.number().int(),
      quantidadeAtual: z.number().int(),
    }),
  ),
  /** O dia mais recente já selado (os dias abertos são selados depois que terminam). */
  ultimoDiaSelado: z.string().optional(),
});
export type ResultadoIntegridade = z.infer<typeof resultadoIntegridade>;

/** BL-03.4 — Pedido do titular (LGPD, art. 18): os dados do paciente e quem os acessou. */
export const dadosDoTitular = z.object({
  geradoEm: z.string(),
  paciente: z.record(z.string(), z.unknown()),
  consultas: z.array(z.record(z.string(), z.unknown())),
  internacoes: z.array(z.record(z.string(), z.unknown())),
  atendimentos: z.array(z.record(z.string(), z.unknown())),
  dispensacoes: z.array(z.record(z.string(), z.unknown())),
  acessos: z.array(registroAuditoria),
});
export type DadosDoTitular = z.infer<typeof dadosDoTitular>;
