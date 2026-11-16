/**
 * Fase 24 (24.3.6, vinda da 23.2.1; BL-05.2) — Erros inesperados da API no Sentry.
 *
 * Usa a mesma limpeza do navegador (`@medicore/dominio/monitoramento/limpeza`): nada que
 * identifique alguém sai do servidor. Sem `SENTRY_DSN`, o SDK nem é carregado; o `id` devolvido
 * no 500 continua existindo (um UUID), para ligar a resposta ao log.
 */
import { randomUUID } from 'node:crypto';
import { limparEvento, limparMigalha, limparSpan } from '@medicore/dominio/monitoramento/limpeza';
import type { Config } from './config';

/** Registra um erro inesperado e devolve o código do evento (vai no corpo do 500). */
export type RegistrarErro = (erro: unknown) => string;

export async function iniciarMonitoramento(
  config: Pick<Config, 'SENTRY_DSN' | 'AMBIENTE'>,
  versao: string,
): Promise<RegistrarErro> {
  if (!config.SENTRY_DSN) return () => randomUUID().replaceAll('-', '');
  const Sentry = await import('@sentry/node');
  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.AMBIENTE,
    release: `medicore-api@${versao}`,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
    },
    tracesSampleRate: 0.1,
    beforeSend: (evento) => limparEvento(evento),
    beforeBreadcrumb: (migalha) => limparMigalha(migalha),
    beforeSendSpan: (span) => limparSpan(span),
  });
  return (erro) => Sentry.captureException(erro);
}
