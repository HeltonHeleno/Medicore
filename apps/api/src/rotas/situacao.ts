/**
 * Fase 26 (26.1.4, 26.1.5) — Situação hospitalar do paciente (R-X8), vínculos do médico e os
 * indicadores dos módulos (A12–A14) como rotas de leitura, com o mesmo resultado das telas.
 */
import {
  alertaOperacional,
  consultaSerie,
  historicoHospitalar,
  indicadoresEmergencia,
  indicadoresLeitos,
  indicadoresOperacionais,
  pontoInternacao,
  resumoEstoque,
  situacaoResumida,
  vinculosMedico,
} from '@medicore/dominio/contrato/operacoes';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../banco/conexao';
import * as ind from '../servicos/operacoes/indicadores-operacionais';
import * as sit from '../servicos/operacoes/situacao-hospitalar';
import { ler } from '../servicos/operacoes/unidade';
import { comId } from './apoio';

export function rotasSituacao(banco: Banco): FastifyPluginAsyncZod {
  const l = <T>(op: () => T) => ler(banco, op);

  return async (app) => {
    // ─────────── R-X8 ───────────
    app.get(
      '/pacientes/:id/situacao',
      {
        schema: {
          tags: ['pacientes'],
          summary: 'R-X8: internação ativa, atendimento aberto e pedido de leito do paciente',
          params: comId,
          response: { 200: situacaoResumida },
        },
      },
      async (req) => l(() => sit.situacaoHospitalar(req.params.id)),
    );

    app.get(
      '/pacientes/:id/historico-hospitalar',
      {
        schema: {
          tags: ['pacientes'],
          summary: 'Internações, atendimentos e dispensações do paciente',
          params: comId,
          response: { 200: historicoHospitalar },
        },
      },
      async (req) => l(() => sit.historicoHospitalar(req.params.id)),
    );

    app.get(
      '/situacoes',
      {
        schema: {
          tags: ['pacientes'],
          summary:
            'R-X8: situação de todos os pacientes internados ou em atendimento (id → situação)',
          response: { 200: z.record(z.string(), situacaoResumida) },
        },
      },
      async () => l(() => sit.situacoesHospitalares()),
    );

    app.get(
      '/situacoes/etiquetas',
      {
        schema: {
          tags: ['pacientes'],
          summary:
            'Etiquetas curtas ("Internado em UTI-07") por paciente, para a busca de pacientes',
          response: { 200: z.record(z.string(), z.string()) },
        },
      },
      async () => l(() => sit.etiquetasHospitalares()),
    );

    app.get(
      '/medicos/:id/vinculos',
      {
        schema: {
          tags: ['médicos'],
          summary: 'Internações e atendimentos abertos sob o médico',
          params: comId,
          response: { 200: vinculosMedico },
        },
      },
      async (req) => l(() => sit.vinculosDoMedico(req.params.id)),
    );

    // ─────────── A12–A14 ───────────
    const tags = ['painel'];
    app.get(
      '/indicadores/operacionais',
      {
        schema: {
          tags,
          summary: 'A12–A14: leitos, emergência, estoque e alertas, do mesmo instante',
          response: { 200: indicadoresOperacionais },
        },
      },
      async () => l(() => ind.obterIndicadoresOperacionais()),
    );

    app.get(
      '/indicadores/leitos',
      { schema: { tags, summary: 'A13', response: { 200: indicadoresLeitos } } },
      async () => l(() => ind.obterIndicadoresLeitos()),
    );

    app.get(
      '/indicadores/emergencia',
      { schema: { tags, summary: 'A14', response: { 200: indicadoresEmergencia } } },
      async () => l(() => ind.obterIndicadoresEmergencia()),
    );

    app.get(
      '/indicadores/estoque',
      { schema: { tags, summary: 'Resumo do estoque', response: { 200: resumoEstoque } } },
      async () => l(() => ind.obterResumoEstoque()),
    );

    app.get(
      '/indicadores/internacoes',
      {
        schema: {
          tags,
          summary: 'Série de internações por semana, mês ou ano (com os resumos mensais, A15)',
          querystring: consultaSerie,
          response: { 200: z.array(pontoInternacao) },
        },
      },
      async (req) => l(() => ind.obterSerieInternacoes(req.query.periodo)),
    );

    app.get(
      '/alertas',
      {
        schema: {
          tags,
          summary: 'A12: alertas derivados, do mais antigo para o mais recente',
          response: { 200: z.array(alertaOperacional) },
        },
      },
      async () => l(() => ind.listarAlertas()),
    );
  };
}
