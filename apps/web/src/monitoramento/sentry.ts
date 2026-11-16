/**
 * Fase 23 (BL-05.1, D34) — SDK do Sentry, carregado sob demanda por `./index.ts`.
 *
 * - Toda saída passa pela limpeza de `./limpeza.ts` (`beforeSend`, `beforeBreadcrumb`,
 *   `beforeSendSpan`), e o SDK já não coleta usuário, cookies, cabeçalhos, busca nem corpos.
 * - Os erros não tratados são capturados por `./index.ts` (que já existe antes de o SDK
 *   carregar); por isso a integração `GlobalHandlers` do SDK fica de fora, para não duplicar.
 * - Desempenho: 10% das navegações (D34).
 */
import {
  browserTracingIntegration,
  captureException,
  init,
  type Breadcrumb,
  type ErrorEvent,
} from '@sentry/browser';
import {
  limparEvento,
  limparMigalha,
  limparSpan,
  rotaSemParametros,
} from '@medicore/dominio/monitoramento/limpeza';
import type { OrigemErro } from './index';

export function ambiente(): string {
  if (import.meta.env.DEV) return 'desenvolvimento';
  return import.meta.env.VITE_AMBIENTE || 'demonstracao';
}

export function iniciar(dsn: string): void {
  init({
    dsn,
    release: `medicore@${__VERSAO_APP__}`,
    environment: ambiente(),
    // Na fonte, o SDK não coleta usuário, cookies, cabeçalhos, busca da URL nem corpos (D34).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    tracesSampleRate: 0.1,
    integrations: (padrao) => [
      ...padrao.filter((integracao) => integracao.name !== 'GlobalHandlers'),
      browserTracingIntegration(),
    ],
    // Erros que o próprio SDK captura (ex.: dentro de um `setTimeout`) chegam sem as nossas tags.
    beforeSend: (evento: ErrorEvent) =>
      limparEvento({
        ...evento,
        tags: {
          origem: 'global',
          rota: rotaSemParametros(window.location.pathname),
          ...evento.tags,
        },
      }),
    beforeBreadcrumb: (migalha: Breadcrumb) => limparMigalha(migalha),
    beforeSendSpan: (span) => limparSpan(span),
  });
}

export function capturar(erro: unknown, origem: OrigemErro): string {
  return captureException(erro, {
    tags: { origem, rota: rotaSemParametros(window.location.pathname) },
  });
}
