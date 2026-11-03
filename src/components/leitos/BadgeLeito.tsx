import type { StatusLeito } from '../../types';
import { tl } from '../../i18n/pt-BR/leitos';
import { cn } from '../../utils/cn';
import { ESTILO_LEITO, ICONE_LEITO } from './estilos-leito';

/** Situação do leito: ícone + texto + cor. */
export function BadgeLeito({ status, className }: { status: StatusLeito; className?: string }) {
  const Icone = ICONE_LEITO[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[12px] leading-none font-semibold whitespace-nowrap',
        ESTILO_LEITO[status],
        className,
      )}
    >
      <Icone size={13} aria-hidden className="shrink-0" />
      {tl.status[status]}
    </span>
  );
}
