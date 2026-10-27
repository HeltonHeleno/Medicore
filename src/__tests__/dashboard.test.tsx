import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import * as api from '../services/api';
import { AlertList } from '../components/dashboard/AlertList';
import { AppointmentsTable } from '../components/dashboard/AppointmentsTable';
import { DepartmentPerformance } from '../components/dashboard/DepartmentPerformance';
import { KpiCards } from '../components/dashboard/KpiCards';
import { OccupancyDonut } from '../components/dashboard/OccupancyDonut';
import { AdmissionChart } from '../components/dashboard/AdmissionChart';
import { WelcomeCard } from '../components/dashboard/WelcomeCard';
import { ActivityTimeline } from '../components/dashboard/ActivityTimeline';
import { AIInsights } from '../components/dashboard/AIInsights';

const comRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

afterEach(() => vi.restoreAllMocks());

describe('KpiCards', () => {
  it('mostra os indicadores formatados e calcula os leitos disponíveis (34)', async () => {
    comRouter(<KpiCards />);
    const regiao = screen.getByRole('region', { name: 'Indicadores do dia' });
    await waitFor(() => expect(within(regiao).getByText('1.248')).toBeInTheDocument());
    expect(within(regiao).getByText('34')).toBeInTheDocument();
    expect(within(regiao).getByText('de 120 leitos no total')).toBeInTheDocument();
    expect(within(regiao).getByText('42')).toBeInTheDocument();
    expect(within(regiao).getByText('18')).toHaveClass('text-danger');
    expect(
      within(regiao).getByRole('link', { name: 'Alta prioridade — ver alertas' }),
    ).toHaveAttribute('href', '#alertas-emergencia');
  });
});

describe('WelcomeCard', () => {
  it('monta o título e o resumo a partir dos dados', async () => {
    comRouter(<WelcomeCard />);
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Veja como está o hospital hoje, Dr. Ricardo Almeida.',
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        '4 consultas hoje · UTI tendendo a 90% até a noite · 3 medicamentos com estoque baixo.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver agenda' })).toHaveAttribute('href', '/consultas');
    expect(screen.getByRole('link', { name: 'Revisar status da UTI' })).toHaveAttribute(
      'href',
      '/leitos',
    );
  });
});

describe('DepartmentPerformance', () => {
  it('pinta de vermelho só os departamentos com 90% ou mais', async () => {
    comRouter(<DepartmentPerformance />);
    const emergencia = await screen.findByRole('progressbar', { name: 'Emergência' });
    expect(emergencia.firstElementChild).toHaveClass('bg-danger');
    expect(screen.getByRole('progressbar', { name: 'Cardiologia' }).firstElementChild).toHaveClass(
      'bg-primary',
    );
    expect(screen.getAllByRole('progressbar')).toHaveLength(6);
  });
});

describe('AlertList', () => {
  it('lista alta prioridade primeiro e tem âncora para o KPI', async () => {
    comRouter(<AlertList />);
    const regiao = screen.getByRole('region', { name: 'Alertas de emergência' });
    expect(regiao).toHaveAttribute('id', 'alertas-emergencia');
    const itens = await within(regiao).findAllByRole('listitem');
    expect(itens.map((i) => within(i).getByText(/^(Alta|Média)$/).textContent)).toEqual([
      'Alta',
      'Alta',
      'Média',
    ]);
  });

  it('mostra o estado vazio', async () => {
    vi.spyOn(api, 'getAlertas').mockResolvedValue([]);
    comRouter(<AlertList />);
    expect(await screen.findByText('Nenhum alerta ativo.')).toBeInTheDocument();
  });
});

describe('AppointmentsTable', () => {
  it('mostra a tabela com horário 24h e status traduzido', async () => {
    comRouter(<AppointmentsTable />);
    const tabela = await screen.findByRole('table', { name: 'Consultas agendadas para hoje' });
    const linhas = within(tabela).getAllByRole('row');
    expect(linhas).toHaveLength(5); // cabeçalho + 4
    expect(within(linhas[4]).getByText('16:00')).toBeInTheDocument();
    expect(within(linhas[4]).getByText('Cancelada')).toBeInTheDocument();
    expect(
      within(tabela)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['Horário', 'Paciente', 'Departamento', 'Status']);
  });

  it('mostra "Nenhuma consulta para hoje." quando a lista está vazia', async () => {
    vi.spyOn(api, 'getConsultasHoje').mockResolvedValue([]);
    comRouter(<AppointmentsTable />);
    expect(await screen.findByText('Nenhuma consulta para hoje.')).toBeInTheDocument();
  });

  it('mostra o erro e recupera com "Tentar novamente"', async () => {
    const espiao = vi
      .spyOn(api, 'getConsultasHoje')
      .mockRejectedValueOnce(new Error('falhou'))
      .mockResolvedValueOnce([]);
    comRouter(<AppointmentsTable />);
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma consulta para hoje.')).toBeInTheDocument();
    expect(espiao).toHaveBeenCalledTimes(2);
  });
});

describe('OccupancyDonut', () => {
  it('mostra 72%, a legenda e os setores', async () => {
    comRouter(<OccupancyDonut />);
    expect(
      await screen.findByRole('img', { name: '72% dos leitos ocupados: 86 de 120' }),
    ).toBeInTheDocument();
    expect(screen.getByText('86 leitos')).toBeInTheDocument();
    expect(screen.getByText('34 leitos')).toBeInTheDocument();
    expect(screen.getByLabelText('UTI: 22 de 30 leitos ocupados')).toBeInTheDocument();
  });
});

describe('AdmissionChart', () => {
  it('descreve o gráfico em texto e troca de período', async () => {
    const espiao = vi.spyOn(api, 'getInternacoes');
    comRouter(<AdmissionChart />);
    expect(
      await screen.findByRole('img', {
        name: 'Internações no período: mínimo de 30 em Ter e máximo de 70 em Sáb',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Internações por período' })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Período'), 'ano');
    expect(espiao).toHaveBeenLastCalledWith('ano');
    expect(await screen.findByRole('rowheader', { name: 'Dez' })).toBeInTheDocument();
  });
});

describe('ActivityTimeline e AIInsights', () => {
  it('mostra as atividades da mais recente para a mais antiga', async () => {
    comRouter(<ActivityTimeline />);
    const itens = await screen.findAllByRole('listitem');
    expect(itens[0]).toHaveTextContent('Novo paciente João Pereira internado');
    expect(itens[0]).toHaveTextContent('10:30');
  });

  it('mostra os insights e o estado vazio', async () => {
    vi.spyOn(api, 'getInsights').mockResolvedValue([]);
    comRouter(<AIInsights />);
    expect(await screen.findByText('Nenhum insight disponível no momento.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todos os insights' })).toBeInTheDocument();
  });
});

describe('WelcomeCard (erro)', () => {
  it('usa o título genérico quando o usuário não carrega', async () => {
    vi.spyOn(api, 'getUsuario').mockRejectedValue(new Error('falhou'));
    comRouter(<WelcomeCard />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Veja como está o hospital hoje.' }),
    ).toBeInTheDocument();
  });
});
