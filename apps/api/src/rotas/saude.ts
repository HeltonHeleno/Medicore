/** Fase 24 (24.2.2) — `GET /api/v1/saude`: a API está no ar e fala com o banco. */
import { sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../banco/conexao';

export const respostaSaude = z.object({
  status: z.enum(['ok', 'sem_banco']),
  versao: z.string(),
  ambiente: z.string(),
  banco: z.enum(['ok', 'indisponivel']),
});

export function rotasSaude(opcoes: {
  banco: Banco;
  versao: string;
  ambiente: string;
}): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/saude',
      {
        schema: {
          tags: ['sistema'],
          summary: 'Situação da API e da conexão com o banco',
          response: { 200: respostaSaude, 503: respostaSaude },
        },
      },
      async (_requisicao, resposta) => {
        let banco: 'ok' | 'indisponivel' = 'ok';
        try {
          await opcoes.banco.execute(sql`select 1`);
        } catch {
          banco = 'indisponivel';
        }
        const corpo = {
          status: banco === 'ok' ? ('ok' as const) : ('sem_banco' as const),
          versao: opcoes.versao,
          ambiente: opcoes.ambiente,
          banco,
        };
        return resposta.status(banco === 'ok' ? 200 : 503).send(corpo);
      },
    );
  };
}
