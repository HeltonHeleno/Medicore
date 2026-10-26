import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { t } from '../../i18n/pt-BR';
import { cn } from '../../utils/cn';
import { Sidebar } from './Sidebar';

interface MobileDrawerProps {
  aberto: boolean;
  aoFechar: () => void;
}

const SELETOR_FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Menu lateral deslizante para telas menores que 1024px. */
export function MobileDrawer({ aberto, aoFechar }: MobileDrawerProps) {
  const painelRef = useRef<HTMLDivElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;

    // Trava a rolagem da página enquanto o drawer está aberto.
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    fecharRef.current?.focus();

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        aoFechar();
        return;
      }
      // Mantém o foco preso dentro do drawer.
      if (e.key === 'Tab' && painelRef.current) {
        const focaveis = Array.from(
          painelRef.current.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS),
        );
        if (focaveis.length === 0) return;
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    };
    document.addEventListener('keydown', aoTeclar);

    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto, aoFechar]);

  return (
    <div
      className={cn('fixed inset-0 z-40 lg:hidden', !aberto && 'pointer-events-none')}
      aria-hidden={!aberto}
      inert={!aberto}
    >
      <div
        onClick={aoFechar}
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-200',
          aberto ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.menu.rotuloNavegacao}
        className={cn(
          'absolute inset-y-0 left-0 w-[260px] max-w-[85vw] shadow-xl transition-transform duration-200',
          aberto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          ref={fecharRef}
          type="button"
          aria-label={t.menu.fecharMenu}
          onClick={aoFechar}
          className="absolute top-4 right-3 z-10 inline-flex size-9 items-center justify-center rounded-md text-white/90 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
        >
          <X size={20} aria-hidden />
        </button>
        <Sidebar aoNavegar={aoFechar} className="overflow-y-auto" />
      </div>
    </div>
  );
}
