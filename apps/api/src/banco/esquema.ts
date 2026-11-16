/**
 * Fase 24 (BL-01.2, D25) — Esquema do banco: uma tabela por coleção de hoje.
 *
 * Convenções:
 * - Os nomes das colunas vêm dos campos do domínio em `snake_case` (`casing: 'snake_case'`).
 * - Ids são os mesmos de hoje (`pac-…`, `int-12`), em `text`.
 * - Todo registro editável tem `versao` (R-G1, `ETag`/`If-Match`), `criado_em` e `atualizado_em`.
 * - Datas e horas em `timestamptz`, lidas e gravadas como texto ISO (o domínio trabalha com ISO).
 * - Listas e objetos que só existem dentro do registro (eventos, triagens, itens, endereço) ficam em
 *   `jsonb`, tipados com os tipos do domínio.
 * - As relações "para a frente" têm chave estrangeira. Os ponteiros de volta (o leito que aponta
 *   para a internação que o ocupa, por exemplo) não têm, porque formariam ciclos; a coerência
 *   deles é conferida pelas invariantes (A17), como hoje.
 *
 * As restrições que o Drizzle não descreve (`EXCLUDE` das consultas, papéis e permissões) estão na
 * migração escrita à mão `drizzle/0001_restricoes.sql`.
 */
import type {
  AlertaConfirmado,
  AltaInternacao,
  BloqueioLeito,
  BloqueioLote,
  ContatoEmergencia,
  Convenio,
  CorRisco,
  Crm,
  Desfecho,
  Disponibilidade,
  Endereco,
  EventoAtendimento,
  EventoConsulta,
  EventoInternacao,
  IdentificacaoProvisoria,
  ItemDispensacao,
  Reavaliacao,
  Responsavel,
  TipoAlta,
  TipoDesfecho,
  Triagem,
} from '@medicore/dominio/types';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

const instante = () => timestamp({ withTimezone: true, mode: 'string' });

/** Campos de todo registro editável (EntidadeBase). */
const base = {
  id: text().primaryKey(),
  versao: integer().notNull().default(1),
  criadoEm: instante().notNull().defaultNow(),
  atualizadoEm: instante().notNull().defaultNow(),
};

/** Campos de inativação (Inativavel). */
const inativavel = {
  ativo: boolean().notNull().default(true),
  inativadoEm: instante(),
  motivoInativacao: text(),
};

// ---------------------------------------------------------------- Cadastros e agenda

export const pacientes = pgTable(
  'pacientes',
  {
    ...base,
    ...inativavel,
    nome: text().notNull(),
    nomeSocial: text(),
    cpf: text().notNull(),
    dataNascimento: date({ mode: 'string' }).notNull(),
    sexo: text().notNull(),
    telefone: text().notNull(),
    email: text(),
    endereco: jsonb().$type<Endereco>(),
    convenio: jsonb().$type<Convenio>().notNull(),
    responsavel: jsonb().$type<Responsavel>(),
    tipoSanguineo: text(),
    alergias: text(),
    contatoEmergencia: jsonb().$type<ContatoEmergencia>(),
    observacoes: text(),
    consentimentoLgpd: jsonb().$type<{ aceito: true; em: string }>().notNull(),
    obito: jsonb().$type<{
      em: string;
      referencia: { tipo: 'internacao' | 'atendimento'; id: string };
    }>(),
  },
  (t) => [
    // R-P1: CPF único.
    uniqueIndex('pacientes_cpf_unico').on(t.cpf),
    index('pacientes_nome').on(t.nome),
  ],
);

export const medicos = pgTable(
  'medicos',
  {
    ...base,
    ...inativavel,
    nome: text().notNull(),
    tratamento: text().notNull(),
    crm: jsonb().$type<Crm>().notNull(),
    departamentoId: text().notNull(),
    telefone: text().notNull(),
    email: text().notNull(),
    disponibilidade: jsonb().$type<Disponibilidade>().notNull(),
  },
  (t) => [
    // R-M1: CRM (número + UF) único; R-M2: e-mail único, sem diferença de maiúsculas.
    uniqueIndex('medicos_crm_unico').on(sql`(${t.crm} ->> 'numero')`, sql`(${t.crm} ->> 'uf')`),
    uniqueIndex('medicos_email_unico').on(sql`lower(${t.email})`),
    index('medicos_departamento').on(t.departamentoId),
  ],
);

export const consultas = pgTable(
  'consultas',
  {
    ...base,
    pacienteId: text()
      .notNull()
      .references(() => pacientes.id),
    medicoId: text()
      .notNull()
      .references(() => medicos.id),
    departamentoId: text().notNull(),
    inicio: instante().notNull(),
    /** `inicio + duracao_min`, gravado pela aplicação: o `EXCLUDE` usa o intervalo [inicio, fim). */
    fim: instante().notNull(),
    duracaoMin: integer().notNull(),
    tipo: text().notNull(),
    status: text().notNull(),
    motivo: text(),
    motivoCancelamento: text(),
    eventos: jsonb().$type<EventoConsulta[]>().notNull().default([]),
  },
  (t) => [
    check('consultas_fim_depois_do_inicio', sql`${t.fim} > ${t.inicio}`),
    index('consultas_medico_inicio').on(t.medicoId, t.inicio),
    index('consultas_paciente_inicio').on(t.pacienteId, t.inicio),
  ],
);

export const atividades = pgTable(
  'atividades',
  {
    id: text().primaryKey(),
    tipo: text().notNull(),
    descricao: text().notNull(),
    em: instante().notNull(),
    referenciaId: text(),
  },
  (t) => [index('atividades_em').on(t.em)],
);

// ---------------------------------------------------------------- Leitos

export const leitos = pgTable(
  'leitos',
  {
    ...base,
    codigo: text().notNull(),
    setorId: text().notNull(),
    quarto: text(),
    perfil: text().notNull(),
    isolamento: boolean().notNull().default(false),
    status: text().notNull(),
    // Ponteiros de volta (sem chave estrangeira; ver o cabeçalho).
    internacaoId: text(),
    atendimentoId: text(),
    solicitacaoId: text(),
    desde: instante().notNull(),
    bloqueio: jsonb().$type<BloqueioLeito>(),
    higienizacao: jsonb().$type<{ tipo: string }>(),
  },
  (t) => [uniqueIndex('leitos_codigo_unico').on(t.codigo), index('leitos_setor').on(t.setorId)],
);

export const atendimentos = pgTable(
  'atendimentos',
  {
    ...base,
    arquivado: boolean(),
    /** Dia da chegada no fuso do hospital (A8): a numeração recomeça a cada dia. */
    dia: date({ mode: 'string' }).notNull(),
    numero: text().notNull(),
    pacienteId: text().references(() => pacientes.id),
    provisorio: jsonb().$type<IdentificacaoProvisoria>(),
    chegadaEm: instante().notNull(),
    modoChegada: text().notNull(),
    queixa: text().notNull(),
    risco: text().$type<CorRisco>(),
    prazo: instante(),
    triagens: jsonb().$type<Triagem[]>().notNull().default([]),
    reavaliacoes: jsonb().$type<Reavaliacao[]>().notNull().default([]),
    status: text().notNull(),
    medicoId: text().references(() => medicos.id),
    leitoObservacaoId: text().references(() => leitos.id),
    solicitacaoId: text(),
    statusAntesDoLeito: text(),
    desfecho: jsonb().$type<Desfecho>(),
    eventos: jsonb().$type<EventoAtendimento[]>().notNull().default([]),
  },
  (t) => [
    // R-E1 / A8: número único no dia.
    uniqueIndex('atendimentos_numero_no_dia').on(t.dia, t.numero),
    // R-E10: um atendimento aberto por paciente.
    uniqueIndex('atendimentos_um_aberto_por_paciente')
      .on(t.pacienteId)
      .where(sql`${t.status} <> 'encerrado' and ${t.pacienteId} is not null`),
    index('atendimentos_status').on(t.status),
  ],
);

export const solicitacoes = pgTable(
  'solicitacoes',
  {
    ...base,
    arquivado: boolean(),
    origem: text().notNull(),
    atendimentoId: text().references(() => atendimentos.id),
    pacienteId: text()
      .notNull()
      .references(() => pacientes.id),
    setorDesejado: text().notNull(),
    precaucao: text().notNull(),
    motivo: text().notNull(),
    dataPrevista: date({ mode: 'string' }),
    prioridade: text().$type<CorRisco>().notNull(),
    justificativaPrioridade: text(),
    status: text().notNull(),
    leitoReservadoId: text().references(() => leitos.id),
    reservadaEm: instante(),
    // Ponteiro de volta (sem chave estrangeira).
    internacaoId: text(),
    motivoCancelamento: text(),
    canceladaEm: instante(),
    autor: text().notNull(),
  },
  (t) => [index('solicitacoes_status').on(t.status)],
);

export const internacoes = pgTable(
  'internacoes',
  {
    ...base,
    arquivado: boolean(),
    pacienteId: text()
      .notNull()
      .references(() => pacientes.id),
    leitoId: text()
      .notNull()
      .references(() => leitos.id),
    medicoResponsavelId: text()
      .notNull()
      .references(() => medicos.id),
    origem: text().notNull(),
    hospitalOrigem: text(),
    atendimentoId: text().references(() => atendimentos.id),
    solicitacaoId: text().references((): AnyPgColumn => solicitacoes.id),
    motivo: text().notNull(),
    precaucao: text().notNull(),
    inicio: instante().notNull(),
    previsaoAlta: date({ mode: 'string' }),
    status: text().notNull(),
    alta: jsonb().$type<AltaInternacao>(),
    eventos: jsonb().$type<EventoInternacao[]>().notNull().default([]),
  },
  (t) => [
    // R-L1: uma internação ativa por paciente e por leito.
    uniqueIndex('internacoes_uma_ativa_por_paciente')
      .on(t.pacienteId)
      .where(sql`${t.status} = 'ativa'`),
    uniqueIndex('internacoes_uma_ativa_por_leito')
      .on(t.leitoId)
      .where(sql`${t.status} = 'ativa'`),
    index('internacoes_status').on(t.status),
  ],
);

// ---------------------------------------------------------------- Farmácia

export const medicamentos = pgTable(
  'medicamentos',
  {
    ...base,
    ...inativavel,
    nome: text().notNull(),
    nomeComercial: text(),
    principioAtivo: text().notNull(),
    classe: text(),
    concentracao: text().notNull(),
    forma: text().notNull(),
    unidade: text().notNull(),
    controlado: jsonb().$type<{ lista: string }>(),
    unidadesPorEmbalagem: integer(),
    estoqueMinimo: integer().notNull(),
  },
  (t) => [
    check('medicamentos_estoque_minimo', sql`${t.estoqueMinimo} >= 0`),
    index('medicamentos_nome').on(t.nome),
  ],
);

export const lotes = pgTable(
  'lotes',
  {
    ...base,
    medicamentoId: text()
      .notNull()
      .references(() => medicamentos.id),
    numero: text().notNull(),
    validade: date({ mode: 'string' }).notNull(),
    fabricante: text(),
    notaFiscal: text(),
    quantidadeInicial: integer().notNull(),
    quantidadeAtual: integer().notNull(),
    entradaEm: instante().notNull(),
    bloqueio: jsonb().$type<BloqueioLote>(),
    saldoArquivado: integer().notNull().default(0),
  },
  (t) => [
    // INV-8: o estoque do lote nunca fica negativo.
    check('lotes_quantidade_atual_nao_negativa', sql`${t.quantidadeAtual} >= 0`),
    check('lotes_quantidade_inicial_positiva', sql`${t.quantidadeInicial} > 0`),
    // F2: o mesmo número de lote não se repete no medicamento (sem diferença de maiúsculas).
    uniqueIndex('lotes_numero_por_medicamento').on(t.medicamentoId, sql`upper(${t.numero})`),
    index('lotes_validade').on(t.medicamentoId, t.validade),
  ],
);

export const dispensacoes = pgTable(
  'dispensacoes',
  {
    ...base,
    arquivado: boolean(),
    pacienteId: text()
      .notNull()
      .references(() => pacientes.id),
    destino: jsonb().$type<{ tipo: 'internacao' | 'emergencia'; id: string }>().notNull(),
    medicoSolicitanteId: text()
      .notNull()
      .references(() => medicos.id),
    itens: jsonb().$type<ItemDispensacao[]>().notNull(),
    alertasConfirmados: jsonb().$type<AlertaConfirmado[]>().notNull().default([]),
    status: text().$type<'realizada' | 'estornada'>().notNull(),
    estorno: jsonb().$type<{ em: string; motivo: string; autor: string }>(),
    em: instante().notNull(),
    autor: text().notNull(),
  },
  (t) => [index('dispensacoes_paciente').on(t.pacienteId, t.em)],
);

/** Imutável (R-F9): o usuário da aplicação não tem `UPDATE` nem `DELETE` (migração 0001). */
export const movimentacoes = pgTable(
  'movimentacoes',
  {
    id: text().primaryKey(),
    tipo: text().notNull(),
    medicamentoId: text()
      .notNull()
      .references(() => medicamentos.id),
    loteId: text()
      .notNull()
      .references(() => lotes.id),
    quantidade: integer().notNull(),
    saldoLoteApos: integer().notNull(),
    dispensacaoId: text().references(() => dispensacoes.id),
    motivo: text(),
    termo: text(),
    autor: text().notNull(),
    em: instante().notNull(),
  },
  (t) => [
    check('movimentacoes_quantidade_positiva', sql`${t.quantidade} > 0`),
    check('movimentacoes_saldo_nao_negativo', sql`${t.saldoLoteApos} >= 0`),
    index('movimentacoes_medicamento_em').on(t.medicamentoId, t.em),
    index('movimentacoes_lote').on(t.loteId),
  ],
);

/** Resumos mensais (A15): o id é o mês (`2026-11`). */
export const resumos = pgTable('resumos', {
  id: text().primaryKey(),
  internacoes: integer().notNull().default(0),
  altasPorTipo: jsonb().$type<Partial<Record<TipoAlta, number>>>().notNull().default({}),
  atendimentosPorCor: jsonb().$type<Partial<Record<CorRisco, number>>>().notNull().default({}),
  atendimentosPorDesfecho: jsonb()
    .$type<Partial<Record<TipoDesfecho, number>>>()
    .notNull()
    .default({}),
  esperaPorCor: jsonb()
    .$type<Partial<Record<CorRisco, { soma: number; n: number }>>>()
    .notNull()
    .default({}),
  dispensacoes: integer().notNull().default(0),
  saidasPorMedicamento: jsonb().$type<Record<string, number>>().notNull().default({}),
});

/** As 13 tabelas, na ordem em que podem ser preenchidas sem violar as chaves estrangeiras. */
export const TABELAS = {
  pacientes,
  medicos,
  consultas,
  atividades,
  leitos,
  atendimentos,
  solicitacoes,
  internacoes,
  medicamentos,
  lotes,
  dispensacoes,
  movimentacoes,
  resumos,
} as const;
