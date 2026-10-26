import { useEffect, useState } from 'react';

const TOKENS = ['primary', 'primary-light', 'text-muted', 'card', 'border', 'text'] as const;
type Token = (typeof TOKENS)[number];
export type CoresTema = Record<Token, string>;

function ler(): CoresTema {
  const estilo = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    TOKENS.map((tk) => [tk, estilo.getPropertyValue(`--color-${tk}`).trim()]),
  ) as CoresTema;
}

/**
 * Lê os tokens de cor atuais (para SVG/Recharts, que recebem cores por atributo)
 * e atualiza quando o tema muda (atributo data-theme do <html>).
 */
export function useCoresTema(): CoresTema {
  const [cores, setCores] = useState<CoresTema>(ler);
  useEffect(() => {
    const obs = new MutationObserver(() => setCores(ler()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return cores;
}
