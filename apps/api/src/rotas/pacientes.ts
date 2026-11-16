/** Fase 25 (25.1.1) — Rotas de pacientes (P1–P5). */
import {
  consulta,
  filtrosPacientes,
  paciente,
  pacienteResumo,
  pendenciaModulo,
  referenciaCadastro,
} from '@medicore/dominio/contrato/cadastros';
import { respostaLista } from '@medicore/dominio/contrato/lista';
import { esquemaPaciente } from '@medicore/dominio/schemas/paciente';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../banco/conexao';
import { naoModificado, responderComVersao, versaoExigida, versaoOpcional } from '../http/versao';
import * as s from '../servicos/pacientes';

const comId = z.object({ id: z.string() });
const tags = ['pacientes'];

export function rotasPacientes(banco: Banco): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/pacientes',
      {
        schema: {
          tags,
          summary: 'Lista paginada (busca por nome, nome social, CPF ou telefone)',
          querystring: filtrosPacientes,
          response: { 200: respostaLista(pacienteResumo) },
        },
      },
      async (req) => s.listarPacientes(banco, req.query),
    );

    app.get(
      '/pacientes/:id',
      { schema: { tags, params: comId, response: { 200: paciente } } },
      async (req, res) => {
        const p = await s.obterPaciente(banco, req.params.id);
        if (responderComVersao(req, res, p.versao)) return naoModificado(res);
        return p;
      },
    );

    app.get(
      '/pacientes/cpf/:cpf',
      {
        schema: {
          tags,
          summary: 'Cadastro que já usa o CPF (R-P1)',
          params: z.object({ cpf: z.string().regex(/^\d{11}$/) }),
          querystring: z.object({ ignorarId: z.string().optional() }),
          response: { 200: referenciaCadastro },
        },
      },
      async (req) => s.pacienteComCpf(banco, req.params.cpf, req.query.ignorarId),
    );

    app.get(
      '/pacientes/:id/tem-consultas',
      {
        schema: { tags, params: comId, response: { 200: z.object({ temConsultas: z.boolean() }) } },
      },
      async (req) => ({ temConsultas: await s.pacienteTemConsultas(banco, req.params.id) }),
    );

    app.get(
      '/pacientes/:id/consultas-futuras',
      { schema: { tags, params: comId, response: { 200: z.array(consulta) } } },
      async (req) => s.consultasFuturasDoPaciente(banco, req.params.id),
    );

    app.get(
      '/pacientes/:id/pendencias',
      {
        schema: {
          tags,
          summary: 'R-X2',
          params: comId,
          response: { 200: z.array(pendenciaModulo) },
        },
      },
      async (req) => s.pendenciasDoPaciente(banco, req.params.id),
    );

    app.post(
      '/pacientes',
      { schema: { tags, summary: 'P1', body: esquemaPaciente, response: { 201: paciente } } },
      async (req, res) => {
        const p = await s.criarPaciente(banco, req.body);
        responderComVersao(req, res, p.versao);
        return res.status(201).send(p);
      },
    );

    app.put(
      '/pacientes/:id',
      {
        schema: {
          tags,
          summary: 'P2 (If-Match obrigatório)',
          params: comId,
          body: esquemaPaciente,
          response: { 200: paciente },
        },
      },
      async (req, res) => {
        const p = await s.atualizarPaciente(banco, req.params.id, req.body, versaoExigida(req));
        responderComVersao(req, res, p.versao);
        return p;
      },
    );

    app.post(
      '/pacientes/:id/inativar',
      {
        schema: {
          tags,
          summary: 'P3: inativa e cancela as consultas futuras',
          params: comId,
          body: z.object({ motivo: z.string().max(300).optional() }).optional(),
          response: { 200: z.object({ consultasCanceladas: z.number().int() }) },
        },
      },
      async (req) => ({
        consultasCanceladas: await s.inativarPaciente(
          banco,
          req.params.id,
          req.body?.motivo,
          versaoOpcional(req),
        ),
      }),
    );

    app.post(
      '/pacientes/:id/reativar',
      { schema: { tags, summary: 'P4', params: comId, response: { 200: paciente } } },
      async (req) => s.reativarPaciente(banco, req.params.id, versaoOpcional(req)),
    );

    app.delete(
      '/pacientes/:id',
      {
        schema: {
          tags,
          summary: 'P5 (só sem histórico)',
          params: comId,
          response: { 204: z.null() },
        },
      },
      async (req, res) => {
        await s.excluirPaciente(banco, req.params.id, versaoOpcional(req));
        return res.status(204).send(null);
      },
    );
  };
}
