import { ChevronRight } from 'lucide-react';
import { Link, useMatches } from 'react-router-dom';
import { t } from '../../../i18n/pt-BR';
import type { HandleRota } from '../../../router';

interface Item {
  rotulo: string;
  caminho: string;
}

const temBreadcrumb = (h: unknown): h is HandleRota =>
  typeof h === 'object' && h !== null && typeof (h as HandleRota).breadcrumb === 'string';

/**
 * Trilha de navegação a partir de `handle.breadcrumb` das rotas.
 * `final` substitui o texto do último item (ex.: o nome do paciente no detalhe).
 */
export function Breadcrumb({ final }: { final?: string }) {
  const matches = useMatches();
  const itens: Item[] = matches
    .filter((m) => temBreadcrumb(m.handle))
    .map((m) => ({ rotulo: (m.handle as HandleRota).breadcrumb!, caminho: m.pathname }));

  if (itens.length === 0 || itens[itens.length - 1].caminho === '/') return null;
  if (itens[0].caminho !== '/') itens.unshift({ rotulo: t.lista.inicio, caminho: '/' });
  if (final) itens[itens.length - 1] = { ...itens[itens.length - 1], rotulo: final };

  return (
    <nav aria-label={t.lista.breadcrumb}>
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-text-muted">
        {itens.map((item, i) => {
          const ultimo = i === itens.length - 1;
          return (
            <li key={`${item.caminho}-${i}`} className="flex items-center gap-1">
              {ultimo ? (
                <span aria-current="page" className="font-medium text-text">
                  {item.rotulo}
                </span>
              ) : (
                <>
                  <Link
                    to={item.caminho}
                    className="rounded hover:text-text hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    {item.rotulo}
                  </Link>
                  <ChevronRight size={14} aria-hidden />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
