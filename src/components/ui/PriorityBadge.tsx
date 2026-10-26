import { t } from '../../i18n/pt-BR';
import type { Prioridade } from '../../types';
import { cn } from '../../utils/cn';

const estilos: Record<Prioridade, string> = {
  alta: 'text-danger',
  media: 'text-warning',
  baixa: 'text-text-muted',
};

export function PriorityBadge({
  prioridade,
  className,
}: {
  prioridade: Prioridade;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-card px-2 py-1 text-[12px] leading-none font-medium whitespace-nowrap',
        estilos[prioridade],
        className,
      )}
    >
      {t.prioridade[prioridade]}
    </span>
  );
}
