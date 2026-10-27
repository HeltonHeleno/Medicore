import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { CarregandoPagina } from './components/ui/CarregandoPagina';
import { ErroDeRota } from './components/ui/ErroDeRota';
import { itensNavegacao } from './config/navegacao';
import { t } from './i18n/pt-BR';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import Placeholder from './pages/Placeholder';

/** Metadados de cada rota, lidos por `useMatches()` (título da aba e, na Fase 9, breadcrumb). */
export interface HandleRota {
  titulo: string;
  breadcrumb?: string;
}

const handle = (titulo: string, breadcrumb = titulo): HandleRota => ({ titulo, breadcrumb });

/** Página carregada sob demanda (cada tela vira um arquivo separado no build). */
const pagina = (carregar: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await carregar()).default,
});

/** Pacientes (Fase 10): lista, cadastro, detalhe e edição. */
const rotasPacientes: RouteObject = {
  path: 'pacientes',
  handle: handle(t.pacientes.titulo),
  children: [
    {
      index: true,
      lazy: pagina(() => import('./pages/pacientes/ListaPacientes')),
      handle: { titulo: t.pacientes.titulo },
    },
    {
      path: 'novo',
      lazy: pagina(() => import('./pages/pacientes/NovoPaciente')),
      handle: handle(t.pacientes.novo),
    },
    {
      path: ':id',
      handle: handle(t.pacientes.detalhe),
      children: [
        {
          index: true,
          lazy: pagina(() => import('./pages/pacientes/DetalhePaciente')),
          handle: { titulo: t.pacientes.detalhe },
        },
        {
          path: 'editar',
          lazy: pagina(() => import('./pages/pacientes/EditarPaciente')),
          handle: handle(t.pacientes.editar, t.pacientes.editarBreadcrumb),
        },
      ],
    },
  ],
};

/** Médicos (Fase 11): lista, cadastro, detalhe e edição. */
const rotasMedicos: RouteObject = {
  path: 'medicos',
  handle: handle(t.medicos.titulo),
  children: [
    {
      index: true,
      lazy: pagina(() => import('./pages/medicos/ListaMedicos')),
      handle: { titulo: t.medicos.titulo },
    },
    {
      path: 'novo',
      lazy: pagina(() => import('./pages/medicos/NovoMedico')),
      handle: handle(t.medicos.novo),
    },
    {
      path: ':id',
      handle: handle(t.medicos.detalhe),
      children: [
        {
          index: true,
          lazy: pagina(() => import('./pages/medicos/DetalheMedico')),
          handle: { titulo: t.medicos.detalhe },
        },
        {
          path: 'editar',
          lazy: pagina(() => import('./pages/medicos/EditarMedico')),
          handle: handle(t.medicos.editar, t.medicos.editarBreadcrumb),
        },
      ],
    },
  ],
};

/** Itens do menu que já têm telas próprias (os demais usam o Placeholder). */
const COM_TELA = new Set(['/', '/pacientes', '/medicos']);

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
      hydrateFallbackElement: <CarregandoPagina />,
      children: [
        {
          errorElement: <ErroDeRota />,
          children: [
            { index: true, element: <Dashboard />, handle: handle(t.menu.painel) },
            rotasPacientes,
            rotasMedicos,
            ...itensNavegacao
              .filter((item) => !COM_TELA.has(item.caminho))
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
            // Vitrine só em desenvolvimento; carregada sob demanda para não entrar no build.
            ...(import.meta.env.DEV
              ? [
                  {
                    path: 'ui',
                    lazy: async () => ({ Component: (await import('./pages/UiShowcase')).default }),
                    handle: handle(t.vitrine.titulo),
                  },
                ]
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
