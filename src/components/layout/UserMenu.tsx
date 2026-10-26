import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useUsuario } from '../../hooks/useDashboardData';
import { t } from '../../i18n/pt-BR';
import { cn } from '../../utils/cn';
import { Avatar } from '../ui/Avatar';

const classeItem =
  'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[14px] text-text hover:bg-bg focus-visible:bg-bg focus-visible:outline-none';

/** Avatar com menu suspenso (Meu perfil, Configurações, Sair). */
export function UserMenu() {
  const { data: usuario } = useUsuario();
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const itens = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  const fechar = (devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) botaoRef.current?.focus();
  };

  // Ao abrir, o foco vai para o primeiro item.
  useEffect(() => {
    if (aberto) itens()[0]?.focus();
  }, [aberto]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: PointerEvent) => {
      if (!raizRef.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('pointerdown', aoClicar);
    return () => document.removeEventListener('pointerdown', aoClicar);
  }, [aberto]);

  const aoTeclarNoMenu = (e: KeyboardEvent<HTMLDivElement>) => {
    const lista = itens();
    const atual = lista.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      fechar();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      lista[(atual + 1) % lista.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      lista[(atual - 1 + lista.length) % lista.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      lista[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      lista[lista.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      setAberto(false);
    }
  };

  return (
    <div ref={raizRef} className="relative">
      <button
        ref={botaoRef}
        type="button"
        aria-label={t.header.menuUsuario}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? menuId : undefined}
        onClick={() => setAberto((a) => !a)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !aberto) {
            e.preventDefault();
            setAberto(true);
          }
        }}
        className="flex items-center gap-2 rounded-full p-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <Avatar nome={usuario?.tratamento ?? t.app.nome} url={usuario?.avatarUrl} />
        <ChevronDown
          size={18}
          aria-hidden
          className={cn('text-text transition-transform', aberto && 'rotate-180')}
        />
      </button>

      {aberto && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t.header.menuUsuario}
          onKeyDown={aoTeclarNoMenu}
          className="absolute right-0 z-30 mt-2 w-52 rounded-lg border border-border bg-card p-1.5 shadow-lg"
        >
          {usuario && (
            <div className="border-b border-border px-3 pt-1.5 pb-2.5" role="none">
              <p className="text-[14px] font-semibold">{usuario.tratamento}</p>
              <p className="text-[12px] text-text-muted">{usuario.cargo}</p>
            </div>
          )}
          <div className="pt-1" role="none">
            <Link
              to="/perfil"
              role="menuitem"
              tabIndex={-1}
              className={classeItem}
              onClick={() => fechar(false)}
            >
              <UserRound size={16} aria-hidden /> {t.userMenu.meuPerfil}
            </Link>
            <Link
              to="/configuracoes"
              role="menuitem"
              tabIndex={-1}
              className={classeItem}
              onClick={() => fechar(false)}
            >
              <Settings size={16} aria-hidden /> {t.userMenu.configuracoes}
            </Link>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={cn(classeItem, 'text-danger')}
              onClick={() => fechar()}
            >
              <LogOut size={16} aria-hidden /> {t.userMenu.sair}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
