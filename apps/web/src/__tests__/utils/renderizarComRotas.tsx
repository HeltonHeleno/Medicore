import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { criarRotas } from '../../router';

/**
 * Renderiza a aplicação inteira (layout + rotas) num roteador em memória,
 * começando na rota informada. Devolve também o `router`, para inspecionar a navegação.
 */
export function renderizarComRotas(rota = '/', rotasExtras: RouteObject[] = []) {
  const router = createMemoryRouter(criarRotas(rotasExtras), { initialEntries: [rota] });
  const resultado = render(<RouterProvider router={router} />);
  return { ...resultado, router };
}
