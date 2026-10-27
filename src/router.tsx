import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ErroDeRota } from './components/ui/ErroDeRota';
import { itensNavegacao } from './config/navegacao';
import { t } from './i18n/pt-BR';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import Placeholder from './pages/Placeholder';
import UiShowcase from './pages/UiShowcase';

/** Metadados de cada rota, lidos por `useMatches()` (título da aba e, na Fase 9, breadcrumb). */
export interface HandleRota {
  titulo: string;
  breadcrumb?: string;
}

const handle = (titulo: string, breadcrumb = titulo): HandleRota => ({ titulo, breadcrumb });

/**
 * Árvore de rotas da aplicação.
 *
 * - A rota de layout tem um `errorElement` próprio: se o layout falhar, o erro aparece sozinho.
 * - Uma rota intermediária sem caminho também tem `errorElement`: erros de uma página
 *   aparecem DENTRO do layout, com a sidebar e o cabeçalho funcionando (E-09).
 *
 * `rotasExtras` permite que os testes injetem rotas (ex.: uma página que lança erro).
 */
export function criarRotas(rotasExtras: RouteObject[] = []): RouteObject[] {
  return [
    {
      element: <AppLayout />,
      errorElement: <ErroDeRota />,
      children: [
        {
          errorElement: <ErroDeRota />,
          children: [
            { index: true, element: <Dashboard />, handle: handle(t.menu.painel) },
            ...itensNavegacao
              .filter((item) => item.caminho !== '/')
              .map<RouteObject>((item) => ({
                path: item.caminho.slice(1),
                element: <Placeholder titulo={item.rotulo} />,
                handle: handle(item.rotulo),
              })),
            {
              path: 'perfil',
              element: <Placeholder titulo={t.userMenu.meuPerfil} />,
              handle: handle(t.userMenu.meuPerfil),
            },
            ...(import.meta.env.DEV
              ? [{ path: 'ui', element: <UiShowcase />, handle: handle(t.vitrine.titulo) }]
              : []),
            ...rotasExtras,
            { path: '*', element: <NotFound />, handle: handle(t.paginas.naoEncontrada) },
          ],
        },
      ],
    },
  ];
}

export const router = createBrowserRouter(criarRotas());
