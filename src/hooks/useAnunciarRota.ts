import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { t } from '../i18n/pt-BR';
import { useTituloDaRota } from './useDocumentTitle';

/**
 * M11: a cada troca de página (não na primeira carga), leva o foco ao `<h1>` da página
 * — ou ao `<main>`, se ela não tiver — e devolve o texto "Página: {título}" para uma
 * região `aria-live="polite"`. Mudanças só na query string (filtros) não contam.
 */
export function useAnunciarRota(seletorConteudo = '#conteudo'): string {
  const { pathname } = useLocation();
  const titulo = useTituloDaRota();
  const [anuncio, setAnuncio] = useState('');
  // Compara com o caminho anterior (e não com um "primeira vez"): o StrictMode roda o efeito duas vezes.
  const anterior = useRef(pathname);

  useEffect(() => {
    if (anterior.current === pathname) return;
    anterior.current = pathname;
    const quadro = requestAnimationFrame(() => {
      const main = document.querySelector<HTMLElement>(seletorConteudo);
      const ativo = document.activeElement;
      // A página já pôs o foco num campo (ex.: "Nome completo" no cadastro): mantém.
      if (main && ativo && ativo !== main && main.contains(ativo)) return;
      const h1 = main?.querySelector<HTMLElement>('h1');
      const alvo = h1 ?? main;
      if (!alvo) return;
      if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');
      alvo.focus({ preventScroll: true });
      window.scrollTo?.({ top: 0 });
    });
    if (titulo) setAnuncio(t.rota.anuncio(titulo));
    return () => cancelAnimationFrame(quadro);
    // Só a troca de caminho dispara; o título acompanha a rota.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return anuncio;
}
