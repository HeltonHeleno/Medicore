import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CHAVE_TEMA } from '../hooks/useTheme';
import { renderizarComRotas } from './utils/renderizarComRotas';

const renderizar = (rota = '/') => renderizarComRotas(rota);

const navPrincipal = () => screen.getByRole('navigation', { name: 'Navegação principal' });

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('rotas e navegação', () => {
  it('abre o Painel e destaca o item ativo', async () => {
    renderizar('/');
    const link = within(navPrincipal()).getByRole('link', { name: 'Painel' });
    expect(link).toHaveAttribute('aria-current', 'page');
    await waitFor(() => expect(document.title).toBe('MediCore — Painel'));
  });

  it('navega para Pacientes pelo menu', async () => {
    const user = userEvent.setup();
    renderizar('/');
    await user.click(within(navPrincipal()).getByRole('link', { name: 'Pacientes' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument();
    expect(within(navPrincipal()).getByRole('link', { name: 'Pacientes' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(navPrincipal()).getByRole('link', { name: 'Painel' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it.each([
    ['/medicos', 'Médicos'],
    ['/leitos', 'Gestão de leitos'],
    ['/configuracoes', 'Configurações'],
  ])('a rota %s mostra a página "%s"', (rota, titulo) => {
    renderizar(rota);
    expect(screen.getByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
  });

  it('mostra "Página não encontrada" para rotas desconhecidas', () => {
    renderizar('/nao-existe');
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });
});

describe('modo escuro', () => {
  it('alterna data-theme e salva a escolha', async () => {
    const user = userEvent.setup();
    renderizar('/');
    const botao = screen.getByRole('button', { name: 'Alternar modo escuro' });
    expect(document.documentElement.dataset.theme).toBe('light');

    await user.click(botao);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('dark');
    expect(botao).toHaveAttribute('aria-pressed', 'true');

    await user.click(botao);
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('usa o tema salvo ao carregar', () => {
    localStorage.setItem(CHAVE_TEMA, 'dark');
    renderizar('/');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});

describe('menu do usuário', () => {
  it('abre com foco no primeiro item e fecha com Esc devolvendo o foco', async () => {
    const user = userEvent.setup();
    renderizar('/');
    const botao = screen.getByRole('button', { name: 'Menu do usuário' });

    await user.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu');
    const itens = within(menu).getAllByRole('menuitem');
    expect(itens.map((i) => i.textContent?.trim())).toEqual([
      'Meu perfil',
      'Configurações',
      'Sair',
    ]);
    expect(itens[0]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(itens[1]).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(botao).toHaveFocus();
  });

  it('fecha ao clicar fora', async () => {
    const user = userEvent.setup();
    renderizar('/');
    await user.click(screen.getByRole('button', { name: 'Menu do usuário' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('menu mobile', () => {
  it('abre o drawer e fecha com Esc', async () => {
    const user = userEvent.setup();
    renderizar('/');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const drawer = screen.getByRole('dialog', { name: 'Navegação principal' });
    expect(document.body.style.overflow).toBe('hidden');
    expect(within(drawer).getByRole('button', { name: 'Fechar menu' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus();
  });

  it('fecha o drawer ao navegar por um link', async () => {
    const user = userEvent.setup();
    renderizar('/');
    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const drawer = screen.getByRole('dialog');
    await user.click(within(drawer).getByRole('link', { name: 'Farmácia' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Farmácia' })).toBeInTheDocument();
  });
});
