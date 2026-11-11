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

import * as indicadores from '../services/indicadores-operacionais';
import {
  repoAtendimentos,
  repoInternacoes,
  repoLeitos,
  repoLotes,
} from '../services/colecoes-operacoes';
import { registrarChegada } from '../services/emergencia';
import { dispensar } from '../services/farmacia';
import { darAlta } from '../services/leitos';
import type { Leito } from '../types';
import { gravarComoOutraAba, prepararOperacoes } from './utils/operacoes';
import { ajustarRelogio } from './utils/servicos';

// Segunda-feira, 11:30 no fuso do hospital: a das 09:00 já foi concluída e a das
// 10:30 terminou sem registro (aguardando registro).
const AGORA = '2026-11-09T11:30:00-03:00';
const HOJE = '2026-11-09';
prepararOperacoes(AGORA);

const operacoes = () => indicadores.obterIndicadoresOperacionais();

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
  it('pacientes e médicos vêm dos cadastros; leitos e emergência, dos módulos (Fase 20)', async () => {
    const op = await operacoes();
    comRouter(<KpiCards />);
    const regiao = screen.getByRole('region', { name: 'Indicadores do dia' });
    const plantao = repoMedicos
      .todos()
      .filter((m) => m.ativo && m.disponibilidade.diasSemana.includes(1)).length;
    // 120 pacientes de exemplo (30 da D6 + 90 da D13), 3 inativos.
    const total = within(regiao).getByRole('heading', {
      name: 'Total de pacientes',
    }).parentElement!;
    await waitFor(() => expect(total).toHaveTextContent('117'));
    const medicos = within(regiao).getByRole('heading', {
      name: 'Médicos de plantão',
    }).parentElement!;
    expect(medicos).toHaveTextContent(String(plantao));
    // Leitos disponíveis = só os livres dos setores de internação (A13), sobre os operacionais.
    const leitos = within(regiao).getByRole('heading', {
      name: 'Leitos disponíveis',
    }).parentElement!;
    await waitFor(() => expect(leitos).toHaveTextContent(String(op.leitos.disponiveis)));
    expect(op.leitos.disponiveis).toBe(
      repoLeitos.todos().filter((l) => l.setorId !== 'observacao' && l.status === 'livre').length,
    );
    expect(within(regiao).getByText('de 119 leitos no total')).toBeInTheDocument();
    const abertos = repoAtendimentos.todos().filter((a) => a.status !== 'encerrado').length;
    expect(within(regiao).getByText(String(abertos))).toHaveClass('text-danger');
    expect(
      within(regiao).getByRole('link', {
        name: `${op.emergencia.altaPrioridade} em alta prioridade`,
      }),
    ).toHaveAttribute('href', '#alertas-emergencia');
  });

  it('atualiza sem recarregar ao cadastrar e ao inativar pacientes', async () => {
    comRouter(<KpiCards />);
    const total = screen.getByRole('heading', { name: 'Total de pacientes' }).parentElement!;
    await waitFor(() => expect(total).toHaveTextContent('117'));
    const p = await novoPaciente();
    await waitFor(() => expect(total).toHaveTextContent('118'));
    await inativarPaciente(p.id);
    await waitFor(() => expect(total).toHaveTextContent('117'));
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
        `${validas} consultas hoje · UTI tendendo a ${(await operacoes()).leitos.previsaoUti}% até a noite · 3 medicamentos com estoque baixo.`,
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
  it('mostra os 3 primeiros alertas de A12, cada um com link, e "Ver todos" na aba de alertas', async () => {
    const { alertas } = await operacoes();
    expect(alertas.length).toBeGreaterThan(3);
    comRouter(<AlertList />);
    const regiao = screen.getByRole('region', { name: 'Alertas de emergência' });
    expect(regiao).toHaveAttribute('id', 'alertas-emergencia');
    const itens = await within(regiao).findAllByRole('listitem');
    expect(itens).toHaveLength(3);
    expect(itens[0]).toHaveTextContent(alertas[0].titulo);
    expect(within(itens[0]).getByText('Alta')).toBeInTheDocument();
    const destino =
      alertas[0].referencia.tipo === 'atendimento'
        ? `/emergencia/${alertas[0].referencia.id}`
        : `/leitos/${alertas[0].referencia.id}`;
    expect(within(itens[0]).getByRole('link')).toHaveAttribute('href', destino);
    expect(within(regiao).getByRole('link', { name: 'Ver todos' })).toHaveAttribute(
      'href',
      '/emergencia?aba=alertas',
    );
  });

  it('mostra o estado vazio', async () => {
    const real = await operacoes();
    vi.spyOn(indicadores, 'obterIndicadoresOperacionais').mockResolvedValue({
      ...real,
      alertas: [],
    });
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
  it('mostra 72% sobre os leitos operacionais, a legenda e os setores (A13, D17)', async () => {
    comRouter(<OccupancyDonut />);
    expect(
      await screen.findByRole('img', { name: '72% dos leitos ocupados: 86 de 119' }),
    ).toBeInTheDocument();
    expect(screen.getByText('86 leitos')).toBeInTheDocument();
    expect(screen.getByText('33 leitos')).toBeInTheDocument();
    expect(screen.getByLabelText('UTI: 22 de 30 leitos ocupados')).toBeInTheDocument();
    expect(screen.getByLabelText('Enfermaria: 50 de 69 leitos ocupados')).toBeInTheDocument();
  });
});

describe('AdmissionChart', () => {
  it('descreve a série real em texto e troca de período (A14)', async () => {
    const espiao = vi.spyOn(indicadores, 'obterSerieInternacoes');
    comRouter(<AdmissionChart />);
    expect(
      await screen.findByRole('img', { name: /^Internações no período: mínimo de/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Internações por período' })).toBeInTheDocument();
    expect(espiao).toHaveBeenLastCalledWith('semana');
    const semana = await indicadores.obterSerieInternacoes('semana');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(semana.length + 1);

    await userEvent.selectOptions(screen.getByLabelText('Período'), 'ano');
    expect(espiao).toHaveBeenLastCalledWith('ano');
    expect(await screen.findAllByRole('rowheader')).toHaveLength(12);
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

  it('mostra os 3 insights calculados dos módulos', async () => {
    const op = await operacoes();
    comRouter(<AIInsights />);
    expect(
      await screen.findByText(
        `A ocupação da UTI pode chegar a ${op.leitos.previsaoUti}% até a noite.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('3 medicamentos estão com estoque baixo.')).toBeInTheDocument();
    expect(
      screen.getByText(`${op.leitos.altasPrevistasHoje} altas previstas para hoje.`),
    ).toBeInTheDocument();
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

describe('Painel em tempo real (20.9.2)', { timeout: 30_000 }, () => {
  it('muda sem recarregar ao dar alta, registrar chegada vermelha e dispensar até o mínimo', async () => {
    comRouter(
      <>
        <KpiCards />
        <AIInsights />
        <ActivityTimeline />
      </>,
    );
    const linhaDoTempo = screen.getByRole('region', { name: 'Linha do tempo de atividades' });
    const regiao = screen.getByRole('region', { name: 'Indicadores do dia' });
    const leitos = within(regiao).getByRole('heading', {
      name: 'Leitos disponíveis',
    }).parentElement!;
    const casos = within(regiao).getByRole('heading', {
      name: 'Casos de emergência',
    }).parentElement!;
    const op = await operacoes();
    await waitFor(() => expect(leitos).toHaveTextContent(String(op.leitos.disponiveis)));

    // Chegada vermelha: +1 caso aberto e +1 de alta prioridade.
    await registrarChegada({
      provisorio: { descricao: 'Homem, camisa verde', sexo: 'masculino' },
      modoChegada: 'samu',
      queixa: 'Dor torácica',
      chegadaEm: new Date().toISOString(),
      emergenciaImediata: true,
    });
    await waitFor(() =>
      expect(casos).toHaveTextContent(`${op.emergencia.altaPrioridade + 1} em alta prioridade`),
    );
    // 20.7: a atividade aparece na linha do tempo, com o marcador da cor do tipo.
    const vermelho = await within(linhaDoTempo).findByText(
      /Emergência: paciente classificado como vermelho/,
    );
    expect(vermelho.parentElement!.querySelector('[data-tipo]')).toHaveClass('bg-danger');

    // Dispensar até cruzar o mínimo: "estoque baixo" sobe para 4 no insight.
    const internado = repoInternacoes.todos().find((i) => i.status === 'ativa')!.pacienteId;
    const paracetamol = repoLotes
      .todos()
      .filter((l) => l.medicamentoId === 'med-paracetamol-750')
      .reduce((s2, l) => s2 + l.quantidadeAtual, 0);
    await dispensar({
      pacienteId: internado,
      medicoSolicitanteId: 'med-helena-duarte',
      itens: [{ medicamentoId: 'med-paracetamol-750', quantidade: paracetamol - 100 }],
      alertasConfirmados: [{ tipo: 'quantidade_alta', medicamentoId: 'med-paracetamol-750' }],
    });
    expect(await screen.findByText('4 medicamentos estão com estoque baixo.')).toBeInTheDocument();

    // Alta: o leito vai para higienização (não volta a "disponível" sozinho).
    const ativa = repoInternacoes
      .todos()
      .find((i) => i.status === 'ativa' && i.pacienteId !== internado)!;
    await darAlta(ativa.id, { tipo: 'melhorada', em: new Date().toISOString() }, ativa.versao);
    expect(repoLeitos.obter(ativa.leitoId)!.status).toBe('higienizacao');
    const alta = await within(linhaDoTempo).findByText(/^Alta de .*\(melhorada\)/);
    expect(alta.parentElement!.querySelector('[data-tipo]')).toHaveClass('bg-primary');
  });

  it('muda quando outra aba libera um leito (evento de armazenamento)', async () => {
    comRouter(<KpiCards />);
    const leitos = screen.getByRole('heading', { name: 'Leitos disponíveis' }).parentElement!;
    const op = await operacoes();
    await waitFor(() => expect(leitos).toHaveTextContent(String(op.leitos.disponiveis)));
    const alvo = repoLeitos
      .todos()
      .find((l) => l.status === 'higienizacao' && l.setorId !== 'observacao')!;
    gravarComoOutraAba<Leito>('leitos', (itens) =>
      itens.map((l) =>
        l.id === alvo.id
          ? { ...l, status: 'livre', higienizacao: undefined, versao: l.versao + 1 }
          : l,
      ),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: 'medicore:leitos:v1' }));
    await waitFor(() => expect(leitos).toHaveTextContent(String(op.leitos.disponiveis + 1)));
  });
});
