import { cn } from '../../utils/cn';

interface ProgressBarProps {
  /** Valor de 0 a 100 (valores fora da faixa são limitados). */
  valor: number;
  cor?: 'primaria' | 'perigo';
  /** Nome acessível, ex.: "Cardiologia". */
  rotulo: string;
  className?: string;
}

export function ProgressBar({ valor, cor = 'primaria', rotulo, className }: ProgressBarProps) {
  const limitado = Math.min(100, Math.max(0, valor));
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuenow={limitado}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${limitado}%`}
      className={cn(
        'h-1.5 w-full overflow-hidden rounded-full',
        cor === 'perigo' ? 'bg-danger/15' : 'bg-primary-light',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out',
          cor === 'perigo' ? 'bg-danger' : 'bg-primary',
        )}
        style={{ width: `${limitado}%` }}
      />
    </div>
  );
}
