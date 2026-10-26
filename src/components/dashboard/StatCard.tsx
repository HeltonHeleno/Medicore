import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../utils/cn';
import { formatNumero } from '../../utils/format';

interface StatCardProps {
  titulo: string;
  valor?: number;
  detalhe?: ReactNode;
  tendencia?: 'alta' | 'baixa';
  destaque?: 'perigo';
  carregando?: boolean;
  className?: string;
}

/** Card de indicador (KPI): título, número grande e uma linha de apoio. */
export function StatCard({
  titulo,
  valor,
  detalhe,
  tendencia,
  destaque,
  carregando,
  className,
}: StatCardProps) {
  const Seta = tendencia === 'alta' ? ArrowUp : tendencia === 'baixa' ? ArrowDown : null;
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-[var(--radius-card)] border border-border bg-card px-4 py-4 shadow-[var(--shadow-card)] sm:px-5',
        className,
      )}
    >
      <h2 className="text-[14px] font-medium text-text">{titulo}</h2>
      {carregando || valor === undefined ? (
        <div className="mt-3 space-y-2" aria-busy="true">
          <Skeleton largura={72} altura={28} />
          <Skeleton largura="80%" altura={12} />
        </div>
      ) : (
        <>
          <p
            className={cn(
              'mt-1.5 text-[28px] leading-tight font-bold tabular-nums',
              destaque === 'perigo' ? 'text-danger' : 'text-text',
            )}
          >
            {formatNumero(valor)}
          </p>
          {detalhe && (
            <p className="mt-1.5 flex items-center gap-1 text-[12px] text-text-muted">
              {Seta && <Seta size={13} aria-hidden className="shrink-0" />}
              <span>{detalhe}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
