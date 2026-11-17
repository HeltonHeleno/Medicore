/** Fase 28 — Para onde voltar depois de entrar: só caminhos do próprio app. */
export function destinoSeguro(volta: string | null): string {
  if (!volta || !volta.startsWith('/') || volta.startsWith('//') || volta.startsWith('/\\')) {
    return '/';
  }
  return volta;
}

/** O token dos links (convite, senha nova) vem depois do `#`: nunca chega a um servidor. */
export const tokenDoLink = (hash: string) => decodeURIComponent(hash.replace(/^#/, ''));
