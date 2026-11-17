/**
 * Fase 29 (BL-03, D32) — Auditoria: leituras sensíveis e exportações (as gravações entram pelos
 * gatilhos do banco), consulta com filtros, CSV, pedido do titular e a cadeia de hash por dia.
 */
import type {
  AcaoAuditoria,
  DadosDoTitular,
  FiltrosAuditoria,
  RegistroAuditoria,
  ResultadoIntegridade,
} from '@medicore/dominio/contrato/auditoria';
import { ErroNaoEncontrado } from '@medicore/dominio/erros';
import { t } from '@medicore/dominio/i18n/pt-BR';
import { tau } from '@medicore/dominio/i18n/pt-BR/auditoria';
import { dataDoInstante, formatarDataHora, hojeNoFuso } from '@medicore/dominio/utils/datas';
import { agora } from '@medicore/dominio/utils/relogio';
import { and, asc, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Banco } from '../banco/conexao';
import { contextoAtualDaAuditoria } from '../banco/contexto-auditoria';
import { deLinha } from '../banco/conversao';
import * as e from '../banco/esquema';
import { janela, paginado } from '@medicore/dominio/contrato/lista';

/** Até quantas linhas o CSV leva (o filtro restringe o resto). */
export const LIMITE_EXPORTACAO = 50_000;

const camelo = (nome: string) => nome.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase());

type LinhaAuditoria = typeof e.auditoria.$inferSelect;

/** Linha do banco → registro da API (sem nulos; nomes de campo como no domínio). */
export function paraRegistro(l: LinhaAuditoria): RegistroAuditoria {
  const campos = l.campos
    ? Object.fromEntries(Object.entries(l.campos).map(([k, v]) => [camelo(k), v]))
    : undefined;
  return {
    id: Number(l.id),
    em: new Date(l.em).toISOString(),
    ...(l.usuarioId ? { usuarioId: l.usuarioId } : {}),
    ...(l.usuarioNome ? { usuarioNome: l.usuarioNome } : {}),
    ...(l.ip ? { ip: l.ip } : {}),
    ...(l.agente ? { agente: l.agente } : {}),
    origem: l.origem,
    acao: l.acao,
    entidade: l.entidade,
    ...(l.registroId ? { registroId: l.registroId } : {}),
    ...(l.pacienteId ? { pacienteId: l.pacienteId } : {}),
    ...(campos ? { campos } : {}),
    ...(l.detalhe ? { detalhe: l.detalhe } : {}),
  };
}

// ─────────── registrar leituras e exportações (BL-03.2) ───────────

export interface Acesso {
  acao: Extract<AcaoAuditoria, 'leitura' | 'exportacao'>;
  entidade: string;
  registroId?: string;
  pacienteId?: string;
  /** O que foi visto (códigos separados por vírgula: `cadastro,cpf_completo,alergias`). */
  detalhe: string;
}

/** Grava a leitura ou a exportação, com quem, de onde e quando (sem o conteúdo). */
export async function registrarAcesso(banco: Pick<Banco, 'insert'>, a: Acesso): Promise<void> {
  const c = contextoAtualDaAuditoria();
  const em = agora();
  await banco.insert(e.auditoria).values({
    em: em.toISOString(),
    dia: dataDoInstante(em),
    usuarioId: c.usuarioId ?? null,
    usuarioNome: c.usuarioNome ?? null,
    ip: c.ip ?? null,
    agente: c.agente ?? null,
    origem: c.origem,
    acao: a.acao,
    entidade: a.entidade,
    registroId: a.registroId ?? null,
    pacienteId: a.pacienteId ?? null,
    detalhe: a.detalhe,
  });
}

// ─────────── consultar (BL-03.3) ───────────

function condicoes(f: FiltrosAuditoria): SQL | undefined {
  const c: SQL[] = [];
  if (f.usuarioId) c.push(eq(e.auditoria.usuarioId, f.usuarioId));
  if (f.pacienteId) c.push(eq(e.auditoria.pacienteId, f.pacienteId));
  if (f.acao) c.push(eq(e.auditoria.acao, f.acao));
  if (f.entidade) c.push(eq(e.auditoria.entidade, f.entidade));
  if (f.de) c.push(gte(e.auditoria.dia, f.de));
  if (f.ate) c.push(lte(e.auditoria.dia, f.ate));
  return c.length ? and(...c) : undefined;
}

export async function listarAuditoria(
  banco: Banco,
  f: FiltrosAuditoria & { pagina: number; porPagina: number },
) {
  const onde = condicoes(f);
  const [{ total }] = (await banco
    .select({ total: sql<number>`count(*)::int` })
    .from(e.auditoria)
    .where(onde)) as [{ total: number }];
  const { limite, deslocamento } = janela(f, total);
  const linhas = await banco
    .select()
    .from(e.auditoria)
    .where(onde)
    .orderBy(desc(e.auditoria.em), desc(e.auditoria.id))
    .limit(limite)
    .offset(deslocamento);
  return paginado(linhas.map(paraRegistro), total, f);
}

/** Quem já aparece na trilha ou tem conta (filtro "pessoa"). */
export async function pessoasDaAuditoria(banco: Banco) {
  const linhas = await banco
    .select({ id: e.usuarios.id, nome: e.usuarios.nome })
    .from(e.usuarios)
    .orderBy(sql`${e.usuarios.nome} collate pt_br_base`, asc(e.usuarios.id));
  return linhas;
}

const celula = (v: unknown) => {
  const texto = v === undefined || v === null ? '' : String(v);
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

/** CSV para o Excel em português (`;`, com BOM). A exportação também é registrada. */
export async function exportarAuditoria(banco: Banco, f: FiltrosAuditoria): Promise<string> {
  const linhas = await banco
    .select()
    .from(e.auditoria)
    .where(condicoes(f))
    .orderBy(desc(e.auditoria.em), desc(e.auditoria.id))
    .limit(LIMITE_EXPORTACAO);
  const ta = tau;
  const cabecalho = [
    ta.colunas.em,
    ta.colunas.pessoa,
    ta.colunas.acao,
    ta.colunas.entidade,
    ta.colunas.registro,
    ta.colunas.paciente,
    ta.colunas.ip,
    ta.colunas.detalhe,
  ];
  const corpo = linhas
    .map(paraRegistro)
    .map((r) =>
      [
        formatarDataHora(r.em),
        r.usuarioNome ?? ta.origens[r.origem as keyof typeof ta.origens] ?? r.origem,
        ta.acoes[r.acao],
        r.entidade,
        r.registroId,
        r.pacienteId,
        r.ip,
        r.detalhe ?? Object.keys(r.campos ?? {}).join(', '),
      ]
        .map(celula)
        .join(';'),
    );
  const filtro = Object.entries(f)
    .filter(([k, v]) => v !== undefined && !['pagina', 'porPagina'].includes(k))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(' ');
  await registrarAcesso(banco, {
    acao: 'exportacao',
    entidade: 'auditoria',
    ...(f.pacienteId ? { pacienteId: f.pacienteId } : {}),
    detalhe: `exportacao_auditoria${filtro ? ` (${filtro})` : ''}`,
  });
  return `﻿${[cabecalho.join(';'), ...corpo].join('\r\n')}\r\n`;
}

// ─────────── pedido do titular (BL-03.4) ───────────

async function doPaciente(banco: Banco, tabela: PgTable & { pacienteId: unknown }, id: string) {
  const linhas = (await banco
    .select()
    .from(tabela)
    .where(eq((tabela as unknown as typeof e.consultas).pacienteId, id))) as Record<
    string,
    unknown
  >[];
  return linhas.map((l) => deLinha<Record<string, unknown>>(tabela, l));
}

/** Os dados do paciente e todos os acessos a eles. A geração do relatório também é registrada. */
export async function dadosDoTitular(banco: Banco, pacienteId: string): Promise<DadosDoTitular> {
  const [p] = (await banco
    .select()
    .from(e.pacientes)
    .where(eq(e.pacientes.id, pacienteId))) as Record<string, unknown>[];
  if (!p) throw new ErroNaoEncontrado(t.erros.pacienteNaoEncontrado);
  await registrarAcesso(banco, {
    acao: 'exportacao',
    entidade: 'pacientes',
    registroId: pacienteId,
    pacienteId,
    detalhe: 'pedido_titular',
  });
  const acessos = await banco
    .select()
    .from(e.auditoria)
    .where(eq(e.auditoria.pacienteId, pacienteId))
    .orderBy(desc(e.auditoria.em), desc(e.auditoria.id))
    .limit(LIMITE_EXPORTACAO);
  return {
    geradoEm: agora().toISOString(),
    paciente: deLinha<Record<string, unknown>>(e.pacientes, p),
    consultas: await doPaciente(banco, e.consultas, pacienteId),
    internacoes: await doPaciente(banco, e.internacoes, pacienteId),
    atendimentos: await doPaciente(banco, e.atendimentos, pacienteId),
    dispensacoes: await doPaciente(banco, e.dispensacoes, pacienteId),
    acessos: acessos.map(paraRegistro),
  };
}

// ─────────── cadeia de hash por dia (BL-03.5) ───────────

/** O texto de cada registro que entra no hash (nulos viram `\N`, para não se confundirem). */
const TEXTO_DO_REGISTRO = sql.raw(`concat_ws('|', id::text,
  to_char(em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
  coalesce(usuario_id, '\\N'), coalesce(usuario_nome, '\\N'), coalesce(ip, '\\N'),
  coalesce(agente, '\\N'), origem, acao, entidade, coalesce(registro_id, '\\N'),
  coalesce(paciente_id, '\\N'), coalesce(campos::text, '\\N'), coalesce(detalhe, '\\N'))`);

/** Quantidade, último id e hash encadeado dos registros de um dia. */
async function hashDoDia(banco: Banco, dia: string, anterior: string) {
  const r = await banco.execute<{ n: number; ultimo: string | null; hash: string }>(sql`
    with linhas as (
      select id, encode(sha256(convert_to(${TEXTO_DO_REGISTRO}, 'UTF8')), 'hex') as h
        from ${e.auditoria} where dia = ${dia}::date)
    select count(*)::int as n, max(id)::text as ultimo,
           encode(sha256(convert_to(${anterior} || coalesce(string_agg(h, '' order by id), ''),
                                    'UTF8')), 'hex') as hash
      from linhas`);
  const { n, ultimo, hash } = r.rows[0]!;
  return { quantidade: n, ultimoId: ultimo === null ? null : Number(ultimo), hash };
}

/** Sela os dias que já terminaram (no fuso do hospital) e ainda não têm selo. */
export async function selarDias(banco: Banco): Promise<string[]> {
  const hoje = hojeNoFuso();
  const [ultimo] = await banco
    .select()
    .from(e.auditoriaSelos)
    .orderBy(desc(e.auditoriaSelos.dia))
    .limit(1);
  const dias = await banco.execute<{ dia: string }>(sql`
    select distinct to_char(dia, 'YYYY-MM-DD') as dia from ${e.auditoria}
     where dia < ${hoje}::date ${ultimo ? sql`and dia > ${ultimo.dia}::date` : sql``}
     order by 1`);
  let anterior = ultimo?.hash ?? '';
  const selados: string[] = [];
  for (const { dia } of dias.rows) {
    const h = await hashDoDia(banco, dia, anterior);
    await banco.insert(e.auditoriaSelos).values({
      dia,
      quantidade: h.quantidade,
      ultimoId: h.ultimoId,
      hash: h.hash,
      hashAnterior: anterior || null,
      seladoEm: agora().toISOString(),
    });
    anterior = h.hash;
    selados.push(dia);
  }
  return selados;
}

/**
 * Confere a cadeia: refaz o hash de cada dia selado (a partir de `desde`, se informado). Um
 * registro alterado, apagado ou incluído depois do selo muda o hash do dia.
 */
export async function conferirIntegridade(
  banco: Banco,
  desde?: string,
): Promise<ResultadoIntegridade> {
  const selos = await banco
    .select()
    .from(e.auditoriaSelos)
    .where(desde ? gte(e.auditoriaSelos.dia, desde) : undefined)
    .orderBy(asc(e.auditoriaSelos.dia));
  const violacoes: ResultadoIntegridade['violacoes'] = [];
  let registros = 0;
  for (const s of selos) {
    const h = await hashDoDia(banco, s.dia, s.hashAnterior ?? '');
    registros += h.quantidade;
    if (h.hash !== s.hash || h.quantidade !== s.quantidade) {
      violacoes.push({ dia: s.dia, quantidadeSelada: s.quantidade, quantidadeAtual: h.quantidade });
    }
  }
  return {
    diasConferidos: selos.length,
    registrosConferidos: registros,
    violacoes,
    ...(selos.length ? { ultimoDiaSelado: selos.at(-1)!.dia } : {}),
  };
}
