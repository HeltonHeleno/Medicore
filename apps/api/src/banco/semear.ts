/**
 * Fase 24 (24.2.7, A16) — Semeadura dos dados de exemplo no banco.
 *
 * Usa os mesmos geradores do navegador (`@medicore/dominio/seeds`), com o relógio do domínio: o
 * banco fica com os mesmos registros e os mesmos números do Painel de hoje (72% de ocupação,
 * 3 medicamentos com estoque baixo). Só para os ambientes de desenvolvimento, teste, homologação e
 * demonstração (D27): nunca em produção.
 *
 * Uso: `npm run db:semear` (`semear-cli.ts`; recusa se o banco já tiver pacientes, a não ser com
 * `--substituir`).
 */
import { semearAtividades } from '@medicore/dominio/seeds/atividades';
import { semearConsultas } from '@medicore/dominio/seeds/consultas';
import { semearMedicos } from '@medicore/dominio/seeds/medicos';
import { gerarDadosOperacionais } from '@medicore/dominio/seeds/operacoes';
import { semearPacientes } from '@medicore/dominio/seeds/pacientes';
import type { Atendimento, Consulta } from '@medicore/dominio/types';
import { dataDoInstante } from '@medicore/dominio/utils/datas';
import { agora } from '@medicore/dominio/utils/relogio';
import { count, getTableName, sql } from 'drizzle-orm';
import type { PgInsertValue, PgTable } from 'drizzle-orm/pg-core';
import type { Banco } from './conexao';
import * as e from './esquema';

const MINUTO = 60_000;

/** Consulta → linha: o banco guarda também o `fim` (usado pelo `EXCLUDE`). */
export const linhaConsulta = (c: Consulta) => ({
  ...c,
  fim: new Date(new Date(c.inicio).getTime() + c.duracaoMin * MINUTO).toISOString(),
});

/** Atendimento → linha: o banco guarda também o `dia` da chegada (A8, `UNIQUE (dia, numero)`). */
export const linhaAtendimento = (a: Atendimento) => ({ ...a, dia: dataDoInstante(a.chegadaEm) });

/** Monta os dados de exemplo, na ordem das chaves estrangeiras. */
export function dadosDeExemplo(momento: Date = agora()) {
  const pacientes = semearPacientes();
  const medicos = semearMedicos();
  const operacoes = gerarDadosOperacionais({ pacientes, medicos, agora: momento });
  return {
    pacientes,
    medicos,
    consultas: semearConsultas(),
    atividades: semearAtividades(),
    ...operacoes,
  };
}

/** Insere em lotes, para não passar do limite de parâmetros do PostgreSQL. */
async function inserirEmLotes<T extends PgTable>(
  tx: Pick<Banco, 'insert'>,
  tabela: T,
  linhas: readonly PgInsertValue<T>[],
) {
  for (let i = 0; i < linhas.length; i += 200) {
    await tx.insert(tabela).values(linhas.slice(i, i + 200));
  }
}

export interface ResultadoSemeadura {
  contagens: Record<keyof typeof e.TABELAS, number>;
}

/**
 * Apaga tudo (com `substituir`) e insere os dados de exemplo numa transação só.
 * Precisa de uma conexão com permissão de `DELETE` em movimentações: a do dono das tabelas.
 */
export async function semear(
  banco: Banco,
  opcoes: { substituir?: boolean; momento?: Date } = {},
): Promise<ResultadoSemeadura> {
  const d = dadosDeExemplo(opcoes.momento);
  await banco.transaction(async (tx) => {
    const [{ n }] = await tx.select({ n: count() }).from(e.pacientes);
    if (n > 0 && !opcoes.substituir) {
      throw new Error('O banco já tem dados. Use --substituir para apagar e semear de novo.');
    }
    if (opcoes.substituir) {
      const nomes = Object.values(e.TABELAS)
        .map((t) => `"${getTableName(t)}"`)
        .join(', ');
      await tx.execute(sql.raw(`TRUNCATE ${nomes}`));
    }
    await inserirEmLotes(tx, e.pacientes, d.pacientes);
    await inserirEmLotes(tx, e.medicos, d.medicos);
    await inserirEmLotes(tx, e.consultas, d.consultas.map(linhaConsulta));
    await inserirEmLotes(tx, e.atividades, d.atividades);
    await inserirEmLotes(tx, e.leitos, d.leitos);
    await inserirEmLotes(tx, e.atendimentos, d.atendimentos.map(linhaAtendimento));
    await inserirEmLotes(tx, e.solicitacoes, d.solicitacoes);
    await inserirEmLotes(tx, e.internacoes, d.internacoes);
    await inserirEmLotes(tx, e.medicamentos, d.medicamentos);
    await inserirEmLotes(tx, e.lotes, d.lotes);
    await inserirEmLotes(tx, e.dispensacoes, d.dispensacoes);
    await inserirEmLotes(tx, e.movimentacoes, d.movimentacoes);
    await inserirEmLotes(tx, e.resumos, d.resumos);
  });
  return {
    contagens: {
      pacientes: d.pacientes.length,
      medicos: d.medicos.length,
      consultas: d.consultas.length,
      atividades: d.atividades.length,
      leitos: d.leitos.length,
      atendimentos: d.atendimentos.length,
      solicitacoes: d.solicitacoes.length,
      internacoes: d.internacoes.length,
      medicamentos: d.medicamentos.length,
      lotes: d.lotes.length,
      dispensacoes: d.dispensacoes.length,
      movimentacoes: d.movimentacoes.length,
      resumos: d.resumos.length,
    },
  };
}
