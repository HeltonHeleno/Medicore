/** Fase 25 (25.1.2) — Rotas de médicos (P6–P8) e departamentos. */
import { DEPARTAMENTOS } from '@medicore/dominio/config/departamentos';
import {
  consulta,
  departamento,
  disponibilidade,
  filtrosMedicos,
  medico,
  medicoResumo,
  pendenciaModulo,
  referenciaCadastro,
} from '@medicore/dominio/contrato/cadastros';
import { respostaLista } from '@medicore/dominio/contrato/lista';
import { esquemaMedico } from '@medicore/dominio/schemas/medico';
import type { Disponibilidade, UF } from '@medicore/dominio/types';
import { UFS } from '@medicore/dominio/types';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../banco/conexao';
import { naoModificado, responderComVersao, versaoExigida, versaoOpcional } from '../http/versao';
import * as s from '../servicos/medicos';

const comId = z.object({ id: z.string() });
const tags = ['médicos'];

export function rotasMedicos(banco: Banco): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/departamentos',
      { schema: { tags, response: { 200: z.array(departamento) } } },
      async () => DEPARTAMENTOS.map((d) => ({ id: d.id, nome: d.nome })),
    );

    app.get(
      '/medicos',
      {
        schema: {
          tags,
          summary: 'Lista paginada (busca por nome, CRM ou telefone)',
          querystring: filtrosMedicos,
          response: { 200: respostaLista(medicoResumo) },
        },
      },
      async (req) => s.listarMedicos(banco, req.query),
    );

    app.get(
      '/medicos/:id',
      { schema: { tags, params: comId, response: { 200: medico } } },
      async (req, res) => {
        const m = await s.obterMedico(banco, req.params.id);
        if (responderComVersao(req, res, m.versao)) return naoModificado(res);
        return m;
      },
    );

    app.get(
      '/medicos/crm/:uf/:numero',
      {
        schema: {
          tags,
          summary: 'Médico que já usa o CRM (R-M1)',
          params: z.object({
            uf: z.enum(UFS as [UF, ...UF[]]),
            numero: z.string().regex(/^\d{4,7}$/),
          }),
          querystring: z.object({ ignorarId: z.string().optional() }),
          response: { 200: referenciaCadastro },
        },
      },
      async (req) => s.medicoComCrm(banco, req.params.numero, req.params.uf, req.query.ignorarId),
    );

    app.get(
      '/medicos/:id/consultas-futuras',
      { schema: { tags, summary: 'R-M2', params: comId, response: { 200: z.array(consulta) } } },
      async (req) => s.consultasFuturasDoMedico(banco, req.params.id),
    );

    app.post(
      '/medicos/:id/consultas-afetadas',
      {
        schema: {
          tags,
          summary: 'R-M3 / A3: consultas futuras fora de uma nova disponibilidade',
          params: comId,
          body: disponibilidade,
          response: { 200: z.array(consulta) },
        },
      },
      async (req) => s.consultasAfetadas(banco, req.params.id, req.body as Disponibilidade),
    );

    app.get(
      '/medicos/:id/pendencias',
      {
        schema: {
          tags,
          summary: 'R-X4',
          params: comId,
          response: { 200: z.array(pendenciaModulo) },
        },
      },
      async (req) => s.pendenciasDoMedico(banco, req.params.id),
    );

    app.post(
      '/medicos',
      { schema: { tags, summary: 'P6', body: esquemaMedico, response: { 201: medico } } },
      async (req, res) => {
        const m = await s.criarMedico(banco, req.body);
        responderComVersao(req, res, m.versao);
        return res.status(201).send(m);
      },
    );

    app.put(
      '/medicos/:id',
      {
        schema: {
          tags,
          summary: 'P7 (If-Match obrigatório)',
          params: comId,
          body: esquemaMedico,
          response: { 200: z.object({ medico, consultasForaDoHorario: z.number().int() }) },
        },
      },
      async (req, res) => {
        const r = await s.atualizarMedico(banco, req.params.id, req.body, versaoExigida(req));
        responderComVersao(req, res, r.medico.versao);
        return r;
      },
    );

    app.post(
      '/medicos/:id/inativar',
      {
        schema: {
          tags,
          summary: 'P8 (bloqueado com consultas futuras ou pendências nos módulos)',
          params: comId,
          body: z.object({ motivo: z.string().max(300).optional() }).optional(),
          response: { 200: medico },
        },
      },
      async (req) => s.inativarMedico(banco, req.params.id, req.body?.motivo, versaoOpcional(req)),
    );

    app.post(
      '/medicos/:id/reativar',
      { schema: { tags, params: comId, response: { 200: medico } } },
      async (req) => s.reativarMedico(banco, req.params.id, versaoOpcional(req)),
    );
  };
}
