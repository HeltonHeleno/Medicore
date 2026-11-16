import type { CSSProperties } from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  largura?: CSSProperties['width'];
  altura?: CSSProperties['height'];
  redondo?: boolean;
  className?: string;
}

/** Bloco cinza pulsante que ocupa o lugar do conteúdo enquanto ele carrega. */
export function Skeleton({ largura = '100%', altura = 14, redondo, className }: SkeletonProps) {
  return (
    <span
      aria-hidden
      style={{ width: largura, height: altura }}
      className={cn(
        'block bg-text/8 motion-safe:animate-pulse',
        redondo ? 'rounded-full' : 'rounded-md',
        className,
      )}
    />
  );
}

/** Esqueleto padrão de lista: N linhas de texto. */
export function SkeletonLinhas({ linhas = 4, className }: { linhas?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: linhas }, (_, i) => (
        <Skeleton key={i} largura={i % 2 ? '70%' : '100%'} />
      ))}
    </div>
  );
}
