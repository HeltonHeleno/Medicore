import { Bell, Menu, MessageSquareText, Moon, Search, Sun } from 'lucide-react';
import { forwardRef, useId, type ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { t } from '../../i18n/pt-BR';
import { cn } from '../../utils/cn';
import { UserMenu } from './UserMenu';

const classeBotaoIcone =
  'relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-text shadow-[var(--shadow-card)] transition-colors hover:bg-primary-light/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

function Indicador({ cor }: { cor: 'primary' | 'info' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute top-2 right-2 size-2 rounded-full ring-2 ring-card',
        cor === 'primary' ? 'bg-primary' : 'bg-info',
      )}
    />
  );
}

function BotaoIcone({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <button type="button" aria-label={rotulo} title={rotulo} className={classeBotaoIcone}>
      {children}
    </button>
  );
}

interface HeaderProps {
  aoAbrirMenu: () => void;
  menuAberto: boolean;
}

export const Header = forwardRef<HTMLButtonElement, HeaderProps>(function Header(
  { aoAbrirMenu, menuAberto },
  refBotaoMenu,
) {
  const { tema, alternarTema } = useTheme();
  const idBusca = useId();
  const escuro = tema === 'dark';

  return (
    <header className="flex items-center gap-3 px-4 pt-5 pb-2 sm:px-6 lg:pt-8">
      <button
        ref={refBotaoMenu}
        type="button"
        aria-label={t.menu.abrirMenu}
        aria-expanded={menuAberto}
        onClick={aoAbrirMenu}
        className={cn(classeBotaoIcone, 'lg:hidden')}
      >
        <Menu size={20} aria-hidden />
      </button>

      <form
        role="search"
        aria-label={t.header.pesquisarRotulo}
        className="min-w-0 flex-1 sm:flex-none"
        onSubmit={(e) => e.preventDefault()}
      >
        <label htmlFor={idBusca} className="sr-only">
          {t.header.pesquisarRotulo}
        </label>
        <div className="relative">
          <Search
            size={17}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text"
          />
          <input
            id={idBusca}
            type="search"
            placeholder={t.header.pesquisarPlaceholder}
            className="h-10 w-full rounded-md border border-border bg-card pr-3 pl-9 text-[14px] text-text placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none sm:w-[272px]"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={alternarTema}
          aria-label={t.header.alternarTema}
          aria-pressed={escuro}
          title={escuro ? t.header.temaClaro : t.header.temaEscuro}
          className={classeBotaoIcone}
        >
          {escuro ? <Sun size={19} aria-hidden /> : <Moon size={19} aria-hidden />}
        </button>
        <div className="hidden items-center gap-2 sm:flex sm:gap-4">
          <BotaoIcone rotulo={`${t.header.notificacoes} (${t.header.haNovidades})`}>
            <Bell size={19} aria-hidden />
            <Indicador cor="primary" />
          </BotaoIcone>
          <BotaoIcone rotulo={`${t.header.mensagens} (${t.header.haNovidades})`}>
            <MessageSquareText size={19} aria-hidden />
            <Indicador cor="info" />
          </BotaoIcone>
        </div>
        <div className="ml-1 sm:ml-6">
          <UserMenu />
        </div>
      </div>
    </header>
  );
});
