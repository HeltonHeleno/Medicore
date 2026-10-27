import { AlertTriangle } from 'lucide-react';
import { t } from '../../i18n/pt-BR';

/** Alergias em destaque no cadastro (e, na Fase 12, na consulta). */
export function AlertaAlergias({ alergias }: { alergias?: string }) {
  if (!alergias) return null;
  return (
    <section
      aria-label={t.pacientes.alergiasTitulo}
      className="flex items-start gap-3 rounded-[var(--radius-card)] border border-danger/30 bg-danger-bg p-4 text-text"
    >
      <AlertTriangle size={20} aria-hidden className="mt-0.5 shrink-0 text-danger" />
      <div>
        <h2 className="text-[14px] font-semibold text-danger">{t.pacientes.alergiasTitulo}</h2>
        <p className="mt-0.5 text-[14px]">{alergias}</p>
      </div>
    </section>
  );
}
