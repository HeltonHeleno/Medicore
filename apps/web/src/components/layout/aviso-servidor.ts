/** Fase 27 (27.2.3) — Peças do aviso único do modo API (fora do componente, por causa do Fast Refresh). */

/** Preferência (não é dado): o aviso já foi visto neste navegador. */
export const CHAVE_AVISO_SERVIDOR = 'medicore-aviso-servidor';
const PREFIXO_DADOS_ANTIGOS = 'medicore:';

export function lerVisto(): boolean {
  try {
    return localStorage.getItem(CHAVE_AVISO_SERVIDOR) === 'visto';
  } catch {
    return true; // sem acesso ao armazenamento: não insiste a cada tela
  }
}

/** Os dados que ficavam no navegador (D27: não são levados). Tema e preferências ficam. */
export function apagarDadosAntigos(): void {
  try {
    for (const chave of Object.keys(localStorage)) {
      if (chave.startsWith(PREFIXO_DADOS_ANTIGOS)) localStorage.removeItem(chave);
    }
  } catch {
    /* sem acesso ao armazenamento */
  }
}
