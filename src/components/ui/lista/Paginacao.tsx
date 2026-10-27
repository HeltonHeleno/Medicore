import { ChevronLeft, ChevronRight } from 'lucide-react';
import { t } from '../../../i18n/pt-BR';
import { cn } from '../../../utils/cn';
import { paginasVisiveis } from './paginas';

interface PaginacaoProps {
  pagina: number;
  porPagina: number;
  total: number;
  aoMudar: (pagina: number) => void;
  className?: string;
}

const classeBotao =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-[13.5px] ' +
  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

/** "Mostrando 1–10 de 48" + navegação entre páginas (`aria-current` na atual). */
export function Paginacao({ pagina, porPagina, total, aoMudar, className }: PaginacaoProps) {
  const ultima = Math.max(1, Math.ceil(total / porPagina));
  const atual = Math.min(Math.max(1, pagina), ultima);
  const de = total === 0 ? 0 : (atual - 1) * porPagina + 1;
  const ate = Math.min(atual * porPagina, total);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 pt-4 text-[13.5px]',
        className,
      )}
    >
      <p className="text-text-muted" aria-live="polite">
        {t.lista.mostrando(de, ate, total)}
      </p>
      {ultima > 1 && (
        <nav aria-label={t.lista.paginacao}>
          <ul className="flex items-center gap-1">
            <li>
              <button
                type="button"
                className={cn(classeBotao, 'hover:bg-bg')}
                aria-label={t.lista.anterior}
                disabled={atual === 1}
                onClick={() => aoMudar(atual - 1)}
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
            </li>
            {paginasVisiveis(atual, ultima).map((p, i) =>
              p === '…' ? (
                <li key={`r${i}`} aria-hidden className="px-1 text-text-muted">
                  …
                </li>
              ) : (
                <li key={p}>
                  <button
                    type="button"
                    className={cn(
                      classeBotao,
                      p === atual ? 'bg-primary font-semibold text-on-primary' : 'hover:bg-bg',
                    )}
                    aria-label={t.lista.pagina(p)}
                    aria-current={p === atual ? 'page' : undefined}
                    onClick={() => aoMudar(p)}
                  >
                    {p}
                  </button>
                </li>
              ),
            )}
            <li>
              <button
                type="button"
                className={cn(classeBotao, 'hover:bg-bg')}
                aria-label={t.lista.proxima}
                disabled={atual === ultima}
                onClick={() => aoMudar(atual + 1)}
              >
                <ChevronRight size={18} aria-hidden />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
