import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import * as api from '../services/api';
import { registrarAtividade } from '../services/atividades';
import { repoAtividades, repoMedicos } from '../services/colecoes';
import * as servicoConsultas from '../services/consultas';
import {
  agendarConsulta,
  cancelarConsulta,
  concluirConsulta,
  horariosLivres,
} from '../services/consultas';
import { criarPaciente, inativarPaciente } from '../services/pacientes';
import { transacao } from '../services/repositorio';
import { AlertList } from '../components/dashboard/AlertList';
import { AppointmentsTable } from '../components/dashboard/AppointmentsTable';
import { DepartmentPerformance } from '../components/dashboard/DepartmentPerformance';
import { KpiCards } from '../components/dashboard/KpiCards';
import { OccupancyDonut } from '../components/dashboard/OccupancyDonut';
import { AdmissionChart } from '../components/dashboard/AdmissionChart';
import { WelcomeCard } from '../components/dashboard/WelcomeCard';
import { ActivityTimeline } from '../components/dashboard/ActivityTimeline';
import { AIInsights } from '../components/dashboard/AIInsights';

import { ajustarRelogio, prepararServicos } from './utils/servicos';

// Segunda-feira, 11:30 no fuso do hospital: a das 09:00 já foi concluída e a das
// 10:30 terminou sem registro (aguardando registro).
const AGORA = '2026-11-09T11:30:00-03:00';
const HOJE = '2026-11-09';
prepararServicos(AGORA);

const comRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

const novoPaciente = () =>
  criarPaciente({
    nome: 'Teste do Painel',
    cpf: '529.982.247-25',
    dataNascimento: '1990-01-01',
    sexo: 'feminino',
    telefone: '(11) 98765-4321',
    convenio: { tipo: 'particular' },
    consentimentoLgpd: true,
  });

afterEach(() => vi.restoreAllMocks());

describe('KpiCards', () => {
  it('pacientes ativos e médicos de plantão vêm dos cadastros; leitos continuam simulados', async () => {
    comRouter(<KpiCards />);
    const regiao = screen.getByRole('region', { name: 'Indicadores do dia' });
    const plantao = repoMedicos
      .todos()
      .filter((m) => m.ativo && m.disponibilidade.diasSemana.includes(1)).length;
    // 30 pacientes de exemplo, 3 inativos.
    const total = within(regiao).getByRole('heading', {
      name: 'Total de pacientes',
    }).parentElement!;
    await waitFor(() => expect(total).toHaveTextContent('27'));
    const medicos = within(regiao).getByRole('heading', {
      name: 'Médicos de plantão',
    }).parentElement!;
    expect(medicos).toHaveTextContent(String(plantao));
    expect(plantao).toBeGreaterThan(0);
    expect(plantao).toBeLessThan(repoMedicos.todos().length);
    expect(within(regiao).getByText('34')).toBeInTheDocument();
    expect(within(regiao).getByText('de 120 leitos no total')).toBeInTheDocument();
    expect(within(regiao).getByText('18')).toHaveClass('text-danger');
    expect(
      within(regiao).getByRole('link', { name: 'Alta prioridade — ver alertas' }),
    ).toHaveAttribute('href', '#alertas-emergencia');
  });

  it('atualiza sem recarregar ao cadastrar e ao inativar pacientes', async () => {
    comRouter(<KpiCards />);
    const total = screen.getByRole('heading', { name: 'Total de pacientes' }).parentElement!;
    await waitFor(() => expect(total).toHaveTextContent('27'));
    const p = await novoPaciente();
    await waitFor(() => expect(total).toHaveTextContent('28'));
    await inativarPaciente(p.id);
    await waitFor(() => expect(total).toHaveTextContent('27'));
  });

  it('não conta médico inativo nem quem não atende no dia', async () => {
    comRouter(<KpiCards />);
    const medicos = screen.getByRole('heading', { name: 'Médicos de plantão' }).parentElement!;
    const antes = repoMedicos
      .todos()
      .filter((m) => m.ativo && m.disponibilidade.diasSemana.includes(1)).length;
    await waitFor(() => expect(medicos).toHaveTextContent(String(antes)));
    const alvo = repoMedicos
      .todos()
      .find((m) => m.ativo && m.disponibilidade.diasSemana.includes(1))!;
    transacao(() =>
      repoMedicos.atualizar(alvo.id, {
        disponibilidade: { ...alvo.disponibilidade, diasSemana: [2, 3] },
      }),
    );
    await waitFor(() => expect(medicos).toHaveTextContent(String(antes - 1)));
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
    const hoje = await servicoConsultas.listarConsultas({ data: HOJE });
    const validas = hoje.filter((c) => c.status !== 'cancelada').length;
    expect(
      await screen.findByText(
        `${validas} consultas hoje · UTI tendendo a 90% até a noite · 3 medicamentos com estoque baixo.`,
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
  it('lista as consultas de hoje do repositório, com link para o detalhe', async () => {
    const hoje = await servicoConsultas.listarConsultas({ data: HOJE });
    comRouter(<AppointmentsTable />);
    const tabela = await screen.findByRole('table', { name: 'Consultas agendadas para hoje' });
    const linhas = within(tabela).getAllByRole('row');
    expect(linhas).toHaveLength(hoje.length + 1);
    expect(
      within(tabela)
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['Horário', 'Paciente', 'Departamento', 'Status']);

    const joao = within(tabela).getByRole('link', { name: 'João Pereira' });
    expect(joao).toHaveAttribute('href', '/consultas/con-hoje-0900');
    const linhaJoao = joao.closest('tr')!;
    expect(linhaJoao).toHaveTextContent('09:00');
    expect(linhaJoao).toHaveTextContent('Cardiologia');
    expect(linhaJoao).toHaveTextContent('Concluída');
    const daniel = within(tabela).getByRole('link', { name: 'Daniel Oliveira' }).closest('tr')!;
    expect(daniel).toHaveTextContent('16:00');
    expect(daniel).toHaveTextContent('Cancelada');
  });

  it('avisa as consultas aguardando registro, com link para o filtro de pendentes (P13)', async () => {
    const pendentes = await servicoConsultas.listarConsultas({ pendentes: true });
    expect(pendentes.length).toBeGreaterThan(1); // as 2 dos dados de exemplo + a das 10:30
    comRouter(<AppointmentsTable />);
    const aviso = await screen.findByRole('link', {
      name: `${pendentes.length} consultas aguardando registro`,
    });
    expect(aviso).toHaveAttribute('href', '/consultas?status=pendentes');

    // Concluir a das 10:30 tira uma pendência e muda o status na tabela, sem recarregar.
    await concluirConsulta('con-hoje-1030');
    expect(
      await screen.findByRole('link', {
        name: `${pendentes.length - 1} consultas aguardando registro`,
      }),
    ).toBeInTheDocument();
    const tabela = screen.getByRole('table', { name: 'Consultas agendadas para hoje' });
    expect(
      within(tabela).getByRole('link', { name: 'Mariana Alves' }).closest('tr'),
    ).toHaveTextContent('Concluída');
  });

  it('agendar e cancelar hoje muda o card sem recarregar', async () => {
    comRouter(<AppointmentsTable />);
    const tabela = await screen.findByRole('table', { name: 'Consultas agendadas para hoje' });
    const antes = within(tabela).getAllByRole('row').length;

    const paciente = await novoPaciente();
    const livre = (await horariosLivres('med-paulo-mendes', HOJE, 30, paciente.id)).find(
      (h) => h.livre,
    )!;
    const nova = await agendarConsulta({
      pacienteId: paciente.id,
      medicoId: 'med-paulo-mendes',
      data: HOJE,
      hora: livre.hora,
      duracaoMin: 30,
      tipo: 'retorno',
    });
    const link = await within(tabela).findByRole('link', { name: 'Teste do Painel' });
    expect(within(tabela).getAllByRole('row')).toHaveLength(antes + 1);
    expect(link.closest('tr')).toHaveTextContent('Agendada');

    await cancelarConsulta(nova.id, 'Paciente pediu para remarcar', nova.versao);
    await waitFor(() => expect(link.closest('tr')).toHaveTextContent('Cancelada'));
  });

  it('mostra "Nenhuma consulta para hoje." quando a lista está vazia', async () => {
    vi.spyOn(servicoConsultas, 'listarConsultas').mockResolvedValue([]);
    comRouter(<AppointmentsTable />);
    expect(await screen.findByText('Nenhuma consulta para hoje.')).toBeInTheDocument();
    expect(screen.queryByText(/aguardando registro/)).not.toBeInTheDocument();
  });

  it('mostra o erro e recupera com "Tentar novamente"', async () => {
    let falhou = false;
    const espiao = vi.spyOn(servicoConsultas, 'listarConsultas').mockImplementation(async (f) => {
      if (f?.data && !falhou) {
        falhou = true;
        throw new Error('falhou');
      }
      return [];
    });
    comRouter(<AppointmentsTable />);
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma consulta para hoje.')).toBeInTheDocument();
    expect(espiao.mock.calls.length).toBeGreaterThanOrEqual(3); // hoje, pendentes e a nova tentativa
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
  it('mostra as 4 atividades mais recentes e põe uma nova no topo sem recarregar', async () => {
    comRouter(<ActivityTimeline />);
    const regiao = screen.getByRole('region', { name: 'Linha do tempo de atividades' });
    expect(await within(regiao).findAllByRole('listitem')).toHaveLength(4);

    await novoPaciente();
    await waitFor(() =>
      expect(within(regiao).getAllByRole('listitem')[0]).toHaveTextContent(
        'Paciente Teste do Painel cadastrado',
      ),
    );
    const topo = within(regiao).getAllByRole('listitem')[0];
    expect(topo).toHaveTextContent('11:30');
    expect(within(regiao).getAllByRole('listitem')).toHaveLength(4);
  });

  it('mostra "Ontem" e a data para atividades de dias anteriores', async () => {
    transacao(() => {
      repoAtividades.substituirTodos([]);
      ajustarRelogio('2026-11-06T09:15:00-03:00');
      registrarAtividade('medico_cadastrado', 'Atividade de sexta');
      ajustarRelogio('2026-11-08T14:20:00-03:00');
      registrarAtividade('medico_cadastrado', 'Atividade de ontem');
      ajustarRelogio('2026-11-09T11:29:30-03:00');
      registrarAtividade('medico_cadastrado', 'Atividade de agora');
    });
    ajustarRelogio(AGORA);
    comRouter(<ActivityTimeline />);
    const agora = await screen.findByText('Atividade de agora');
    expect(agora.parentElement).toHaveTextContent('11:29');
    expect(screen.getByText('Atividade de ontem').parentElement).toHaveTextContent('Ontem, 14:20');
    expect(screen.getByText('Atividade de sexta').parentElement).toHaveTextContent(
      '06/11/2026 · 09:15',
    );
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
