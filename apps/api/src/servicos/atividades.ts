/**
 * Fase 25 (25.1.4, R-X6) — Linha do tempo do Painel. Cada serviço grava a atividade na mesma
 * transação da operação: se a operação falhar, a atividade também não fica.
 *
 * O limite de 200 atividades do navegador (D15) não existe no banco; a guarda passa a ser da
 * retenção (A15, Fase 26).
 */
import type { Atividade, TipoAtividade } from '@medicore/dominio/types';
import { autoria, autorIdAtual } from '@medicore/dominio/utils/autor';
import { gerarId } from '@medicore/dominio/utils/id';
import { desc } from 'drizzle-orm';
import { deLinha } from '../banco/conversao';
import { atividades } from '../banco/esquema';
import { type Executor, inserirRegistro, momento } from './comum';

export function registrarAtividade(
  tx: Executor,
  tipo: TipoAtividade,
  descricao: string,
  referenciaId?: string,
): Promise<Atividade> {
  return inserirRegistro<Atividade>(tx, atividades, {
    id: gerarId(),
    tipo,
    descricao,
    em: momento(),
    referenciaId,
    // Fase 28 (D31): com login, quem fez.
    ...(autorIdAtual() ? autoria() : {}),
  });
}

/** Atividades da mais recente para a mais antiga. */
export async function listarAtividades(
  tx: Executor,
  { limite = 10 }: { limite?: number } = {},
): Promise<Atividade[]> {
  const linhas = await tx
    .select()
    .from(atividades)
    .orderBy(desc(atividades.em), desc(atividades.id))
    .limit(limite);
  return linhas.map((l) => deLinha<Atividade>(atividades, l));
}
