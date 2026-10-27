import { CalendarClock } from 'lucide-react';
import { t } from '../../i18n/pt-BR';
import { disponibilidadeDosValores, textoPrevia } from './previa';
import type { ValoresMedico } from './valoresMedico';

const m = t.medicos;
/** Prévia em tempo real da grade de horários (P6, passo 5). */
export function PreviaDisponibilidade({ valores }: { valores: ValoresMedico['disponibilidade'] }) {
  const d = disponibilidadeDosValores(valores);
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-bg px-4 py-3 text-[14px] sm:col-span-full">
      <CalendarClock size={18} aria-hidden className="mt-0.5 shrink-0 text-on-primary-light" />
      <p aria-live="polite">
        <span className="font-medium">{m.previa.titulo}: </span>
        {d ? textoPrevia(d) : m.previa.semDias}
      </p>
    </div>
  );
}
