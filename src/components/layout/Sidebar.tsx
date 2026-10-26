import { NavLink } from 'react-router-dom';
import { itensNavegacao } from '../../config/navegacao';
import { useUsuario } from '../../hooks/useDashboardData';
import { t } from '../../i18n/pt-BR';
import { cn } from '../../utils/cn';
import { Avatar } from '../ui/Avatar';

interface SidebarProps {
  /** Chamado ao clicar num link (o drawer mobile usa para fechar). */
  aoNavegar?: () => void;
  className?: string;
}

/** Conteúdo da barra lateral. Usado fixo no desktop e dentro do drawer no mobile. */
export function Sidebar({ aoNavegar, className }: SidebarProps) {
  const { data: usuario } = useUsuario();

  return (
    <div className={cn('flex h-full flex-col bg-sidebar px-4 pt-8 pb-5 text-white', className)}>
      <div className="px-2">
        <p className="text-[22px] leading-tight font-bold tracking-tight">{t.app.nome}</p>
        <p className="text-[13px] text-white/80">{t.app.subtitulo}</p>
      </div>

      <nav aria-label={t.menu.rotuloNavegacao} className="mt-10">
        <ul className="space-y-1.5">
          {itensNavegacao.map(({ caminho, rotulo, icone: Icone }) => (
            <li key={caminho}>
              <NavLink
                to={caminho}
                end={caminho === '/'}
                onClick={aoNavegar}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-2.5 py-2 text-[14px] transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none',
                    isActive
                      ? 'bg-primary-light font-medium text-text'
                      : 'text-white/90 hover:bg-white/8',
                  )
                }
              >
                <Icone size={17} strokeWidth={2} aria-hidden />
                {rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto pt-8">
        <div className="rounded-lg border border-white/15 bg-white/5 p-3">
          <p className="text-[13px] font-semibold">{t.suporte.titulo}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/75">{t.suporte.descricao}</p>
          <button
            type="button"
            className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
          >
            {t.suporte.botao}
          </button>
        </div>

        {usuario && (
          <div className="mt-5 flex items-center gap-3 px-1">
            <Avatar nome={usuario.tratamento} url={usuario.avatarUrl} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{usuario.tratamento}</p>
              <p className="truncate text-[11px] text-white/75">{usuario.cargo}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
