import { Info } from 'lucide-react';
import { t } from '../../i18n/pt-BR';

/**
 * RS-01: lembra que é um ambiente de demonstração. Some com VITE_AMBIENTE=producao.
 * Fica no topo do `<main>` (dentro de um landmark), ocupando a largura toda.
 */
export function BannerDemonstracao() {
  if (import.meta.env.VITE_AMBIENTE === 'producao') return null;
  return (
    <p className="-mx-4 -mt-5 mb-5 flex items-center gap-2 border-b border-border bg-primary-light/40 px-4 py-1.5 text-[12.5px] text-text sm:-mx-6 sm:px-6 lg:-mt-6">
      <Info size={14} aria-hidden className="shrink-0 text-on-primary-light" />
      {t.demo.aviso}
    </p>
  );
}
