/**
 * Fase 28 (BL-02.7, D31) — O usuário da requisição atual, guardado num `AsyncLocalStorage`.
 *
 * Os serviços são os mesmos do navegador e perguntam "quem fez" por `autoria()` do domínio; aqui
 * essa pergunta passa a responder com o usuário da sessão. Fora de uma requisição (rotinas do
 * servidor, semeadura, testes de serviço) continua o autor de demonstração.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { definirFonteDoAutor } from '@medicore/dominio/utils/autor';
import type { Sessao } from './servico';

export interface ContextoRequisicao {
  sessao?: Sessao;
}

const armazenamento = new AsyncLocalStorage<ContextoRequisicao>();

/** Roda `fn` (o resto da requisição) com um contexto próprio. */
export const comContexto = <T>(fn: () => T): T => armazenamento.run({}, fn);

export const contextoAtual = (): ContextoRequisicao | undefined => armazenamento.getStore();

export const usuarioAtual = () => armazenamento.getStore()?.sessao?.usuario;

definirFonteDoAutor(() => {
  const u = usuarioAtual();
  return u ? { usuarioId: u.id, nome: u.nome } : undefined;
});
