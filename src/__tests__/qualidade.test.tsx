import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { KpiCards } from '../components/dashboard/KpiCards';
import { StatCard } from '../components/dashboard/StatCard';
import * as api from '../services/api';
import { renderizarComRotas } from './utils/renderizarComRotas';

afterEach(() => vi.restoreAllMocks());

const app = () => renderizarComRotas('/');

describe('StatCard', () => {
  it('formata o valor em pt-BR e mostra a seta de tendência', () => {
    const { container } = render(
      <StatCard
        titulo="Total de pacientes"
        valor={1248}
        detalhe="12% em relação a ontem"
        tendencia="alta"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Total de pacientes' })).toBeInTheDocument();
    expect(screen.getByText('1.248')).toBeInTheDocument();
    expect(container.querySelector('svg.lucide-arrow-up')).toBeInTheDocument();
  });

  it('mostra o esqueleto enquanto não há valor', () => {
    const { container } = render(<StatCard titulo="Médicos de plantão" />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});

describe('KpiCards (erro)', () => {
  it('mostra um único "Tentar novamente" e recarrega só o que falhou', async () => {
    const kpis = vi
      .spyOn(api, 'getKpis')
      .mockRejectedValueOnce(new Error('falhou'))
      .mockResolvedValueOnce({
        totalPacientes: 10,
        variacaoPacientes: -3,
        medicosPlantao: 2,
        casosEmergencia: 1,
      });
    const leitos = vi.spyOn(api, 'getLeitos');
    render(
      <MemoryRouter>
        <KpiCards />
      </MemoryRouter>,
    );
    const botoes = await screen.findAllByRole('button', { name: 'Tentar novamente' });
    expect(botoes).toHaveLength(1);
    await userEvent.click(botoes[0]);
    expect(await screen.findByText('3% em relação a ontem')).toBeInTheDocument();
    expect(kpis).toHaveBeenCalledTimes(2);
    expect(leitos).toHaveBeenCalledTimes(1);
  });
});

describe('MobileDrawer (foco preso)', () => {
  it('Tab no último item volta ao primeiro e Shift+Tab no primeiro vai ao último', async () => {
    const user = userEvent.setup();
    app();
    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const drawer = screen.getByRole('dialog');
    const fechar = within(drawer).getByRole('button', { name: 'Fechar menu' });
    expect(fechar).toHaveFocus();

    await user.tab({ shift: true });
    const suporte = within(drawer).getByRole('button', { name: 'Falar com o suporte' });
    expect(suporte).toHaveFocus();

    await user.tab();
    expect(fechar).toHaveFocus();
  });

  it('fecha ao clicar no fundo escuro', async () => {
    const user = userEvent.setup();
    app();
    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const fundo = screen.getByRole('dialog').previousElementSibling as HTMLElement;
    await user.click(fundo);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('UserMenu (teclado)', () => {
  it('abre com seta para baixo e navega com ↑, Home e End', async () => {
    const user = userEvent.setup();
    app();
    const botao = screen.getByRole('button', { name: 'Menu do usuário' });
    botao.focus();
    await user.keyboard('{ArrowDown}');
    const itens = within(screen.getByRole('menu')).getAllByRole('menuitem');
    expect(itens[0]).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(itens[2]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(itens[0]).toHaveFocus();
    await user.keyboard('{End}');
    expect(itens[2]).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('"Meu perfil" navega para a página de perfil', async () => {
    const user = userEvent.setup();
    app();
    await user.click(screen.getByRole('button', { name: 'Menu do usuário' }));
    await user.click(screen.getByRole('menuitem', { name: 'Meu perfil' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Meu perfil' })).toBeInTheDocument();
  });
});
