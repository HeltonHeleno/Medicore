/**
 * Fase 28 (BL-02.5) — Administração de usuários (só o perfil Administrador; ver
 * `acesso/rotas-permissoes.ts`). Usuário nunca é excluído, só desativado.
 */
import {
  entradaUsuario,
  usuarioAdministrado,
  usuarioComLink,
} from '@medicore/dominio/contrato/acesso';
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import type { FastifyBaseLogger } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../banco/conexao';
import type { Enviador } from '../acesso/email';
import * as s from '../acesso/servico';
import { responderComVersao, naoModificado, versaoExigida } from '../http/versao';
import { linkDoToken } from './acesso';

const comId = z.object({ id: z.string() });
const tags = ['usuários'];

export interface OpcoesRotasUsuarios {
  banco: Banco;
  enviador: Enviador;
  appUrl: string;
}

export function rotasUsuarios({
  banco,
  enviador,
  appUrl,
}: OpcoesRotasUsuarios): FastifyPluginAsyncZod {
  /**
   * Com e-mail: envia e responde só para quem foi. Sem e-mail (ou se o envio falhar): o link volta
   * para o administrador enviar. O link nunca vai para o log.
   */
  async function entregar(
    log: FastifyBaseLogger,
    r: { tipo: 'convite' | 'redefinicao'; token: string; usuario: s.UsuarioAdministrado },
  ) {
    const link = linkDoToken(appUrl, r.tipo, r.token);
    if (enviador.configurado) {
      const textos = r.tipo === 'convite' ? ta.convite : ta.esqueci;
      try {
        await enviador.enviar({
          para: r.usuario.email,
          assunto: textos.assunto,
          texto: textos.corpo(r.usuario.nome, link),
        });
        return { usuario: r.usuario, tipo: r.tipo, enviadoPara: r.usuario.email };
      } catch (erro) {
        log.error({ tipo: (erro as Error)?.name }, 'e-mail');
      }
    }
    return { usuario: r.usuario, tipo: r.tipo, link };
  }

  return async (app) => {
    app.get(
      '/usuarios',
      {
        schema: {
          tags,
          summary: 'Todos os usuários (sem as contas de demonstração)',
          response: { 200: z.array(usuarioAdministrado) },
        },
      },
      async () => s.listarUsuarios(banco),
    );

    app.get(
      '/usuarios/:id',
      { schema: { tags, params: comId, response: { 200: usuarioAdministrado } } },
      async (req, res) => {
        const u = await s.obterUsuario(banco, req.params.id);
        if (responderComVersao(req, res, u.versao)) return naoModificado(res);
        return u;
      },
    );

    app.post(
      '/usuarios',
      {
        schema: {
          tags,
          summary: 'Convidar: cria a conta e o link de primeiro acesso (48 h)',
          body: entradaUsuario,
          response: { 201: usuarioComLink },
        },
      },
      async (req, res) => {
        const r = await s.convidar(banco, req.body);
        return res.status(201).send(await entregar(req.log, { ...r, tipo: 'convite' }));
      },
    );

    app.put(
      '/usuarios/:id',
      {
        schema: {
          tags,
          summary: 'Nome, e-mail, perfis e médico vinculado',
          params: comId,
          body: entradaUsuario,
          response: { 200: usuarioAdministrado },
        },
      },
      async (req, res) => {
        const u = await s.editarUsuario(banco, req.params.id, req.body, versaoExigida(req));
        responderComVersao(req, res, u.versao);
        return u;
      },
    );

    const acao = (
      caminho: string,
      summary: string,
      fn: (banco: Banco, id: string) => Promise<s.UsuarioAdministrado>,
    ) =>
      app.post(
        `/usuarios/:id/${caminho}`,
        { schema: { tags, summary, params: comId, response: { 200: usuarioAdministrado } } },
        async (req) => fn(banco, req.params.id),
      );

    acao(
      'desativar',
      'Desativa e encerra as sessões (E-17: sempre sobra um administrador)',
      s.desativarUsuario,
    );
    acao('reativar', 'Reativa a conta', s.reativarUsuario);
    acao('desbloquear', 'Libera o e-mail bloqueado por tentativas (R-AU3)', s.desbloquearUsuario);
    acao('redefinir-mfa', 'Apaga o segundo fator; a pessoa configura de novo', s.redefinirMfa);

    app.post(
      '/usuarios/:id/link',
      {
        schema: {
          tags,
          summary: 'Novo convite (sem senha ainda) ou link de senha nova',
          params: comId,
          response: { 200: usuarioComLink },
        },
      },
      async (req) => entregar(req.log, await s.novoLinkDoUsuario(banco, req.params.id)),
    );
  };
}
