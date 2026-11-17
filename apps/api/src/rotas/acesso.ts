/**
 * Fase 28 (BL-02.1 a BL-02.4) — Entrar, segundo fator, convite, senha nova e sair.
 *
 * Todas são públicas para a guarda (`/auth/*`): cada uma confere a sessão que precisa. O cookie
 * leva o token da sessão (HttpOnly); a resposta leva o código de segurança das gravações (`csrf`).
 */
import {
  configuracaoMfa,
  contaDemonstracao,
  conviteConferido,
  entradaCodigo,
  entradaLogin,
  entradaSenhaNova,
  entradaToken,
  opcoesAcesso,
  respostaSessao,
  sessaoComCodigos,
} from '@medicore/dominio/contrato/acesso';
import { ErroNaoEncontrado, ErroPermissao, ErroSessao } from '@medicore/dominio/erros';
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Banco } from '../banco/conexao';
import type { Enviador } from '../acesso/email';
import { cookieApagado, cookieDaSessao, csrfConfere, sessaoDaRequisicao } from '../acesso/guarda';
import * as s from '../acesso/servico';

const tags = ['acesso'];

export interface OpcoesRotasAcesso {
  banco: Banco;
  enviador: Enviador;
  /** Endereço do app, para os links dos e-mails. */
  appUrl: string;
  demonstracao: boolean;
}

/** Link do convite ou da senha nova. O token vai depois do `#`: não chega a nenhum servidor. */
export const linkDoToken = (appUrl: string, tipo: 'convite' | 'redefinicao', token: string) =>
  `${appUrl.replace(/\/$/, '')}/${tipo === 'convite' ? 'primeiro-acesso' : 'redefinir-senha'}#${token}`;

function semCache(resposta: FastifyReply) {
  resposta.header('Cache-Control', 'no-store');
}

function responderSessao(
  resposta: FastifyReply,
  r: { token: string; sessao: s.Sessao; expiraEm: string },
) {
  semCache(resposta);
  resposta.header('Set-Cookie', cookieDaSessao(r.token, r.expiraEm));
  return s.respostaDaSessao(r.sessao, r.expiraEm);
}

/** A sessão da etapa do MFA, com o código de segurança. */
async function sessaoNaEtapaMfa(banco: Banco, requisicao: FastifyRequest) {
  const achada = await sessaoDaRequisicao(banco, requisicao);
  if (!achada || achada.sessao.etapa !== 'mfa') throw new ErroSessao();
  if (!csrfConfere(requisicao, achada.sessao)) throw new ErroPermissao(ta.semCodigoSeguranca);
  return achada.sessao;
}

export function rotasAcesso({
  banco,
  enviador,
  appUrl,
  demonstracao,
}: OpcoesRotasAcesso): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/auth/opcoes',
      {
        schema: { tags, summary: 'O que a tela de login oferece', response: { 200: opcoesAcesso } },
      },
      async () => ({ demonstracao, email: enviador.configurado }),
    );

    app.get(
      '/auth/sessao',
      {
        schema: {
          tags,
          summary: 'A sessão do cookie (401 sem sessão)',
          response: { 200: respostaSessao },
        },
      },
      async (req, res) => {
        const achada = await sessaoDaRequisicao(banco, req);
        if (!achada) {
          res.header('Set-Cookie', cookieApagado());
          throw new ErroSessao();
        }
        semCache(res);
        return s.respostaDaSessao(achada.sessao, achada.expiraEm);
      },
    );

    app.post(
      '/auth/entrar',
      {
        schema: {
          tags,
          summary: 'E-mail e senha (BL-02.1). Erros seguidos bloqueiam o e-mail (R-AU3, 429).',
          body: entradaLogin,
          response: { 200: respostaSessao },
        },
      },
      async (req, res) =>
        responderSessao(res, await s.entrar(banco, req.body.email, req.body.senha)),
    );

    app.post(
      '/auth/demonstracao',
      {
        schema: {
          tags,
          summary: 'Entrar numa conta de demonstração (fora da produção)',
          body: z.object({ conta: contaDemonstracao }),
          response: { 200: respostaSessao },
        },
      },
      async (req, res) => {
        if (!demonstracao) throw new ErroNaoEncontrado(ta.demonstracaoIndisponivel);
        return responderSessao(res, await s.entrarDemonstracao(banco, req.body.conta));
      },
    );

    app.post(
      '/auth/mfa',
      {
        schema: {
          tags,
          summary: 'Código do aplicativo ou de recuperação (BL-02.2)',
          body: entradaCodigo,
          response: { 200: respostaSessao },
        },
      },
      async (req, res) => {
        const sessao = await sessaoNaEtapaMfa(banco, req);
        return responderSessao(res, await s.confirmarMfa(banco, sessao, req.body.codigo));
      },
    );

    app.post(
      '/auth/mfa/configurar',
      {
        schema: {
          tags,
          summary: 'Segredo e QR code do primeiro acesso com MFA',
          response: { 200: configuracaoMfa },
        },
      },
      async (req, res) => {
        semCache(res);
        return s.iniciarConfiguracaoMfa(banco, await sessaoNaEtapaMfa(banco, req));
      },
    );

    app.post(
      '/auth/mfa/confirmar',
      {
        schema: {
          tags,
          summary: 'Primeiro código: liga o MFA e devolve os códigos de recuperação (uma vez)',
          body: entradaCodigo,
          response: { 200: sessaoComCodigos },
        },
      },
      async (req, res) => {
        const sessao = await sessaoNaEtapaMfa(banco, req);
        const r = await s.concluirConfiguracaoMfa(banco, sessao, req.body.codigo);
        return { ...responderSessao(res, r), codigosRecuperacao: r.codigosRecuperacao };
      },
    );

    app.post(
      '/auth/convite/conferir',
      {
        schema: {
          tags,
          summary: 'O convite ainda vale? (para a tela dizer "Olá, Fulana")',
          body: entradaToken,
          response: { 200: conviteConferido },
        },
      },
      async (req) => s.conferirConvite(banco, req.body.token),
    );

    app.post(
      '/auth/convite',
      {
        schema: {
          tags,
          summary: 'Aceitar o convite: define a senha e entra (BL-02.2)',
          body: entradaSenhaNova,
          response: { 200: respostaSessao },
        },
      },
      async (req, res) =>
        responderSessao(res, await s.aceitarConvite(banco, req.body.token, req.body.senha)),
    );

    app.post(
      '/auth/esqueci',
      {
        schema: {
          tags,
          summary: 'Pede o link de senha nova. A resposta é a mesma exista a conta ou não.',
          body: z.object({ email: z.string().trim().min(1).max(254) }),
          response: { 202: z.object({}) },
        },
      },
      async (req, res) => {
        const pedido = await s.pedirRedefinicao(banco, req.body.email);
        if (pedido && enviador.configurado) {
          const link = linkDoToken(appUrl, 'redefinicao', pedido.token);
          // Falha do provedor não muda a resposta (não revela se a conta existe).
          await enviador
            .enviar({
              para: pedido.email,
              assunto: ta.esqueci.assunto,
              texto: ta.esqueci.corpo(pedido.nome, link),
            })
            .catch((erro: unknown) => req.log.error({ tipo: (erro as Error)?.name }, 'e-mail'));
        }
        return res.status(202).send({});
      },
    );

    app.post(
      '/auth/redefinir',
      {
        schema: {
          tags,
          summary: 'Senha nova pelo link; encerra todas as sessões (BL-02.3)',
          body: entradaSenhaNova,
          response: { 204: z.null() },
        },
      },
      async (req, res) => {
        await s.redefinirSenha(banco, req.body.token, req.body.senha);
        return res.status(204).send(null);
      },
    );

    app.post(
      '/auth/sair',
      { schema: { tags, summary: 'Encerra a sessão', response: { 204: z.null() } } },
      async (req, res) => {
        const achada = await sessaoDaRequisicao(banco, req);
        if (achada && csrfConfere(req, achada.sessao))
          await s.encerrarSessao(banco, achada.sessao.id);
        res.header('Set-Cookie', cookieApagado());
        return res.status(204).send(null);
      },
    );
  };
}
