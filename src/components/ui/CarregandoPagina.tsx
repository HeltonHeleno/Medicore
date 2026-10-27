import { Loader2 } from 'lucide-react';
import { t } from '../../i18n/pt-BR';

/** Mostrado na primeira carga enquanto a tela (carregada sob demanda) chega. */
export function CarregandoPagina() {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center bg-bg text-text-muted"
    >
      <Loader2 size={28} aria-hidden className="animate-spin" />
      <span className="sr-only">{t.lista.carregandoPagina}</span>
    </div>
  );
}
