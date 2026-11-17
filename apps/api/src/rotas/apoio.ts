/** Fase 26 — Peças comuns das rotas dos módulos operacionais. */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { informarVersao, responderComVersao } from '../http/versao';

export const comId = z.object({ id: z.string() });

/**
 * Responde um registro detalhado com `ETag` (a versão para o `If-Match`), sem 304: os detalhes dos
 * módulos têm campos calculados na hora (minutos no status, prazo para desfazer), ver `informarVersao`.
 */
export function comEtag<T>(
  _requisicao: FastifyRequest,
  resposta: FastifyReply,
  registro: T,
  versao: (r: T) => number = (r) => (r as { versao: number }).versao,
) {
  informarVersao(resposta, versao(registro));
  return registro;
}

/** Gravação que devolve o registro alterado: a resposta leva o `ETag` da versão nova. */
export function gravado<T extends { versao: number }>(
  requisicao: FastifyRequest,
  resposta: FastifyReply,
  registro: T,
  status = 200,
) {
  responderComVersao(requisicao, resposta, registro.versao);
  return resposta.status(status).send(registro);
}
