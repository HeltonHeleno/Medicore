/** Fase 26 (26.1.1) — Rotas da gestão de leitos (L1–L9, A11). */
import { consulta } from '@medicore/dominio/contrato/cadastros';
import {
  consultaCompativeis,
  corpoReserva,
  filtrosInternacoes,
  filtrosLeitos,
  internacao,
  internacaoDetalhada,
  leito,
  leitoAvaliado,
  leitoDetalhado,
  listaInternacoes,
  listaMedicos,
  loteHigienizacao,
  resultadoAlta,
  resultadoDesfazerAlta,
  resultadoLoteLeitos,
  reverterHigienizacao,
  solicitacao,
  solicitacaoDetalhada,
} from '@medicore/dominio/contrato/operacoes';
import {
  esquemaAlta,
  esquemaBloqueioLeito,
  esquemaEdicaoInternacao,
  esquemaInternacao,
  esquemaMotivo,
  esquemaSolicitacaoEletiva,
  esquemaTransferencia,
} from '@medicore/dominio/schemas/internacao';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../banco/conexao';
import { versaoExigida } from '../http/versao';
import * as s from '../servicos/operacoes/leitos';
import { gravar, ler } from '../servicos/operacoes/unidade';
import { comEtag, comId, gravado } from './apoio';

const tags = ['leitos'];
const exigeVersao = 'If-Match obrigatório';

export function rotasLeitos(banco: Banco): FastifyPluginAsyncZod {
  const g = <T>(op: () => T) => gravar(banco, 'internacao', op);
  const l = <T>(op: () => T) => ler(banco, op);

  return async (app) => {
    // ─────────── mapa de leitos ───────────
    app.get(
      '/leitos',
      {
        schema: {
          tags,
          summary: 'Mapa de leitos (por setor e código), com ocupante e destaques de tempo',
          querystring: filtrosLeitos,
          response: { 200: z.array(leitoDetalhado) },
        },
      },
      async (req) => l(() => s.listarLeitos(req.query)),
    );

    app.get(
      '/leitos/busca',
      {
        schema: {
          tags,
          summary: 'M24: leitos ocupados por pacientes com o nome buscado',
          querystring: z.object({ termo: z.string().max(100) }),
          response: { 200: z.array(leitoDetalhado) },
        },
      },
      async (req) => l(() => s.buscarPacienteNoMapa(req.query.termo)),
    );

    app.get(
      '/leitos/compativeis',
      {
        schema: {
          tags,
          summary: 'A11: leitos avaliados para o paciente (o sugerido primeiro)',
          querystring: consultaCompativeis,
          response: { 200: z.array(leitoAvaliado) },
        },
      },
      async (req) => {
        const { ignorarLeitoId, ...criterio } = req.query;
        return l(() => s.leitosCompativeis(criterio, ignorarLeitoId));
      },
    );

    app.get(
      '/leitos/:id',
      { schema: { tags, params: comId, response: { 200: leitoDetalhado } } },
      async (req, res) => comEtag(req, res, await l(() => s.obterLeito(req.params.id))),
    );

    app.get(
      '/leitos/:id/historico',
      {
        schema: {
          tags,
          summary: 'Ocupação do leito nos últimos dias (padrão 30)',
          params: comId,
          querystring: z.object({ dias: z.coerce.number().int().min(1).max(365).optional() }),
          response: { 200: z.array(internacaoDetalhada) },
        },
      },
      async (req) => l(() => s.historicoLeito(req.params.id, req.query.dias)),
    );

    app.post(
      '/leitos/higienizacao',
      {
        schema: {
          tags,
          summary: 'L4: conclui a higienização de vários leitos; os que mudaram são pulados',
          body: loteHigienizacao,
          response: { 200: resultadoLoteLeitos },
        },
      },
      async (req) => g(() => s.concluirHigienizacao(req.body.itens)),
    );

    app.post(
      '/leitos/:id/reverter-higienizacao',
      {
        schema: {
          tags,
          summary: `L4 "Desfazer" (${exigeVersao})`,
          params: comId,
          body: reverterHigienizacao,
          response: { 200: leito },
        },
      },
      async (req, res) =>
        gravado(
          req,
          res,
          await g(() => s.reverterHigienizacao(req.params.id, versaoExigida(req), req.body)),
        ),
    );

    app.post(
      '/leitos/:id/bloquear',
      {
        schema: {
          tags,
          summary: `L5 (${exigeVersao})`,
          params: comId,
          body: esquemaBloqueioLeito,
          response: { 200: leito },
        },
      },
      async (req, res) =>
        gravado(req, res, await g(() => s.bloquear(req.params.id, req.body, versaoExigida(req)))),
    );

    app.post(
      '/leitos/:id/desbloquear',
      {
        schema: { tags, summary: `L5 (${exigeVersao})`, params: comId, response: { 200: leito } },
      },
      async (req, res) =>
        gravado(req, res, await g(() => s.desbloquear(req.params.id, versaoExigida(req)))),
    );

    app.get(
      '/medicos-responsaveis',
      {
        schema: {
          tags,
          summary: 'L1 passo 6: médicos ativos, os do departamento do setor primeiro',
          querystring: z.object({ setorId: z.string().optional() }),
          response: { 200: listaMedicos },
        },
      },
      async (req) => l(() => s.medicosResponsaveis(req.query.setorId)),
    );

    // ─────────── internações ───────────
    app.get(
      '/internacoes',
      {
        schema: {
          tags,
          summary: 'Internações ativas (por leito) ou encerradas (alta mais recente primeiro)',
          querystring: filtrosInternacoes,
          response: { 200: listaInternacoes },
        },
      },
      async (req) => l(() => s.listarInternacoes(req.query)),
    );

    app.get(
      '/internacoes/:id',
      { schema: { tags, params: comId, response: { 200: internacaoDetalhada } } },
      async (req, res) => comEtag(req, res, await l(() => s.obterInternacao(req.params.id))),
    );

    app.get(
      '/internacoes/:id/consultas',
      {
        schema: {
          tags,
          summary: 'R-X8: consultas agendadas durante a internação',
          params: comId,
          response: { 200: z.array(consulta) },
        },
      },
      async (req) => l(() => s.consultasDuranteInternacao(req.params.id)),
    );

    app.post(
      '/internacoes',
      {
        schema: {
          tags,
          summary: 'L1 (eletiva, transferência externa) e L6 (pelo pedido de leito)',
          body: esquemaInternacao,
          response: { 201: internacao },
        },
      },
      async (req, res) => gravado(req, res, await g(() => s.internar(req.body)), 201),
    );

    app.put(
      '/internacoes/:id',
      {
        schema: {
          tags,
          summary: `L7: responsável, previsão de alta, precaução e motivo (${exigeVersao})`,
          params: comId,
          body: esquemaEdicaoInternacao,
          response: { 200: internacao },
        },
      },
      async (req, res) =>
        gravado(
          req,
          res,
          await g(() => s.editarInternacao(req.params.id, req.body, versaoExigida(req))),
        ),
    );

    app.post(
      '/internacoes/:id/transferir',
      {
        schema: {
          tags,
          summary: `L2 (${exigeVersao})`,
          params: comId,
          body: esquemaTransferencia,
          response: { 200: internacao },
        },
      },
      async (req, res) =>
        gravado(req, res, await g(() => s.transferir(req.params.id, req.body, versaoExigida(req)))),
    );

    app.post(
      '/internacoes/:id/alta',
      {
        schema: {
          tags,
          summary: `L3, com o óbito (R-X7) (${exigeVersao})`,
          params: comId,
          body: esquemaAlta,
          response: { 200: resultadoAlta },
        },
      },
      async (req) => g(() => s.darAlta(req.params.id, req.body, versaoExigida(req))),
    );

    app.post(
      '/internacoes/:id/desfazer-alta',
      {
        schema: {
          tags,
          summary: `L8: dentro da janela de correção (D19) (${exigeVersao})`,
          params: comId,
          body: esquemaMotivo,
          response: { 200: resultadoDesfazerAlta },
        },
      },
      async (req) => g(() => s.desfazerAlta(req.params.id, req.body.motivo, versaoExigida(req))),
    );

    // ─────────── pedidos de leito ───────────
    app.get(
      '/solicitacoes',
      {
        schema: {
          tags,
          summary: 'L6 / L9: pedidos em aberto, por prioridade e espera',
          response: { 200: z.array(solicitacaoDetalhada) },
        },
      },
      async () => l(() => s.listarSolicitacoes()),
    );

    app.get(
      '/solicitacoes/:id',
      { schema: { tags, params: comId, response: { 200: solicitacaoDetalhada } } },
      async (req, res) => comEtag(req, res, await l(() => s.obterSolicitacao(req.params.id))),
    );

    app.post(
      '/solicitacoes',
      {
        schema: {
          tags,
          summary: 'L9: pedido de leito eletivo',
          body: esquemaSolicitacaoEletiva,
          response: { 201: solicitacao },
        },
      },
      async (req, res) => gravado(req, res, await g(() => s.solicitarLeitoEletivo(req.body)), 201),
    );

    app.post(
      '/solicitacoes/:id/reservar',
      {
        schema: {
          tags,
          summary: `L6: reserva um leito para o pedido (${exigeVersao})`,
          params: comId,
          body: corpoReserva,
          response: { 200: solicitacao },
        },
      },
      async (req, res) =>
        gravado(
          req,
          res,
          await g(() => s.reservarLeito(req.params.id, req.body.leitoId, versaoExigida(req))),
        ),
    );

    app.post(
      '/solicitacoes/:id/cancelar-reserva',
      {
        schema: {
          tags,
          summary: `L6 (${exigeVersao})`,
          params: comId,
          response: { 200: solicitacao },
        },
      },
      async (req, res) =>
        gravado(req, res, await g(() => s.cancelarReserva(req.params.id, versaoExigida(req)))),
    );

    app.post(
      '/solicitacoes/:id/cancelar',
      {
        schema: {
          tags,
          summary: `L6 "Cancelar" (${exigeVersao})`,
          params: comId,
          body: esquemaMotivo,
          response: { 200: solicitacao },
        },
      },
      async (req, res) =>
        gravado(
          req,
          res,
          await g(() => s.cancelarSolicitacao(req.params.id, req.body.motivo, versaoExigida(req))),
        ),
    );
  };
}
