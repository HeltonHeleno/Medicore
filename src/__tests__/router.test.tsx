import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderizarComRotas } from './utils/renderizarComRotas';

function Explode(): never {
  throw new Error('falha de teste');
}

describe('roteador de dados (createBrowserRouter)', () => {
  it('erro numa página aparece dentro do layout, com a navegação funcionando', async () => {
    const silenciar = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderizarComRotas('/explode', [{ path: 'explode', element: <Explode /> }]);

    // (a região de notificações também tem role="alert"; o erro é o que tem o título)
    const titulo = await screen.findByRole('heading', { name: 'Algo deu errado nesta tela.' });
    const alerta = titulo.closest<HTMLElement>('[role="alert"]')!;
    expect(alerta).toBeInTheDocument();
    // Layout continua presente: menu principal e botão "Voltar para o Painel"
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
    expect(within(alerta).getByRole('link', { name: 'Voltar para o Painel' })).toHaveAttribute(
      'href',
      '/',
    );
    silenciar.mockRestore();
  });

  it('o título da aba vem do handle da rota e acompanha a navegação', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/');
    await waitFor(() => expect(document.title).toBe('MediCore — Painel'));

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    await user.click(within(nav).getByRole('link', { name: 'Médicos' }));
    await waitFor(() => expect(document.title).toBe('MediCore — Médicos'));
  });

  it('rota inexistente usa o título "Página não encontrada"', async () => {
    renderizarComRotas('/nao-existe');
    await waitFor(() => expect(document.title).toBe('MediCore — Página não encontrada'));
  });
});
