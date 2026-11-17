/**
 * Fase 29 (BL-03.3 a BL-03.5) — Consultar a auditoria (Administrador e Gestão), exportar em CSV
 * (registrado), conferir a integridade e o pedido do titular (Administrador). As permissões estão
 * em `acesso/rotas-permissoes.ts`.
 */
import {
  dadosDoTitular,
  filtrosAuditoria,
  listaAuditoria,
  pessoaAuditoria,
  resultadoIntegridade,
} from '@medicore/dominio/contrato/auditoria';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../banco/conexao';
import * as s from '../auditoria/servico';

const tags = ['auditoria'];

export function rotasAuditoria(banco: Banco): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/auditoria',
      {
        schema: {
          tags,
          summary:
            'Trilha com filtros (pessoa, paciente, ação, registro, período), mais recente primeiro',
          querystring: filtrosAuditoria,
          response: { 200: listaAuditoria },
        },
      },
      async (req, res) => {
        res.header('Cache-Control', 'no-store');
        return s.listarAuditoria(banco, req.query);
      },
    );

    app.get(
      '/auditoria/pessoas',
      {
        schema: {
          tags,
          summary: 'Pessoas com conta (filtro)',
          response: { 200: z.array(pessoaAuditoria) },
        },
      },
      async () => s.pessoasDaAuditoria(banco),
    );

    app.get(
      '/auditoria/exportar',
      {
        schema: {
          tags,
          summary: `CSV com os filtros (até ${s.LIMITE_EXPORTACAO.toLocaleString('pt-BR')} linhas); a exportação também é registrada`,
          querystring: filtrosAuditoria.omit({ pagina: true, porPagina: true }),
        },
      },
      async (req, res) => {
        const csv = await s.exportarAuditoria(banco, req.query);
        return res
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', 'attachment; filename="auditoria.csv"')
          .header('Cache-Control', 'no-store')
          .send(csv);
      },
    );

    app.get(
      '/auditoria/integridade',
      {
        schema: {
          tags,
          summary: 'Refaz a cadeia de hash dos dias selados (BL-03.5)',
          response: { 200: resultadoIntegridade },
        },
      },
      async () => s.conferirIntegridade(banco),
    );

    app.get(
      '/pacientes/:id/titular',
      {
        schema: {
          tags,
          summary: 'Pedido do titular (LGPD, art. 18): os dados do paciente e os acessos a eles',
          params: z.object({ id: z.string() }),
          response: { 200: dadosDoTitular },
        },
      },
      async (req, res) => {
        res.header('Cache-Control', 'no-store');
        return s.dadosDoTitular(banco, req.params.id);
      },
    );
  };
}
