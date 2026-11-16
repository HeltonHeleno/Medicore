/**
 * Fase 25 (25.1.2) — Médicos no servidor (P6–P8, R-M1–R-M4, R-X4).
 * Mesmas regras de `apps/web/src/services/medicos.ts`.
 */
import { DEPARTAMENTOS, nomeDepartamento } from '@medicore/dominio/config/departamentos';
import type { filtrosMedicos } from '@medicore/dominio/contrato/cadastros';
import { janela, paginado } from '@medicore/dominio/contrato/lista';
import { ErroConflito, type PendenciaModulo } from '@medicore/dominio/erros';
import { t } from '@medicore/dominio/i18n/pt-BR';
import type { DadosMedico } from '@medicore/dominio/schemas/medico';
import type {
  Consulta,
  DiaSemana,
  Disponibilidade,
  Medico,
  MedicoResumo,
  Paginado,
  UF,
} from '@medicore/dominio/types';
import { consultasForaDaDisponibilidade } from '@medicore/dominio/utils/agenda';
import { normalizar } from '@medicore/dominio/utils/busca';
import { nomeExibicaoMedico, resumirDisponibilidade } from '@medicore/dominio/utils/cadastros';
import { hojeNoFuso, instanteNoFuso, somarDias } from '@medicore/dominio/utils/datas';
import { gerarId } from '@medicore/dominio/utils/id';
import { formatarCrm } from '@medicore/dominio/utils/mascaras';
import { somenteDigitos } from '@medicore/dominio/utils/validacao';
import { and, asc, count, desc, eq, ne, sql, type SQL } from 'drizzle-orm';
import type { z } from 'zod';
import type { Banco } from '../banco/conexao';
import { consultas, medicos } from '../banco/esquema';
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
import { consultasFuturasAgendadas } from './pacientes';
import { pendenciasMedico } from './pendencias';

export type FiltrosMedicosApi = z.output<typeof filtrosMedicos>;

const NAO_ENCONTRADO = () => t.erros.medicoNaoEncontrado;

/** O zod devolve `number[]`; aqui os dias já foram validados (0–6). */
const paraMedico = (dados: DadosMedico) => ({
  ...dados,
  disponibilidade: {
    ...dados.disponibilidade,
    diasSemana: dados.disponibilidade.diasSemana as DiaSemana[],
    duracaoPadraoMin: dados.disponibilidade.duracaoPadraoMin as Disponibilidade['duracaoPadraoMin'],
  },
});

const crmNumero = sql<string>`(${medicos.crm} ->> 'numero')`;
const crmUf = sql<string>`(${medicos.crm} ->> 'uf')`;

/** A4: dígitos no CRM e no telefone; palavras no nome (sem o "Dr./Dra."). */
function buscaMedico(termo: string | undefined): SQL | undefined {
  const bruto = (termo ?? '').trim();
  if (!bruto) return undefined;
  const digitos = somenteDigitos(bruto);
  if (digitos.length >= 3 && !/\p{L}/u.test(bruto)) {
    const padrao = `%${digitos}%`;
    return sql`(regexp_replace(${crmNumero}, '\\D', '', 'g') like ${padrao} or regexp_replace(${medicos.telefone}, '\\D', '', 'g') like ${padrao})`;
  }
  const alvo = sql`regexp_replace(lower(unaccent(${medicos.nome})), '\\s+', ' ', 'g')`;
  return and(
    ...normalizar(bruto)
      .split(' ')
      .map((p) => sql`${alvo} like ${`%${paraLike(p)}%`}`),
  );
}

/** Nome do departamento no SQL (para ordenar), a partir da lista do domínio. */
const departamentoNomeSql = sql`(case ${medicos.departamentoId} ${sql.join(
  DEPARTAMENTOS.map((d) => sql`when ${d.id} then ${d.nome}`),
  sql` `,
)} else ${medicos.departamentoId} end)`;

const futurasDoMedico = (tx: Executor, id: string) =>
  consultasFuturasAgendadas(tx, eq(consultas.medicoId, id));

// ───────────────────────── leitura ─────────────────────────

export async function listarMedicos(
  banco: Executor,
  filtros: FiltrosMedicosApi,
): Promise<Paginado<MedicoResumo>> {
  const onde = and(
    filtros.status === 'todos' ? undefined : eq(medicos.ativo, filtros.status === 'ativos'),
    filtros.departamentoId ? eq(medicos.departamentoId, filtros.departamentoId) : undefined,
    buscaMedico(filtros.busca),
  );
  const [{ total }] = await banco.select({ total: count() }).from(medicos).where(onde);
  const { limite, deslocamento } = janela(filtros, total);

  // Consultas de hoje (fuso do hospital), sem as canceladas.
  const hoje = hojeNoFuso();
  const inicioDia = instanteNoFuso(hoje, '00:00').toISOString();
  const fimDia = instanteNoFuso(somarDias(hoje, 1), '00:00').toISOString();
  // Nomes qualificados à mão (ver `listarPacientes`).
  const hojeSql = sql<number>`(select count(*)::int from consultas c where c.medico_id = "medicos"."id" and c.status <> 'cancelada' and c.inicio >= ${inicioDia} and c.inicio < ${fimDia})`;

  const chave =
    filtros.ordenarPor === 'departamento'
      ? textoPtBr(sql`${departamentoNomeSql} || ' ' || ${medicos.nome}`)
      : textoPtBr(sql`${medicos.nome}`);
  const direcao = filtros.ordem === 'desc' ? desc : asc;

  const linhas = await banco
    .select({
      id: medicos.id,
      nome: medicos.nome,
      tratamento: medicos.tratamento,
      crm: medicos.crm,
      departamentoId: medicos.departamentoId,
      disponibilidade: medicos.disponibilidade,
      ativo: medicos.ativo,
      consultasHoje: hojeSql,
    })
    .from(medicos)
    .where(onde)
    .orderBy(direcao(chave), sql`${medicos.id} collate "und-x-icu"`)
    .limit(limite)
    .offset(deslocamento);

  const itens: MedicoResumo[] = linhas.map((m) => ({
    id: m.id,
    nomeExibicao: nomeExibicaoMedico(m as Pick<Medico, 'tratamento' | 'nome'>),
    crmFormatado: formatarCrm(m.crm),
    departamentoId: m.departamentoId,
    departamentoNome: nomeDepartamento(m.departamentoId),
    diasResumo: resumirDisponibilidade(m.disponibilidade),
    consultasHoje: Number(m.consultasHoje),
    ativo: m.ativo,
  }));
  return paginado(itens, total, filtros);
}

export const obterMedico = (banco: Executor, id: string) =>
  lerOuFalhar<Medico>(banco, medicos, id, NAO_ENCONTRADO());

/** Médico que já usa este CRM (R-M1), ou `null`. */
export async function medicoComCrm(
  banco: Executor,
  numero: string,
  uf: UF,
  ignorarId?: string,
): Promise<{ id: string; nomeExibicao: string } | null> {
  const [m] = await banco
    .select({ id: medicos.id, nome: medicos.nome, tratamento: medicos.tratamento })
    .from(medicos)
    .where(
      and(eq(crmNumero, numero), eq(crmUf, uf), ignorarId ? ne(medicos.id, ignorarId) : undefined),
    )
    .limit(1);
  return m ? { id: m.id, nomeExibicao: nomeExibicaoMedico(m as Medico) } : null;
}

export const consultasFuturasDoMedico = (banco: Executor, id: string): Promise<Consulta[]> =>
  futurasDoMedico(banco, id);

/** R-M3 / A3: consultas futuras que ficariam fora de uma nova disponibilidade. */
export async function consultasAfetadas(
  banco: Executor,
  id: string,
  nova: Disponibilidade,
): Promise<Consulta[]> {
  return consultasForaDaDisponibilidade(nova, await futurasDoMedico(banco, id));
}

export const pendenciasDoMedico = (banco: Executor, id: string): Promise<PendenciaModulo[]> =>
  pendenciasMedico(banco, id);

// ───────────────────────── escrita ─────────────────────────

/** R-M1: CRM (número + UF) e e-mail únicos entre médicos. */
async function garantirUnicos(tx: Executor, dados: DadosMedico, ignorarId?: string) {
  const mesmoCrm = await medicoComCrm(tx, dados.crm.numero, dados.crm.uf as UF, ignorarId);
  if (mesmoCrm) {
    throw new ErroConflito('crm_duplicado', t.erros.crmDuplicado, {
      campo: 'crm.numero',
      detalhes: { id: mesmoCrm.id },
    });
  }
  const [mesmoEmail] = await tx
    .select({ id: medicos.id })
    .from(medicos)
    .where(and(eq(medicos.email, dados.email), ignorarId ? ne(medicos.id, ignorarId) : undefined))
    .limit(1);
  if (mesmoEmail) {
    throw new ErroConflito('email_duplicado', t.erros.emailDuplicado, {
      campo: 'email',
      detalhes: { id: mesmoEmail.id },
    });
  }
}

/** P6 */
export function criarMedico(banco: Banco, dados: DadosMedico): Promise<Medico> {
  return emTransacao(banco, async (tx) => {
    await garantirUnicos(tx, dados);
    const agoraIso = momento();
    const medico = await inserirRegistro<Medico>(tx, medicos, {
      ...paraMedico(dados),
      id: gerarId(),
      criadoEm: agoraIso,
      atualizadoEm: agoraIso,
      versao: 1,
      ativo: true,
    });
    await registrarAtividade(
      tx,
      'medico_cadastrado',
      t.textosAtividade.medicoCadastrado(
        nomeExibicaoMedico(medico),
        nomeDepartamento(medico.departamentoId),
      ),
      medico.id,
    );
    return medico;
  });
}

/** P7 / R-M3: consultas já marcadas não mudam; devolve quantas futuras ficaram fora. */
export function atualizarMedico(
  banco: Banco,
  id: string,
  dados: DadosMedico,
  versao: number,
): Promise<{ medico: Medico; consultasForaDoHorario: number }> {
  return emTransacao(banco, async (tx) => {
    const atual = await lerOuFalhar<Medico>(tx, medicos, id, NAO_ENCONTRADO(), { bloquear: true });
    conferirVersao(atual, versao);
    await garantirUnicos(tx, dados, id);
    const medico = await atualizarRegistro(tx, medicos, atual, paraMedico(dados));
    const fora = consultasForaDaDisponibilidade(
      medico.disponibilidade,
      await futurasDoMedico(tx, id),
    );
    return { medico, consultasForaDoHorario: fora.length };
  });
}

/** P8 / R-M2 / R-X4 */
export function inativarMedico(
  banco: Banco,
  id: string,
  motivo: string | undefined,
  versao?: number,
): Promise<Medico> {
  return emTransacao(banco, async (tx) => {
    const medico = await lerOuFalhar<Medico>(tx, medicos, id, NAO_ENCONTRADO(), {
      bloquear: true,
    });
    conferirVersao(medico, versao);
    if (!medico.ativo) return medico;
    const futuras = await futurasDoMedico(tx, id);
    if (futuras.length > 0) {
      throw new ErroConflito('consultas_futuras', t.conflitos.consultasFuturas(futuras.length), {
        detalhes: { consultas: futuras.map((c) => c.id) },
      });
    }
    const pendencias = await pendenciasMedico(tx, id);
    if (pendencias.length > 0) {
      throw new ErroConflito(
        'pendencias_modulos',
        t.operacoes.pendenciasInativarMedico(pendencias.length),
        { detalhes: { itens: pendencias } },
      );
    }
    return atualizarRegistro(tx, medicos, medico, {
      ativo: false,
      inativadoEm: momento(),
      motivoInativacao: motivo?.trim() || undefined,
    });
  });
}

export function reativarMedico(banco: Banco, id: string, versao?: number): Promise<Medico> {
  return emTransacao(banco, async (tx) => {
    const atual = await lerOuFalhar<Medico>(tx, medicos, id, NAO_ENCONTRADO(), { bloquear: true });
    conferirVersao(atual, versao);
    return atualizarRegistro(tx, medicos, atual, {
      ativo: true,
      inativadoEm: undefined,
      motivoInativacao: undefined,
    });
  });
}
