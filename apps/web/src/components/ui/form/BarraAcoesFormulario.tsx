import type { ReactNode } from 'react';

/** Botões do formulário. No celular, ficam fixos no rodapé da tela (10.3.8). */
export function BarraAcoesFormulario({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 flex justify-end gap-2 border-t border-border bg-card px-4 py-3 shadow-[0_-4px_12px_rgb(0_0_0/0.06)] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
      {children}
    </div>
  );
}
