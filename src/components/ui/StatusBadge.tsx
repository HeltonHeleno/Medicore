import { t } from '../../i18n/pt-BR';
import type { StatusConsulta } from '../../types';
import { cn } from '../../utils/cn';

const estilos: Record<StatusConsulta, string> = {
  concluida: 'bg-primary text-on-primary',
  agendada: 'bg-primary-light text-on-primary-light',
  cancelada: 'bg-danger-bg text-danger',
  faltou: 'border border-warning/40 bg-card text-warning',
};

export function StatusBadge({ status, className }: { status: StatusConsulta; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-1 text-[12px] leading-none font-medium whitespace-nowrap',
        estilos[status],
        className,
      )}
    >
      {t.status[status]}
    </span>
  );
}
