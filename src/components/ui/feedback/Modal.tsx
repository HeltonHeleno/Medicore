import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../i18n/pt-BR';
import { cn } from '../../../utils/cn';

const SELETOR_FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: ReactNode;
  children?: ReactNode;
  /** Botões do rodapé. */
  rodape?: ReactNode;
  tamanho?: 'sm' | 'md' | 'lg';
  /** Elemento que recebe o foco ao abrir (padrão: o primeiro focável). */
  focoInicial?: RefObject<HTMLElement | null>;
  /** `alertdialog` para confirmações que exigem resposta. */
  papel?: 'dialog' | 'alertdialog';
}

const larguras = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

/**
 * Janela modal acessível: foco preso dentro dela, Esc fecha, `aria-modal`,
 * rolagem da página travada e o foco volta para quem abriu (mesma lógica do MobileDrawer).
 */
export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  tamanho = 'md',
  focoInicial,
  papel = 'dialog',
}: ModalProps) {
  const painelRef = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  const idDescricao = useId();
  const aoFecharRef = useRef(aoFechar);
  useEffect(() => {
    aoFecharRef.current = aoFechar;
  });

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focaveis = () =>
      Array.from(painelRef.current?.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS) ?? []);
    (focoInicial?.current ?? focaveis()[0] ?? painelRef.current)?.focus();

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        aoFecharRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const lista = focaveis();
      if (lista.length === 0) {
        e.preventDefault();
        return;
      }
      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      const dentro = painelRef.current?.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === primeiro || !dentro)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (document.activeElement === ultimo || !dentro)) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
      // Devolve o foco a quem abriu (se ainda estiver na página).
      if (anterior?.isConnected) anterior.focus();
    };
  }, [aberto, focoInicial]);

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => aoFecharRef.current()} />
      <div
        ref={painelRef}
        role={papel}
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descricao ? idDescricao : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col rounded-[var(--radius-card)] border border-border bg-card text-text shadow-xl outline-none',
          larguras[tamanho],
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div>
            <h2 id={idTitulo} className="text-[17px] font-semibold">
              {titulo}
            </h2>
            {descricao && (
              <div id={idDescricao} className="mt-1.5 text-[14px] text-text-muted">
                {descricao}
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label={t.confirmacao.fecharJanela}
            onClick={() => aoFecharRef.current()}
            className="-mt-1 -mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {children && <div className="overflow-y-auto px-5 pt-4 sm:px-6">{children}</div>}
        {rodape && (
          <div className="flex flex-wrap justify-end gap-2 px-5 pt-5 pb-5 sm:px-6">{rodape}</div>
        )}
        {!rodape && <div className="h-5" />}
      </div>
    </div>,
    document.body,
  );
}
