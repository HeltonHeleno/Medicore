/**
 * Rotas de exemplo, só para os testes da Fase 24: exercitam o padrão de lista, `ETag`/`If-Match`,
 * validação e erros sobre a tabela de pacientes, antes de existirem as rotas de verdade (Fase 25).
 */
import {
  comOrdenacao,
  filtroStatus,
  janela,
  paginado,
  respostaLista,
} from '@medicore/dominio/contrato/lista';
import { ErroNaoEncontrado } from '@medicore/dominio/erros';
import { and, asc, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../../src/banco/conexao';
import { pacientes } from '../../src/banco/esquema';
import { textoPtBr } from '../../src/http/lista';
import {
  atualizarComVersao,
  naoModificado,
  responderComVersao,
  versaoExigida,
} from '../../src/http/versao';

export const itemExemplo = z.object({
  id: z.string(),
  nome: z.string(),
  ativo: z.boolean(),
  versao: z.number().int(),
});

const consulta = comOrdenacao(['nome', 'criadoEm'] as const).extend({ status: filtroStatus });

export function rotasExemplo(banco: Banco) {
  return async (raiz: FastifyInstance) => {
    const app = raiz.withTypeProvider<ZodTypeProvider>();

    app.get(
      '/_exemplo/pacientes',
      { schema: { querystring: consulta, response: { 200: respostaLista(itemExemplo) } } },
      async (requisicao) => {
        const q = requisicao.query;
        const filtros: SQL[] = [];
        if (q.status !== 'todos') filtros.push(eq(pacientes.ativo, q.status === 'ativos'));
        if (q.busca) {
          filtros.push(
            or(ilike(pacientes.nome, `%${q.busca}%`), ilike(pacientes.cpf, `%${q.busca}%`))!,
          );
        }
        const onde = filtros.length ? and(...filtros) : undefined;
        const [{ total }] = await banco.select({ total: count() }).from(pacientes).where(onde);
        const { limite, deslocamento } = janela(q, total);
        // Mesma ordem das telas (Intl.Collator pt-BR): colação ICU do PostgreSQL.
        const coluna = q.ordenarPor === 'nome' ? textoPtBr(pacientes.nome) : pacientes.criadoEm;
        const itens = await banco
          .select({
            id: pacientes.id,
            nome: pacientes.nome,
            ativo: pacientes.ativo,
            versao: pacientes.versao,
          })
          .from(pacientes)
          .where(onde)
          .orderBy(q.ordem === 'asc' ? asc(coluna) : desc(coluna), asc(pacientes.id))
          .limit(limite)
          .offset(deslocamento);
        return paginado(itens, total, q);
      },
    );

    app.get(
      '/_exemplo/pacientes/:id',
      { schema: { params: z.object({ id: z.string() }), response: { 200: itemExemplo } } },
      async (requisicao, resposta) => {
        const [p] = await banco
          .select({
            id: pacientes.id,
            nome: pacientes.nome,
            ativo: pacientes.ativo,
            versao: pacientes.versao,
          })
          .from(pacientes)
          .where(eq(pacientes.id, requisicao.params.id));
        if (!p) throw new ErroNaoEncontrado('Paciente não encontrado');
        if (responderComVersao(requisicao, resposta, p.versao)) return naoModificado(resposta);
        return p;
      },
    );

    app.patch(
      '/_exemplo/pacientes/:id',
      {
        schema: {
          params: z.object({ id: z.string() }),
          body: z.object({ nome: z.string().trim().min(3, 'Informe o nome completo') }),
          response: { 200: itemExemplo },
        },
      },
      async (requisicao, resposta) => {
        const versao = versaoExigida(requisicao);
        const p = await atualizarComVersao(
          banco,
          pacientes,
          requisicao.params.id,
          versao,
          { nome: requisicao.body.nome },
          'Paciente não encontrado',
        );
        responderComVersao(requisicao, resposta, p.versao);
        return { id: p.id, nome: p.nome, ativo: p.ativo, versao: p.versao };
      },
    );

    app.post(
      '/_exemplo/pacientes/:id/copiar',
      { schema: { params: z.object({ id: z.string() }), body: z.object({ novoId: z.string() }) } },
      async (requisicao, resposta) => {
        const [p] = await banco
          .select()
          .from(pacientes)
          .where(eq(pacientes.id, requisicao.params.id));
        if (!p) throw new ErroNaoEncontrado('Paciente não encontrado');
        // Copia com o mesmo CPF: o banco recusa (R-P1).
        await banco.insert(pacientes).values({ ...p, id: requisicao.body.novoId });
        return resposta.status(201).send();
      },
    );

    app.get('/_exemplo/falha', async () => {
      throw new Error('falha com "Maria Oliveira", CPF 39053344705 e SELECT * FROM pacientes');
    });
  };
}
