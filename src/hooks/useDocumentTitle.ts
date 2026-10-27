import { useEffect } from 'react';
import { useMatches } from 'react-router-dom';
import { t } from '../i18n/pt-BR';
import type { HandleRota } from '../router';

function temTitulo(handle: unknown): handle is HandleRota {
  return typeof handle === 'object' && handle !== null && 'titulo' in handle;
}

/** Título da rota mais específica que define `handle.titulo`. */
export function useTituloDaRota(): string | undefined {
  const matches = useMatches();
  const comTitulo = [...matches].reverse().find((m) => temTitulo(m.handle));
  return comTitulo ? (comTitulo.handle as HandleRota).titulo : undefined;
}

/**
 * Define o título da aba do navegador a partir do `handle.titulo` da rota atual,
 * ex.: "MediCore — Pacientes". Usado uma única vez, no `AppLayout`.
 */
export function useDocumentTitle() {
  const titulo = useTituloDaRota();
  useEffect(() => {
    if (titulo) document.title = t.app.tituloPagina(titulo);
  }, [titulo]);
}
