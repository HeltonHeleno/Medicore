import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useUsuario } from '../../hooks/useDashboardData';
import { useMenuSuspenso } from '../../hooks/useMenuSuspenso';
import { t } from '../../i18n/pt-BR';
import { cn } from '../../utils/cn';
import { Avatar } from '../ui/Avatar';

const classeItem =
  'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[14px] text-text hover:bg-bg focus-visible:bg-bg focus-visible:outline-none';

/** Avatar com menu suspenso (Meu perfil, Configurações, Sair). */
export function UserMenu() {
  const { data: usuario } = useUsuario();
  const { aberto, alternar, fechar, raizRef, botaoRef, menuRef, aoTeclarNoMenu, aoTeclarNoBotao } =
    useMenuSuspenso();
  const menuId = useId();

  return (
    <div ref={raizRef} className="relative">
      <button
        ref={botaoRef}
        type="button"
        aria-label={t.header.menuUsuario}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? menuId : undefined}
        onClick={alternar}
        onKeyDown={aoTeclarNoBotao}
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
