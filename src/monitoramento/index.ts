/**
 * Fase 23 (BL-05) — Monitoramento de erros.
 *
 * Este arquivo fica no pacote inicial e é pequeno: só decide **se** o erro deve ir para o
 * monitoramento. O SDK do Sentry (`./sentry.ts`) é carregado sob demanda: depois da primeira
 * pintura, quando o navegador fica livre, ou no primeiro erro, o que vier antes.
 *
 * Sem `VITE_SENTRY_DSN` (desenvolvimento, testes, prévias sem a variável), nada é carregado e
 * nada sai do navegador.
 */
import { isRouteErrorResponse } from 'react-router-dom';
import {
  ErroConcorrencia,
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from '../services/erros';

/** De onde veio o erro (vira a tag `origem` no Sentry). */
export type OrigemErro = 'rota' | 'dados' | 'global';

type ModuloSentry = typeof import('./sentry');

let sdk: Promise<ModuloSentry> | null = null;

function dsn(): string | undefined {
  return import.meta.env.VITE_SENTRY_DSN || undefined;
}

/** O monitoramento só existe com a chave pública (DSN) configurada no build. */
export function monitoramentoAtivo(): boolean {
  return Boolean(dsn());
}

function carregarSdk(): Promise<ModuloSentry> {
  sdk ??= import('./sentry').then((modulo) => {
    modulo.iniciar(dsn()!);
    return modulo;
  });
  return sdk;
}

/**
 * Erros esperados não são falhas do sistema e não vão para o monitoramento: validação (E-01),
 * conflitos (E-02 a E-04), concorrência (E-05) e registro não encontrado (E-08), inclusive a
 * página 404 do roteador.
 */
export function deveCapturar(erro: unknown): boolean {
  if (
    erro instanceof ErroValidacao ||
    erro instanceof ErroConflito ||
    erro instanceof ErroConcorrencia ||
    erro instanceof ErroNaoEncontrado
  ) {
    return false;
  }
  if (isRouteErrorResponse(erro)) return erro.status >= 500;
  return erro != null;
}

/**
 * Envia o erro ao monitoramento e devolve o código do evento (para mostrar na tela de erro,
 * E-09). Sem monitoramento, ou para erros esperados, devolve `undefined`. Nunca lança.
 */
export async function capturarErro(erro: unknown, origem: OrigemErro): Promise<string | undefined> {
  if (!monitoramentoAtivo() || !deveCapturar(erro)) return undefined;
  try {
    const modulo = await carregarSdk();
    return modulo.capturar(erro, origem);
  } catch {
    // O monitoramento nunca pode derrubar a tela.
    return undefined;
  }
}

/**
 * Liga a captura de erros não tratados e agenda o carregamento do SDK para quando o navegador
 * estiver livre. Chamado uma vez, em `main.tsx`.
 */
export function iniciarMonitoramento(): void {
  if (!monitoramentoAtivo()) return;
  window.addEventListener('error', (evento) => {
    void capturarErro(evento.error ?? evento.message, 'global');
  });
  window.addEventListener('unhandledrejection', (evento) => {
    void capturarErro(evento.reason, 'global');
  });
  const carregar = () => void carregarSdk().catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(carregar, { timeout: 10_000 });
  else setTimeout(carregar, 3000);
}

/** Só para testes: esquece o SDK carregado. */
export function _reiniciarMonitoramentoParaTestes(): void {
  sdk = null;
}
