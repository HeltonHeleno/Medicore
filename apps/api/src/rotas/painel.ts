/** Fase 25 (25.1.4, 25.1.6) — Atividades e indicadores dos cadastros no Painel. */
import { atividade, indicadoresCadastros } from '@medicore/dominio/contrato/cadastros';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../banco/conexao';
import { listarAtividades } from '../servicos/atividades';
import { indicadoresCadastros as calcular } from '../servicos/painel';

const tags = ['painel'];

export function rotasPainel(banco: Banco): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/atividades',
      {
        schema: {
          tags,
          summary: 'Linha do tempo (mais recentes primeiro)',
          querystring: z.object({ limite: z.coerce.number().int().min(1).max(100).default(10) }),
          response: { 200: z.array(atividade) },
        },
      },
      async (req) => listarAtividades(banco, { limite: req.query.limite }),
    );

    app.get(
      '/indicadores/cadastros',
      {
        schema: {
          tags,
          summary: 'KPIs "Total de pacientes" e "Médicos de plantão"',
          response: { 200: indicadoresCadastros },
        },
      },
      async () => calcular(banco),
    );
  };
}
