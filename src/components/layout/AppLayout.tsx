import { useCallback, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { t } from '../../i18n/pt-BR';
import { Header } from './Header';
import { MobileDrawer } from './MobileDrawer';
import { Sidebar } from './Sidebar';

/** Estrutura geral: sidebar fixa (desktop) ou drawer (mobile), cabeçalho e conteúdo. */
export function AppLayout() {
  const [menuAberto, setMenuAberto] = useState(false);
  const botaoMenuRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  const fecharMenu = useCallback(() => {
    setMenuAberto(false);
    botaoMenuRef.current?.focus();
  }, []);

  // Fecha o drawer em qualquer troca de rota (ex.: voltar do navegador).
  const [rotaAnterior, setRotaAnterior] = useState(pathname);
  if (pathname !== rotaAnterior) {
    setRotaAnterior(pathname);
    setMenuAberto(false);
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[205px_minmax(0,1fr)]">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:px-4 focus:py-2"
      >
        {t.app.pularParaConteudo}
      </a>

      <aside className="sticky top-0 hidden h-screen lg:block">
        <Sidebar className="overflow-y-auto" />
      </aside>

      <MobileDrawer aberto={menuAberto} aoFechar={fecharMenu} />

      <div className="flex min-w-0 flex-col">
        <Header
          ref={botaoMenuRef}
          menuAberto={menuAberto}
          aoAbrirMenu={() => setMenuAberto(true)}
        />
        <main id="conteudo" tabIndex={-1} className="flex-1 px-4 py-5 outline-none sm:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
