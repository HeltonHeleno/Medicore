/**
 * Fase 25 (25.1.5) — Regras entre módulos R-X2, R-X3 e R-X4, lidas das tabelas dos módulos
 * (preenchidas pela semeadura; as rotas dos módulos chegam na Fase 26).
 */
import type { PendenciaModulo } from '@medicore/dominio/erros';
import { to } from '@medicore/dominio/i18n/pt-BR/operacoes';
import { and, eq, ne, sql } from 'drizzle-orm';
import {
  atendimentos,
  dispensacoes,
  internacoes,
  leitos,
  pacientes,
  solicitacoes,
} from '../banco/esquema';
import type { Executor } from './comum';

const nomeExibicao = sql<string>`coalesce(nullif(${pacientes.nomeSocial}, ''), ${pacientes.nome})`;

/** R-X2: internação ativa ou atendimento aberto impedem inativar o paciente. */
export async function pendenciasPaciente(
  tx: Executor,
  pacienteId: string,
): Promise<PendenciaModulo[]> {
  const ativas = await tx
    .select({ id: internacoes.id, codigo: leitos.codigo })
    .from(internacoes)
    .leftJoin(leitos, eq(leitos.id, internacoes.leitoId))
    .where(and(eq(internacoes.pacienteId, pacienteId), eq(internacoes.status, 'ativa')))
    .orderBy(internacoes.id);
  const abertos = await tx
    .select({ id: atendimentos.id, numero: atendimentos.numero })
    .from(atendimentos)
    .where(and(eq(atendimentos.pacienteId, pacienteId), ne(atendimentos.status, 'encerrado')))
    .orderBy(atendimentos.id);
  return [
    ...ativas.map((i) => ({
      tipo: 'internacao' as const,
      id: i.id,
      descricao: to.pendenciaInternacao(i.codigo ?? '—'),
    })),
    ...abertos.map((a) => ({
      tipo: 'atendimento' as const,
      id: a.id,
      descricao: to.pendenciaAtendimento(a.numero),
    })),
  ];
}

/** R-X3: quem já teve internação, atendimento, pedido de leito ou dispensação não é excluído. */
export async function temHistoricoNosModulos(tx: Executor, pacienteId: string): Promise<boolean> {
  const contagens = await Promise.all([
    tx.$count(internacoes, eq(internacoes.pacienteId, pacienteId)),
    tx.$count(atendimentos, eq(atendimentos.pacienteId, pacienteId)),
    tx.$count(solicitacoes, eq(solicitacoes.pacienteId, pacienteId)),
    tx.$count(dispensacoes, eq(dispensacoes.pacienteId, pacienteId)),
  ]);
  return contagens.some((n) => n > 0);
}

/** R-X4: responsável por internação ativa ou com atendimento aberto. */
export async function pendenciasMedico(tx: Executor, medicoId: string): Promise<PendenciaModulo[]> {
  const ativas = await tx
    .select({ id: internacoes.id, codigo: leitos.codigo, nome: nomeExibicao })
    .from(internacoes)
    .leftJoin(leitos, eq(leitos.id, internacoes.leitoId))
    .leftJoin(pacientes, eq(pacientes.id, internacoes.pacienteId))
    .where(and(eq(internacoes.medicoResponsavelId, medicoId), eq(internacoes.status, 'ativa')))
    .orderBy(internacoes.id);
  const abertos = await tx
    .select({ id: atendimentos.id, numero: atendimentos.numero })
    .from(atendimentos)
    .where(and(eq(atendimentos.medicoId, medicoId), ne(atendimentos.status, 'encerrado')))
    .orderBy(atendimentos.id);
  return [
    ...ativas.map((i) => ({
      tipo: 'internacao' as const,
      id: i.id,
      descricao: to.pendenciaResponsavel(i.nome ?? '—', i.codigo ?? '—'),
    })),
    ...abertos.map((a) => ({
      tipo: 'atendimento' as const,
      id: a.id,
      descricao: to.pendenciaMedicoAtendimento(a.numero),
    })),
  ];
}
