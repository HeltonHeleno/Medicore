import { t } from '../../i18n/pt-BR';
import { cn } from '../../utils/cn';

/** "Ativo" / "Inativo" de um cadastro (paciente ou médico). */
export function BadgeSituacao({ ativo, className }: { ativo: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-1 text-[12px] leading-none font-medium whitespace-nowrap',
        ativo
          ? 'bg-primary-light text-on-primary-light'
          : 'border border-border bg-bg text-text-muted',
        className,
      )}
    >
      {ativo ? t.pacientes.ativo : t.pacientes.inativo}
    </span>
  );
}
