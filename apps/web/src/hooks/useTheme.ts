import { useCallback, useEffect, useState } from 'react';

export type Tema = 'light' | 'dark';

export const CHAVE_TEMA = 'medicore-tema';

function lerTemaSalvo(): Tema | null {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    return salvo === 'light' || salvo === 'dark' ? salvo : null;
  } catch {
    return null;
  }
}

function temaDoSistema(): Tema {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** Tema inicial: o salvo pelo usuário ou, na falta dele, o do sistema operacional. */
export function temaInicial(): Tema {
  return lerTemaSalvo() ?? temaDoSistema();
}

/**
 * Controla o modo claro/escuro aplicando `data-theme` no <html>.
 * A escolha só é salva quando o usuário alterna; até lá, o painel
 * acompanha a preferência do sistema.
 */
export function useTheme() {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
  }, [tema]);

  // Acompanha mudanças do sistema enquanto não houver escolha salva.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const aoMudar = (e: MediaQueryListEvent) => {
      if (!lerTemaSalvo()) setTema(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  const alternarTema = useCallback(() => {
    setTema((atual) => {
      const novo: Tema = atual === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(CHAVE_TEMA, novo);
      } catch {
        /* armazenamento indisponível: o tema vale só nesta visita */
      }
      return novo;
    });
  }, []);

  return { tema, alternarTema };
}
