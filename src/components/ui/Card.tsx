import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

export interface AcaoCard {
  rotulo: string;
  href: string;
}

interface CardProps {
  titulo?: string;
  /** id da seção (permite links âncora, ex.: #alertas-emergencia). */
  id?: string;
  /** Link no canto superior direito, ex.: "Ver todos". */
  acao?: AcaoCard;
  /** Conteúdo livre no canto superior direito (ex.: seletor de período). Tem prioridade sobre `acao`. */
  extra?: ReactNode;
  variante?: 'padrao' | 'perigo';
  className?: string;
  children: ReactNode;
}

/** Contêiner base de todos os cards do painel. Vira uma região nomeada quando tem título. */
export function Card({
  id,
  titulo,
  acao,
  extra,
  variante = 'padrao',
  className,
  children,
}: CardProps) {
  const idTitulo = useId();
  const perigo = variante === 'perigo';

  return (
    <section
      id={id}
      aria-labelledby={titulo ? idTitulo : undefined}
      className={cn(
        'flex min-w-0 flex-col rounded-[var(--radius-card)] border p-5 shadow-[var(--shadow-card)]',
        perigo ? 'border-danger/15 bg-danger-bg' : 'border-border bg-card',
        className,
      )}
    >
      {(titulo || acao || extra) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {titulo && (
            <h2
              id={idTitulo}
              className={cn('text-[16.5px] font-semibold', perigo ? 'text-danger' : 'text-text')}
            >
              {titulo}
            </h2>
          )}
          {extra ??
            (acao && (
              <Link
                to={acao.href}
                className={cn(
                  'shrink-0 rounded text-[13px] hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                  perigo ? 'text-danger' : 'text-text',
                )}
              >
                {acao.rotulo}
              </Link>
            ))}
        </header>
      )}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
