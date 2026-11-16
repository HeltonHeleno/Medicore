/** Fase 26 — Peças comuns das rotas dos módulos operacionais. */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { naoModificado, responderComVersao } from '../http/versao';

export const comId = z.object({ id: z.string() });

/** Responde um registro com `ETag` (ou 304, se o cliente já tem essa versão). */
export function comEtag<T>(
  requisicao: FastifyRequest,
  resposta: FastifyReply,
  registro: T,
  versao: (r: T) => number = (r) => (r as { versao: number }).versao,
) {
  if (responderComVersao(requisicao, resposta, versao(registro))) return naoModificado(resposta);
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
