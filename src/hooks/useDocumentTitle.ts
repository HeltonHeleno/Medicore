import { useEffect } from 'react';
import { t } from '../i18n/pt-BR';

/** Define o título da aba do navegador, ex.: "MediCore — Pacientes". */
export function useDocumentTitle(pagina: string) {
  useEffect(() => {
    document.title = t.app.tituloPagina(pagina);
  }, [pagina]);
}
