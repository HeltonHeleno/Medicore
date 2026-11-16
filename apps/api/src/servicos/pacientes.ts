/**
 * Fase 25 (25.1.1) — Pacientes no servidor (P1–P5, R-P1–R-P6, R-X2, R-X3).
 * Mesmas regras de `apps/web/src/services/pacientes.ts`; as gravações são uma transação do banco.
 */
import { janela, paginado } from '@medicore/dominio/contrato/lista';
import type { filtrosPacientes } from '@medicore/dominio/contrato/cadastros';
import { ErroConflito, type PendenciaModulo } from '@medicore/dominio/erros';
import { t } from '@medicore/dominio/i18n/pt-BR';
import type { DadosPaciente } from '@medicore/dominio/schemas/paciente';
import type { Consulta, Paciente, PacienteResumo, Paginado } from '@medicore/dominio/types';
import { normalizar } from '@medicore/dominio/utils/busca';
import { hojeNoFuso } from '@medicore/dominio/utils/datas';
import { nomeExibicaoPaciente } from '@medicore/dominio/utils/cadastros';
import { gerarId } from '@medicore/dominio/utils/id';
import { ocultarCpf } from '@medicore/dominio/utils/mascaras';
import { somenteDigitos } from '@medicore/dominio/utils/validacao';
import { and, asc, count, desc, eq, gte, ne, sql, type SQL } from 'drizzle-orm';
import type { z } from 'zod';
import type { Banco } from '../banco/conexao';
import { deLinha } from '../banco/conversao';
import { consultas, pacientes } from '../banco/esquema';
import { textoPtBr } from '../http/lista';
import { registrarAtividade } from './atividades';
import {
  atualizarRegistro,
  conferirVersao,
  emTransacao,
  type Executor,
  inserirRegistro,
  lerOuFalhar,
  momento,
  paraLike,
} from './comum';
import { pendenciasPaciente, temHistoricoNosModulos } from './pendencias';

export type FiltrosPacientesApi = z.output<typeof filtrosPacientes>;

const NAO_ENCONTRADO = () => t.erros.pacienteNaoEncontrado;

/** Mesmo texto no SQL: `coalesce(nome_social, nome)`. */
export const nomeExibicaoSql = sql<string>`coalesce(nullif(${pacientes.nomeSocial}, ''), ${pacientes.nome})`;

/**
 * Idade como `idade()` do domínio, no fuso do hospital: quem nasceu em 29/02 faz aniversário em
 * 28/02 nos anos que não são bissextos (o `age()` do PostgreSQL faria em 01/03).
 */
function idadeSql(hoje: string): SQL<number> {
  const r = sql`${hoje}::date`;
  const n = pacientes.dataNascimento;
  const bissexto = sql`((extract(year from ${r})::int % 4 = 0 and extract(year from ${r})::int % 100 <> 0) or extract(year from ${r})::int % 400 = 0)`;
  const diaAniv = sql`(case when extract(month from ${n}) = 2 and extract(day from ${n}) = 29 and not ${bissexto} then 28 else extract(day from ${n})::int end)`;
  return sql<number>`(extract(year from ${r})::int - extract(year from ${n})::int - (case when extract(month from ${r}) < extract(month from ${n}) or (extract(month from ${r}) = extract(month from ${n}) and extract(day from ${r}) < ${diaAniv}) then 1 else 0 end))::int`;
}

/**
 * A4 (como `filtrarPorTermo`): 3+ dígitos e nenhuma letra → só os dígitos do CPF e do telefone;
 * senão, cada palavra (sem acentos nem maiúsculas) aparece no nome ou no nome social.
 */
export function buscaPaciente(termo: string | undefined): SQL | undefined {
  const bruto = (termo ?? '').trim();
  if (!bruto) return undefined;
  const digitos = somenteDigitos(bruto);
  if (digitos.length >= 3 && !/\p{L}/u.test(bruto)) {
    const padrao = `%${digitos}%`;
    return sql`(${pacientes.cpf} like ${padrao} or regexp_replace(${pacientes.telefone}, '\\D', '', 'g') like ${padrao})`;
  }
  const alvo = sql`regexp_replace(lower(unaccent(${pacientes.nome} || ' ' || coalesce(${pacientes.nomeSocial}, ''))), '\\s+', ' ', 'g')`;
  return and(
    ...normalizar(bruto)
      .split(' ')
      .map((p) => sql`${alvo} like ${`%${paraLike(p)}%`}`),
  );
}

const filtroStatus = (status: 'ativos' | 'inativos' | 'todos'): SQL | undefined =>
  status === 'todos' ? undefined : eq(pacientes.ativo, status === 'ativos');

/** Consultas agendadas que ainda não começaram, em ordem de início. */
export async function consultasFuturasAgendadas(
  tx: Executor,
  filtro: SQL | undefined,
): Promise<Consulta[]> {
  const linhas = await tx
    .select()
    .from(consultas)
    .where(and(eq(consultas.status, 'agendada'), gte(consultas.inicio, momento()), filtro))
    .orderBy(asc(consultas.inicio), asc(consultas.id));
  return linhas.map((l) => deLinha<Consulta>(consultas, l));
}

// ───────────────────────── leitura ─────────────────────────

/** R-G3: por padrão, só ativos. Busca por nome, nome social, CPF ou telefone (A4). */
export async function listarPacientes(
  banco: Executor,
  filtros: FiltrosPacientesApi,
): Promise<Paginado<PacienteResumo>> {
  const onde = and(filtroStatus(filtros.status), buscaPaciente(filtros.busca));
  const [{ total }] = await banco.select({ total: count() }).from(pacientes).where(onde);
  const { limite, deslocamento } = janela(filtros, total);

  const idade = idadeSql(hojeNoFuso());
  // Nomes qualificados à mão: no SELECT de uma tabela só, o Drizzle tira o nome da tabela das
  // colunas, e dentro da subconsulta "id" seria o da consulta.
  const proxima = sql<
    string | null
  >`(select min(c.inicio) from consultas c where c.paciente_id = "pacientes"."id" and c.status = 'agendada' and c.inicio >= ${momento()})`;
  const direcao = filtros.ordem === 'desc' ? desc : asc;
  const chave = {
    nome: textoPtBr(nomeExibicaoSql),
    idade,
    proximaConsulta: proxima,
  }[filtros.ordenarPor];

  const linhas = await banco
    .select({
      id: pacientes.id,
      nomeExibicao: nomeExibicaoSql,
      cpf: pacientes.cpf,
      idade,
      telefone: pacientes.telefone,
      convenio: pacientes.convenio,
      alergias: pacientes.alergias,
      proxima,
      ativo: pacientes.ativo,
    })
    .from(pacientes)
    .where(onde)
    // Vazios sempre no fim; desempate pelo id (como o `ordenar` das telas).
    .orderBy(sql`${direcao(chave)} nulls last`, sql`${pacientes.id} collate "und-x-icu"`)
    .limit(limite)
    .offset(deslocamento);

  const itens: PacienteResumo[] = linhas.map((l) => ({
    id: l.id,
    nomeExibicao: l.nomeExibicao,
    cpfMascarado: ocultarCpf(l.cpf),
    idade: Number(l.idade),
    telefone: l.telefone,
    convenioNome: l.convenio.tipo === 'convenio' ? l.convenio.nome : t.convenio.particular,
    temAlergias: Boolean(l.alergias),
    ...(l.proxima ? { proximaConsulta: new Date(l.proxima).toISOString() } : {}),
    ativo: l.ativo,
  }));
  return paginado(itens, total, filtros);
}

export const obterPaciente = (banco: Executor, id: string) =>
  lerOuFalhar<Paciente>(banco, pacientes, id, NAO_ENCONTRADO());

/** Cadastro que já usa este CPF (R-P1), ou `null`. */
export async function pacienteComCpf(
  banco: Executor,
  cpf: string,
  ignorarId?: string,
): Promise<{ id: string; nomeExibicao: string } | null> {
  const [p] = await banco
    .select({ id: pacientes.id, nomeExibicao: nomeExibicaoSql })
    .from(pacientes)
    .where(and(eq(pacientes.cpf, cpf), ignorarId ? ne(pacientes.id, ignorarId) : undefined))
    .limit(1);
  return p ?? null;
}

/** O paciente já teve alguma consulta? (R-P3). */
export async function pacienteTemConsultas(banco: Executor, id: string): Promise<boolean> {
  return (await banco.$count(consultas, eq(consultas.pacienteId, id))) > 0;
}

export const consultasFuturasDoPaciente = (banco: Executor, id: string) =>
  consultasFuturasAgendadas(banco, eq(consultas.pacienteId, id));

export const pendenciasDoPaciente = (banco: Executor, id: string): Promise<PendenciaModulo[]> =>
  pendenciasPaciente(banco, id);

// ───────────────────────── escrita ─────────────────────────

async function garantirCpfUnico(tx: Executor, cpf: string, ignorarId?: string) {
  const existente = await pacienteComCpf(tx, cpf, ignorarId);
  if (existente) {
    throw new ErroConflito('cpf_duplicado', t.erros.cpfDuplicado, {
      campo: 'cpf',
      detalhes: { id: existente.id },
    });
  }
}

/** Campos opcionais: na edição, o que veio vazio apaga o valor anterior. */
const OPCIONAIS = {
  nomeSocial: undefined,
  email: undefined,
  endereco: undefined,
  responsavel: undefined,
  tipoSanguineo: undefined,
  alergias: undefined,
  contatoEmergencia: undefined,
  observacoes: undefined,
} satisfies Partial<Record<keyof Paciente, undefined>>;

/** O consentimento vira `{ aceito, em }` no serviço; o `true` do formulário não é gravado. */
function semConsentimento(dados: DadosPaciente): Omit<DadosPaciente, 'consentimentoLgpd'> {
  const resto: Partial<DadosPaciente> = { ...dados };
  delete resto.consentimentoLgpd;
  return resto as Omit<DadosPaciente, 'consentimentoLgpd'>;
}

/** P1 */
export function criarPaciente(banco: Banco, dados: DadosPaciente): Promise<Paciente> {
  return emTransacao(banco, async (tx) => {
    await garantirCpfUnico(tx, dados.cpf);
    const agoraIso = momento();
    const paciente = await inserirRegistro<Paciente>(tx, pacientes, {
      ...semConsentimento(dados),
      id: gerarId(),
      criadoEm: agoraIso,
      atualizadoEm: agoraIso,
      versao: 1,
      ativo: true,
      consentimentoLgpd: { aceito: true, em: agoraIso },
    });
    await registrarAtividade(
      tx,
      'paciente_cadastrado',
      t.textosAtividade.pacienteCadastrado(nomeExibicaoPaciente(paciente)),
      paciente.id,
    );
    return paciente;
  });
}

/** P2 — `versao` é a que a tela carregou (R-G1). */
export function atualizarPaciente(
  banco: Banco,
  id: string,
  dados: DadosPaciente,
  versao: number,
): Promise<Paciente> {
  return emTransacao(banco, async (tx) => {
    const atual = await lerOuFalhar<Paciente>(tx, pacientes, id, NAO_ENCONTRADO(), {
      bloquear: true,
    });
    conferirVersao(atual, versao);
    await garantirCpfUnico(tx, dados.cpf, id);
    return atualizarRegistro(tx, pacientes, atual, { ...OPCIONAIS, ...semConsentimento(dados) });
  });
}

/** P3 / R-P2 / R-X2: inativa e cancela as consultas futuras; devolve quantas cancelou. */
export function inativarPaciente(
  banco: Banco,
  id: string,
  motivo: string | undefined,
  versao?: number,
): Promise<number> {
  return emTransacao(banco, async (tx) => {
    const paciente = await lerOuFalhar<Paciente>(tx, pacientes, id, NAO_ENCONTRADO(), {
      bloquear: true,
    });
    conferirVersao(paciente, versao);
    if (!paciente.ativo) return 0;
    const pendencias = await pendenciasPaciente(tx, id);
    if (pendencias.length > 0) {
      throw new ErroConflito(
        'pendencias_modulos',
        t.operacoes.pendenciasInativarPaciente(pendencias.length),
        { detalhes: { itens: pendencias } },
      );
    }
    const agoraIso = momento();
    const futuras = await consultasFuturasAgendadas(tx, eq(consultas.pacienteId, id));
    const motivoCancelamento = t.conflitos.motivoPacienteInativado;
    for (const c of futuras) {
      await atualizarRegistro(tx, consultas, c, {
        status: 'cancelada',
        motivoCancelamento,
        eventos: [...c.eventos, { tipo: 'cancelada', em: agoraIso, detalhe: motivoCancelamento }],
      });
    }
    await atualizarRegistro(tx, pacientes, paciente, {
      ativo: false,
      inativadoEm: agoraIso,
      motivoInativacao: motivo?.trim() || undefined,
    });
    await registrarAtividade(
      tx,
      'paciente_inativado',
      t.textosAtividade.pacienteInativado(nomeExibicaoPaciente(paciente)),
      id,
    );
    return futuras.length;
  });
}

/** P4 */
export function reativarPaciente(banco: Banco, id: string, versao?: number): Promise<Paciente> {
  return emTransacao(banco, async (tx) => {
    const atual = await lerOuFalhar<Paciente>(tx, pacientes, id, NAO_ENCONTRADO(), {
      bloquear: true,
    });
    conferirVersao(atual, versao);
    return atualizarRegistro(tx, pacientes, atual, {
      ativo: true,
      inativadoEm: undefined,
      motivoInativacao: undefined,
    });
  });
}

/** P5 / R-P3 / R-X3: só quem nunca teve consulta nem registro nos módulos é excluído. */
export function excluirPaciente(banco: Banco, id: string, versao?: number): Promise<void> {
  return emTransacao(banco, async (tx) => {
    const atual = await lerOuFalhar<Paciente>(tx, pacientes, id, NAO_ENCONTRADO(), {
      bloquear: true,
    });
    conferirVersao(atual, versao);
    if (await pacienteTemConsultas(tx, id)) {
      throw new ErroConflito('tem_historico', t.conflitos.temHistorico);
    }
    if (await temHistoricoNosModulos(tx, id)) {
      throw new ErroConflito('tem_historico', t.operacoes.pendenciasExcluirPaciente);
    }
    await tx.delete(pacientes).where(eq(pacientes.id, id));
  });
}
