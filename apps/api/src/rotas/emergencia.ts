/** Fase 26 (26.1.2) — Rotas da emergência (E1–E10, A7, A8). */
import {
  atendimento,
  atendimentoDetalhado,
  corpoObservacao,
  corpoReabrir,
  corpoVinculo,
  filaEmergencia,
  filtrosHistoricoEmergencia,
  leitoAvaliado,
  listaHistoricoEmergencia,
  listaMedicos,
  resultadoEncerramento,
  resultadoReabertura,
} from '@medicore/dominio/contrato/operacoes';
import {
  esquemaChamar,
  esquemaChegada,
  esquemaDesfecho,
  esquemaPedirLeito,
  esquemaReavaliacao,
  esquemaTriagem,
} from '@medicore/dominio/schemas/emergencia';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../banco/conexao';
import { versaoExigida } from '../http/versao';
import * as s from '../servicos/operacoes/emergencia';
import { gravar, ler } from '../servicos/operacoes/unidade';
import { comEtag, comId, gravado } from './apoio';

const tags = ['emergência'];
const exigeVersao = 'If-Match obrigatório';

export function rotasEmergencia(banco: Banco): FastifyPluginAsyncZod {
  const g = <T>(op: () => T) => gravar(banco, 'internacao', op);
  const l = <T>(op: () => T) => ler(banco, op);

  return async (app) => {
    app.get(
      '/emergencia/fila',
      {
        schema: {
          tags,
          summary: 'A7: fila por cor e prazo, separada por etapa',
          response: { 200: filaEmergencia },
        },
      },
      async () => l(() => s.listarFila()),
    );

    app.get(
      '/emergencia/medicos',
      {
        schema: {
          tags,
          summary: 'E3: médicos ativos, os da emergência primeiro',
          response: { 200: listaMedicos },
        },
      },
      async () => l(() => s.medicosParaChamar()),
    );

    app.get(
      '/atendimentos',
      {
        schema: {
          tags,
          summary: 'Histórico de atendimentos (paginado)',
          querystring: filtrosHistoricoEmergencia,
          response: { 200: listaHistoricoEmergencia },
        },
      },
      async (req) => l(() => s.listarHistorico(req.query)),
    );

    app.get(
      '/atendimentos/:id',
      { schema: { tags, params: comId, response: { 200: atendimentoDetalhado } } },
      async (req, res) => comEtag(req, res, await l(() => s.obterAtendimento(req.params.id))),
    );

    app.get(
      '/atendimentos/:id/leitos-observacao',
      {
        schema: {
          tags,
          summary: 'E4: leitos da Observação avaliados para o atendimento',
          params: comId,
          response: { 200: z.array(leitoAvaliado) },
        },
      },
      async (req) => l(() => s.leitosParaObservacao(req.params.id)),
    );

    app.post(
      '/atendimentos',
      {
        schema: {
          tags,
          summary: 'E1: chegada; o número do dia (A8) é dado pelo servidor',
          body: esquemaChegada,
          response: { 201: atendimento },
        },
      },
      async (req, res) => gravado(req, res, await g(() => s.registrarChegada(req.body)), 201),
    );

    app.post(
      '/atendimentos/:id/triagem',
      {
        schema: {
          tags,
          summary: `E2: triagem ou retriagem (${exigeVersao})`,
          params: comId,
          body: esquemaTriagem(),
          response: { 200: atendimento },
        },
      },
      async (req, res) =>
        gravado(req, res, await g(() => s.triar(req.params.id, req.body, versaoExigida(req)))),
    );

    app.post(
      '/atendimentos/:id/reavaliacao',
      {
        schema: {
          tags,
          summary: `E10 (${exigeVersao})`,
          params: comId,
          body: esquemaReavaliacao,
          response: { 200: atendimento },
        },
      },
      async (req, res) =>
        gravado(req, res, await g(() => s.reavaliar(req.params.id, req.body, versaoExigida(req)))),
    );

    app.post(
      '/atendimentos/:id/chamar',
      {
        schema: {
          tags,
          summary: `E3 (${exigeVersao})`,
          params: comId,
          body: esquemaChamar,
          response: { 200: atendimento },
        },
      },
      async (req, res) =>
        gravado(
          req,
          res,
          await g(() => s.chamar(req.params.id, req.body.medicoId, versaoExigida(req))),
        ),
    );

    app.post(
      '/atendimentos/:id/observacao',
      {
        schema: {
          tags,
          summary: `E4: leito da Observação (${exigeVersao})`,
          params: comId,
          body: corpoObservacao,
          response: { 200: atendimento },
        },
      },
      async (req, res) =>
        gravado(
          req,
          res,
          await g(() => s.colocarEmObservacao(req.params.id, req.body.leitoId, versaoExigida(req))),
        ),
    );

    app.post(
      '/atendimentos/:id/retomar',
      {
        schema: {
          tags,
          summary: `E4: volta ao atendimento (${exigeVersao})`,
          params: comId,
          response: { 200: atendimento },
        },
      },
      async (req, res) =>
        gravado(req, res, await g(() => s.retomarAtendimento(req.params.id, versaoExigida(req)))),
    );

    app.post(
      '/atendimentos/:id/pedir-leito',
      {
        schema: {
          tags,
          summary: `E5: pedido de leito de internação (${exigeVersao})`,
          params: comId,
          body: esquemaPedirLeito,
          response: { 200: atendimento },
        },
      },
      async (req, res) =>
        gravado(
          req,
          res,
          await g(() => s.solicitarLeito(req.params.id, req.body, versaoExigida(req))),
        ),
    );

    app.post(
      '/atendimentos/:id/encerrar',
      {
        schema: {
          tags,
          summary: `E6: desfecho, com o óbito (R-X7) (${exigeVersao})`,
          params: comId,
          body: esquemaDesfecho,
          response: { 200: resultadoEncerramento },
        },
      },
      async (req) => g(() => s.encerrar(req.params.id, req.body, versaoExigida(req))),
    );

    app.post(
      '/atendimentos/:id/reabrir',
      {
        schema: {
          tags,
          summary: `E9: dentro da janela de correção (D19) (${exigeVersao})`,
          params: comId,
          body: corpoReabrir,
          response: { 200: resultadoReabertura },
        },
      },
      async (req) =>
        g(() =>
          s.reabrir(
            req.params.id,
            req.body.motivo,
            versaoExigida(req),
            req.body.novoLeitoObservacaoId,
          ),
        ),
    );

    app.post(
      '/atendimentos/:id/vincular',
      {
        schema: {
          tags,
          summary: `E7: vincula o cadastro do paciente (${exigeVersao})`,
          params: comId,
          body: corpoVinculo,
          response: { 200: atendimento },
        },
      },
      async (req, res) =>
        gravado(
          req,
          res,
          await g(() => s.vincularPaciente(req.params.id, req.body.pacienteId, versaoExigida(req))),
        ),
    );
  };
}
