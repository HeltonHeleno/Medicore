/** Fase 26 (26.1.3) — Rotas da farmácia (F1–F9, A9, livro de controlados). */
import {
  consultaFefo,
  consultaLivro,
  corpoInativarMedicamento,
  correspondenciaAlergia,
  destinoDetalhado,
  detalheMedicamento,
  dispensacao,
  dispensacaoDetalhada,
  dispensacaoResumida,
  filtrosEstoque,
  filtrosMovimentacoes,
  listaEstoque,
  listaMovimentacoes,
  livroControlados,
  lote,
  loteVencimento,
  medicamento,
  previaFefo,
  resultadoDescarte,
} from '@medicore/dominio/contrato/operacoes';
import {
  esquemaAjuste,
  esquemaBloqueioLote,
  esquemaDescarte,
  esquemaDevolucao,
  esquemaDispensacao,
  esquemaEntrada,
  esquemaEstorno,
  esquemaMedicamento,
} from '@medicore/dominio/schemas/farmacia';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../banco/conexao';
import { versaoExigida } from '../http/versao';
import * as s from '../servicos/operacoes/farmacia';
import { gravar, ler } from '../servicos/operacoes/unidade';
import { comEtag, comId, gravado } from './apoio';

const tags = ['farmácia'];
const exigeVersao = 'If-Match obrigatório';

export function rotasFarmacia(banco: Banco): FastifyPluginAsyncZod {
  const g = <T>(op: () => T) => gravar(banco, 'estoque', op);
  const l = <T>(op: () => T) => ler(banco, op);

  return async (app) => {
    // ─────────── medicamentos e estoque ───────────
    app.get(
      '/medicamentos',
      {
        schema: {
          tags,
          summary: 'F1: estoque por medicamento (disponível pela R-F1)',
          querystring: filtrosEstoque,
          response: { 200: listaEstoque },
        },
      },
      async (req) => l(() => s.listarEstoque(req.query)),
    );

    app.get(
      '/medicamentos/:id',
      { schema: { tags, params: comId, response: { 200: detalheMedicamento } } },
      async (req, res) =>
        comEtag(
          req,
          res,
          await l(() => s.obterMedicamento(req.params.id)),
          (d) => d.estoque.medicamento.versao,
        ),
    );

    app.get(
      '/medicamentos/:id/livro',
      {
        schema: {
          tags,
          summary: 'M28: livro de controlados no período (datas inclusivas)',
          params: comId,
          querystring: consultaLivro,
          response: { 200: livroControlados },
        },
      },
      async (req) => l(() => s.livroControlados(req.params.id, req.query.de, req.query.ate)),
    );

    app.get(
      '/medicamentos/:id/fefo',
      {
        schema: {
          tags,
          summary: 'A9: prévia dos lotes que sairiam (FEFO)',
          params: comId,
          querystring: consultaFefo,
          response: { 200: previaFefo },
        },
      },
      async (req) => l(() => s.previaFefo(req.params.id, req.query.quantidade)),
    );

    app.post(
      '/medicamentos',
      {
        schema: {
          tags,
          summary: 'F1: cadastro',
          body: esquemaMedicamento,
          response: { 201: medicamento },
        },
      },
      async (req, res) => gravado(req, res, await g(() => s.criarMedicamento(req.body)), 201),
    );

    app.put(
      '/medicamentos/:id',
      {
        schema: {
          tags,
          summary: `F1: edição (${exigeVersao})`,
          params: comId,
          body: esquemaMedicamento,
          response: { 200: medicamento },
        },
      },
      async (req, res) =>
        gravado(
          req,
          res,
          await g(() => s.editarMedicamento(req.params.id, req.body, versaoExigida(req))),
        ),
    );

    app.post(
      '/medicamentos/:id/inativar',
      {
        schema: {
          tags,
          summary: `F1 (${exigeVersao})`,
          params: comId,
          body: corpoInativarMedicamento,
          response: { 200: medicamento },
        },
      },
      async (req, res) =>
        gravado(
          req,
          res,
          await g(() => s.inativarMedicamento(req.params.id, versaoExigida(req), req.body.motivo)),
        ),
    );

    app.post(
      '/medicamentos/:id/reativar',
      {
        schema: {
          tags,
          summary: `F1 (${exigeVersao})`,
          params: comId,
          response: { 200: medicamento },
        },
      },
      async (req, res) =>
        gravado(req, res, await g(() => s.reativarMedicamento(req.params.id, versaoExigida(req)))),
    );

    // ─────────── lotes ───────────
    app.get(
      '/lotes/vencimento',
      {
        schema: {
          tags,
          summary: 'F6: lotes com saldo vencidos ou vencendo',
          response: { 200: z.array(loteVencimento) },
        },
      },
      async () => l(() => s.listarLotesVencimento()),
    );

    app.post(
      '/lotes',
      {
        schema: {
          tags,
          summary: 'F2: entrada de lote (soma ao lote existente com o mesmo número)',
          body: esquemaEntrada,
          response: { 201: lote },
        },
      },
      async (req, res) => gravado(req, res, await g(() => s.registrarEntrada(req.body)), 201),
    );

    app.post(
      '/lotes/descarte',
      {
        schema: {
          tags,
          summary: 'F6: descarte dos lotes vencidos de um medicamento',
          body: esquemaDescarte,
          response: { 200: resultadoDescarte },
        },
      },
      async (req) => g(() => s.descartarVencidos(req.body)),
    );

    app.post(
      '/lotes/:id/ajuste',
      {
        schema: {
          tags,
          summary: `F5: ajuste de inventário, perda ou avaria (${exigeVersao})`,
          params: comId,
          body: esquemaAjuste,
          response: { 200: lote },
        },
      },
      async (req, res) =>
        gravado(req, res, await g(() => s.ajustar(req.params.id, req.body, versaoExigida(req)))),
    );

    app.post(
      '/lotes/:id/bloquear',
      {
        schema: {
          tags,
          summary: `F7: bloqueio (recall, avaria) (${exigeVersao})`,
          params: comId,
          body: esquemaBloqueioLote,
          response: { 200: lote },
        },
      },
      async (req, res) =>
        gravado(
          req,
          res,
          await g(() => s.bloquearLote(req.params.id, req.body, versaoExigida(req))),
        ),
    );

    app.post(
      '/lotes/:id/desbloquear',
      {
        schema: { tags, summary: `F7 (${exigeVersao})`, params: comId, response: { 200: lote } },
      },
      async (req, res) =>
        gravado(req, res, await g(() => s.desbloquearLote(req.params.id, versaoExigida(req)))),
    );

    app.get(
      '/movimentacoes',
      {
        schema: {
          tags,
          summary: 'F9: movimentações (imutáveis), da mais recente para a mais antiga',
          querystring: filtrosMovimentacoes,
          response: { 200: listaMovimentacoes },
        },
      },
      async (req) => l(() => s.listarMovimentacoes(req.query)),
    );

    // ─────────── dispensação ───────────
    app.get(
      '/dispensacoes/:id',
      { schema: { tags, params: comId, response: { 200: dispensacaoDetalhada } } },
      async (req, res) => comEtag(req, res, await l(() => s.obterDispensacao(req.params.id))),
    );

    app.post(
      '/dispensacoes',
      {
        schema: {
          tags,
          summary: 'F3: dispensação; os lotes saem pelo FEFO no momento de gravar (A9)',
          body: esquemaDispensacao,
          response: { 201: dispensacao },
        },
      },
      async (req, res) => gravado(req, res, await g(() => s.dispensar(req.body)), 201),
    );

    app.post(
      '/dispensacoes/:id/itens/:indice/devolucao',
      {
        schema: {
          tags,
          summary: `F4: devolução de um item (${exigeVersao})`,
          params: z.object({ id: z.string(), indice: z.coerce.number().int().min(0) }),
          body: esquemaDevolucao,
          response: { 200: dispensacao },
        },
      },
      async (req, res) =>
        gravado(
          req,
          res,
          await g(() => s.devolver(req.params.id, req.params.indice, req.body, versaoExigida(req))),
        ),
    );

    app.post(
      '/dispensacoes/:id/estornar',
      {
        schema: {
          tags,
          summary: `F8: estorno dentro da janela de correção (D19) (${exigeVersao})`,
          params: comId,
          body: esquemaEstorno,
          response: { 200: dispensacao },
        },
      },
      async (req, res) =>
        gravado(
          req,
          res,
          await g(() => s.estornar(req.params.id, req.body.motivo, versaoExigida(req))),
        ),
    );

    app.get(
      '/pacientes/:id/dispensacoes',
      {
        schema: {
          tags,
          summary: 'Dispensações do paciente (mais recentes primeiro)',
          params: comId,
          response: { 200: z.array(dispensacao) },
        },
      },
      async (req) => l(() => s.listarDispensacoesDoPaciente(req.params.id)),
    );

    app.get(
      '/pacientes/:id/destino',
      {
        schema: {
          tags,
          summary: 'F3 passo 2: internação ativa ou atendimento aberto do paciente (ou null)',
          params: comId,
          response: { 200: destinoDetalhado },
        },
      },
      async (req) => l(() => s.destinoDetalhado(req.params.id)),
    );

    app.get(
      '/pacientes/:id/alergia/:medicamentoId',
      {
        schema: {
          tags,
          summary: 'R-F4: alergia do paciente que bate com o medicamento (ou null)',
          params: z.object({ id: z.string(), medicamentoId: z.string() }),
          response: { 200: correspondenciaAlergia },
        },
      },
      async (req) => l(() => s.verificarAlergia(req.params.id, req.params.medicamentoId)),
    );

    app.get(
      '/destinos/:id/dispensacoes',
      {
        schema: {
          tags,
          summary: 'Dispensações para a internação ou o atendimento',
          params: comId,
          response: { 200: z.array(dispensacaoResumida) },
        },
      },
      async (req) => l(() => s.listarDispensacoesDoDestino(req.params.id)),
    );
  };
}
