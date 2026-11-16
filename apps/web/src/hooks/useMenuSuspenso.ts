import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

/**
 * Lógica comum dos menus suspensos (menu do usuário, "⋯" das listas):
 * abrir com foco no 1º item, ↑/↓/Home/End, Esc devolve o foco ao botão,
 * Tab fecha, clique fora fecha.
 */
export function useMenuSuspenso<B extends HTMLElement = HTMLButtonElement>() {
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<B>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const itens = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ) ?? [],
    );

  const fechar = useCallback((devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) botaoRef.current?.focus();
  }, []);

  // Ao abrir, o foco vai para o primeiro item.
  useEffect(() => {
    if (aberto) itens()[0]?.focus();
  }, [aberto]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (!raizRef.current?.contains(alvo) && !menuRef.current?.contains(alvo)) setAberto(false);
    };
    document.addEventListener('pointerdown', aoClicar);
    return () => document.removeEventListener('pointerdown', aoClicar);
  }, [aberto]);

  const aoTeclarNoMenu = (e: KeyboardEvent<HTMLElement>) => {
    const lista = itens();
    const atual = lista.indexOf(document.activeElement as HTMLElement);
    const focar = (i: number) => lista[(i + lista.length) % lista.length]?.focus();
    if (e.key === 'Escape') {
      e.preventDefault();
      fechar();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      focar(atual + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focar(atual - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focar(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focar(lista.length - 1);
    } else if (e.key === 'Tab') {
      setAberto(false);
    }
  };

  /** ↓ no botão abre o menu. */
  const aoTeclarNoBotao = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowDown' && !aberto) {
      e.preventDefault();
      setAberto(true);
    }
  };

  return {
    aberto,
    setAberto,
    alternar: () => setAberto((a) => !a),
    fechar,
    raizRef,
    botaoRef,
    menuRef,
    aoTeclarNoMenu,
    aoTeclarNoBotao,
  };
}
