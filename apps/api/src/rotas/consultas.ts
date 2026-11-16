/** Fase 25 (25.1.3) — Rotas da agenda (P9–P13, A1, A5). */
import {
  consultaDetalhada,
  consultaHorarios,
  filtrosAgenda,
  horarioAgenda,
  loteRegistro,
} from '@medicore/dominio/contrato/cadastros';
import { esquemaAgendamento, esquemaCancelamento } from '@medicore/dominio/schemas/consulta';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../banco/conexao';
import { naoModificado, responderComVersao, versaoExigida } from '../http/versao';
import * as s from '../servicos/consultas';

const comId = z.object({ id: z.string() });
const tags = ['agenda'];

export function rotasConsultas(banco: Banco): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/consultas',
      {
        schema: {
          tags,
          summary: 'Agenda: consultas em ordem de início (janela de datas, até 1000)',
          querystring: filtrosAgenda,
          response: { 200: z.array(consultaDetalhada) },
        },
      },
      async (req) => s.listarConsultas(banco, req.query),
    );

    app.get(
      '/consultas/:id',
      { schema: { tags, params: comId, response: { 200: consultaDetalhada } } },
      async (req, res) => {
        const c = await s.obterConsulta(banco, req.params.id);
        if (responderComVersao(req, res, c.versao)) return naoModificado(res);
        return c;
      },
    );

    app.get(
      '/agenda/horarios',
      {
        schema: {
          tags,
          summary: 'A1 / R-C5: grade do dia com o motivo de cada horário indisponível',
          querystring: consultaHorarios,
          response: { 200: z.array(horarioAgenda) },
        },
      },
      async (req) => {
        const q = req.query;
        return s.horariosLivres(
          banco,
          q.medicoId,
          q.data,
          q.duracaoMin,
          q.pacienteId,
          q.ignorarConsultaId,
        );
      },
    );

    app.get(
      '/agenda/proximo-dia',
      {
        schema: {
          tags,
          summary: 'A5: próximo dia com horário livre',
          querystring: consultaHorarios,
          response: { 200: z.object({ data: z.string().nullable() }) },
        },
      },
      async (req) => {
        const q = req.query;
        return {
          data: await s.proximoDiaDisponivel(
            banco,
            q.medicoId,
            q.data,
            q.duracaoMin,
            q.pacienteId,
            q.ignorarConsultaId,
          ),
        };
      },
    );

    app.post(
      '/consultas',
      {
        schema: {
          tags,
          summary: 'P9',
          body: esquemaAgendamento,
          response: { 201: consultaDetalhada },
        },
      },
      async (req, res) => {
        const c = await s.agendarConsulta(banco, req.body);
        responderComVersao(req, res, c.versao);
        return res.status(201).send(c);
      },
    );

    app.put(
      '/consultas/:id',
      {
        schema: {
          tags,
          summary: 'P10: reagendar (If-Match obrigatório)',
          params: comId,
          body: esquemaAgendamento,
          response: { 200: consultaDetalhada },
        },
      },
      async (req, res) => {
        const c = await s.reagendarConsulta(banco, req.params.id, req.body, versaoExigida(req));
        responderComVersao(req, res, c.versao);
        return c;
      },
    );

    app.post(
      '/consultas/:id/cancelar',
      {
        schema: {
          tags,
          summary: 'P11 (If-Match obrigatório)',
          params: comId,
          body: esquemaCancelamento,
          response: { 200: consultaDetalhada },
        },
      },
      async (req, res) => {
        const c = await s.cancelarConsulta(
          banco,
          req.params.id,
          req.body.motivo,
          versaoExigida(req),
        );
        responderComVersao(req, res, c.versao);
        return c;
      },
    );

    app.post(
      '/consultas/:id/concluir',
      { schema: { tags, summary: 'P12', params: comId, response: { 200: consultaDetalhada } } },
      async (req) => s.concluirConsulta(banco, req.params.id),
    );

    app.post(
      '/consultas/:id/faltou',
      { schema: { tags, summary: 'P12', params: comId, response: { 200: consultaDetalhada } } },
      async (req) => s.marcarFalta(banco, req.params.id),
    );

    app.post(
      '/consultas/lote',
      {
        schema: {
          tags,
          summary: 'P13: registra várias; se uma falhar, nenhuma muda',
          body: loteRegistro,
          response: { 200: z.object({ total: z.number().int() }) },
        },
      },
      async (req) => ({ total: await s.registrarEmLote(banco, req.body.ids, req.body.acao) }),
    );
  };
}
