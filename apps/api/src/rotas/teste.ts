/**
 * Fase 27 (27.T.1) — Rotas só para os testes de ponta a ponta contra a API (`AMBIENTE=teste` e
 * `ROTAS_TESTE=sim`; fora do OpenAPI). Fazem pelo servidor o que os testes do navegador faziam no
 * `localStorage`: começar com os dados de exemplo num instante fixo, ler uma coleção, gravar direto
 * ("outra pessoa") e acertar o relógio do servidor com o do navegador (`page.clock`).
 */
import { definirDeslocamentoDoRelogio, agora } from '@medicore/dominio/utils/relogio';
import { getTableColumns, getTableName, inArray, sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../banco/conexao';
import { deLinha } from '../banco/conversao';
import * as e from '../banco/esquema';
import { linhaAtendimento, linhaConsulta, semear } from '../banco/semear';
import { paraBanco } from '../servicos/comum';

/** Nome da coleção no navegador → tabela. */
const COLECOES: Record<string, PgTable> = {
  pacientes: e.pacientes,
  medicos: e.medicos,
  consultas: e.consultas,
  atividades: e.atividades,
  leitos: e.leitos,
  internacoes: e.internacoes,
  solicitacoes_leito: e.solicitacoes,
  atendimentos: e.atendimentos,
  medicamentos: e.medicamentos,
  lotes: e.lotes,
  movimentacoes: e.movimentacoes,
  dispensacoes: e.dispensacoes,
  resumos_mensais: e.resumos,
};

const instante = z.object({ agora: z.string().datetime({ offset: true }) });
const comNome = z.object({ nome: z.enum(Object.keys(COLECOES) as [string, ...string[]]) });

const acertarRelogio = (iso: string) => definirDeslocamentoDoRelogio(Date.parse(iso) - Date.now());

function paraLinha(tabela: PgTable, item: Record<string, unknown>) {
  const linha =
    tabela === e.consultas
      ? linhaConsulta(item as never)
      : tabela === e.atendimentos
        ? linhaAtendimento(item as never)
        : item;
  const colunas = Object.keys(getTableColumns(tabela));
  return paraBanco(
    Object.fromEntries(colunas.map((c) => [c, (linha as Record<string, unknown>)[c]])),
  );
}

/** `dono`: a conexão do dono das tabelas (só ele apaga movimentações). */
export function rotasDeTeste(dono: Banco): FastifyPluginAsyncZod {
  return async (app) => {
    const schema = { hide: true } as const;

    app.post('/_teste/reiniciar', { schema: { ...schema, body: instante } }, async (req) => {
      acertarRelogio(req.body.agora);
      const contagens = await semear(dono, { substituir: true, momento: agora() });
      await dono.execute(sql`truncate ${e.rotinas}`);
      return { agora: agora().toISOString(), contagens: contagens.contagens };
    });

    app.post('/_teste/relogio', { schema: { ...schema, body: instante } }, async (req) => {
      acertarRelogio(req.body.agora);
      return { agora: agora().toISOString() };
    });

    app.get('/_teste/colecoes/:nome', { schema: { ...schema, params: comNome } }, async (req) => {
      const tabela = COLECOES[req.params.nome]!;
      const linhas = (await dono
        .select()
        .from(tabela)
        .orderBy(sql`ctid`)) as Record<string, unknown>[];
      return linhas.map((l) => deLinha(tabela, l));
    });

    app.put(
      '/_teste/colecoes/:nome',
      {
        schema: {
          ...schema,
          params: comNome,
          body: z.array(z.looseObject({ id: z.string() })),
        },
      },
      async (req) => {
        const tabela = COLECOES[req.params.nome]!;
        const id = (getTableColumns(tabela) as Record<string, never>).id;
        await dono.transaction(async (tx) => {
          const atuais = (await tx.select().from(tabela)) as { id: string }[];
          const novos = new Set(req.body.map((x) => x.id));
          const sair = atuais.map((x) => x.id).filter((x) => !novos.has(x));
          for (const item of req.body) {
            const linha = paraLinha(tabela, item);
            await tx
              .insert(tabela)
              .values(linha as never)
              .onConflictDoUpdate({ target: id, set: linha as never });
          }
          if (sair.length) await tx.delete(tabela).where(inArray(id, sair));
        });
        return { total: req.body.length, tabela: getTableName(tabela) };
      },
    );
  };
}
