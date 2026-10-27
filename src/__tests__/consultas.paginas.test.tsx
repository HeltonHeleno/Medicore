import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeletorHorario } from '../components/consultas/SeletorHorario';
import { repoConsultas } from '../services/colecoes';
import * as servicoConsultas from '../services/consultas';
import { agendarConsulta, concluirConsulta, reagendarConsulta } from '../services/consultas';
import { ErroConflito } from '../services/erros';
import type { HorarioAgenda } from '../types';
import { renderizarComRotas } from './utils/renderizarComRotas';
import { ajustarRelogio, prepararServicos } from './utils/servicos';

prepararServicos('2026-11-09T08:00:00-03:00'); // segunda-feira

const toast = async (texto: string | RegExp) =>
  within(await screen.findByRole('region', { name: 'Notificações' })).findByText(texto);
const agendar = (extra: Partial<Parameters<typeof agendarConsulta>[0]> = {}) =>
  agendarConsulta({
    pacienteId: 'pac-ana-silva',
    medicoId: 'med-paulo-mendes',
    data: '2026-11-23',
    hora: '09:00',
    duracaoMin: 30,
    tipo: 'primeira_vez',
    ...extra,
  });
const horario = (nome: RegExp) => screen.findByRole('radio', { name: nome });

afterEach(() => vi.restoreAllMocks());

describe('Agenda do dia (D7)', () => {
  it('navega pelos dias pela URL', async () => {
    const user = userEvent.setup();
    const { router } = renderizarComRotas('/consultas?data=2026-11-23');
    expect(await screen.findByText('Segunda-feira, 23 de novembro')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Próximo dia' }));
    expect(await screen.findByText('Terça-feira, 24 de novembro')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?data=2026-11-24');
    await user.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(await screen.findByText('Segunda-feira, 9 de novembro')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('filtros e resumo do dia', async () => {
    await agendar();
    const outra = await agendar({
      pacienteId: 'pac-lucas-ferreira',
      medicoId: 'med-fernanda-lima',
      hora: '10:00',
    });
    await servicoConsultas.cancelarConsulta(outra.id, 'Paciente desmarcou', 1);
    const user = userEvent.setup();
    renderizarComRotas('/consultas?data=2026-11-23');
    const resumo = await screen.findByRole('region', { name: 'Resumo' });
    await waitFor(() =>
      expect(within(resumo).getByText('Total').nextSibling).toHaveTextContent('2'),
    );
    expect(within(resumo).getByText('Canceladas').nextSibling).toHaveTextContent('1');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Médico' }), 'med-paulo-mendes');
    await waitFor(() => expect(screen.queryByText('Lucas Ferreira')).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Ana Paula Silva' })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Médico' }), '');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Situação' }), 'cancelada');
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Ana Paula Silva' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: 'Lucas Ferreira' })).toBeInTheDocument();
  });

  it('dia vazio oferece agendar', async () => {
    renderizarComRotas('/consultas?data=2026-11-29');
    expect(await screen.findByText('Nenhuma consulta em 29/11/2026.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Agendar consulta' }).length).toBeGreaterThan(0);
  });

  it(
    'concluir só a partir do início; atrasada destacada e baixa em lote (P12, P13)',
    { timeout: 20000 },
    async () => {
      await agendar();
      await agendar({ pacienteId: 'pac-lucas-ferreira', hora: '09:30' });
      const user = userEvent.setup();
      const { unmount } = renderizarComRotas('/consultas?data=2026-11-23');
      const concluir = (await screen.findAllByRole('button', { name: 'Concluir' }))[0];
      expect(concluir).toHaveAttribute('aria-disabled', 'true');
      expect(concluir).toHaveAccessibleDescription('Disponível a partir das 09:00');
      unmount();

      act(() => ajustarRelogio('2026-11-23T12:00:00-03:00'));
      renderizarComRotas('/consultas?status=pendentes');
      expect((await screen.findAllByText('Aguardando registro')).length).toBeGreaterThanOrEqual(2);
      await user.click(screen.getByRole('checkbox', { name: /Ana Paula Silva, 09:00–09:30/ }));
      await user.click(screen.getByRole('checkbox', { name: /Lucas Ferreira, 09:30–10:00/ }));
      expect(screen.getByText('2 selecionadas')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Marcar como concluídas' }));
      const dialogo = await screen.findByRole('alertdialog', {
        name: 'Marcar 2 consultas como concluídas?',
      });
      await user.click(within(dialogo).getByRole('button', { name: 'Marcar como concluídas' }));
      expect(await toast('2 consultas marcadas como concluídas.')).toBeInTheDocument();
    },
  );
});

describe('SeletorHorario', () => {
  const horarios: HorarioAgenda[] = [
    { hora: '09:00', inicio: '', livre: false, motivo: 'medico_ocupado' },
    { hora: '09:30', inicio: '', livre: true },
    { hora: '10:00', inicio: '', livre: false, motivo: 'pausa' },
    { hora: '10:30', inicio: '', livre: true },
  ];

  it('teclado: setas movem, Espaço escolhe; indisponível anuncia o motivo e não é escolhido', async () => {
    const aoMudar = vi.fn();
    render(
      <>
        <button type="button">antes</button>
        <SeletorHorario
          horarios={horarios}
          carregando={false}
          valor=""
          aoMudar={aoMudar}
          semParametros={false}
        />
      </>,
    );
    const user = userEvent.setup();
    screen.getByRole('button', { name: 'antes' }).focus();
    await user.tab();
    expect(screen.getByRole('radio', { name: '09:30' })).toHaveFocus(); // 1º livre
    await user.keyboard('{ArrowLeft}');
    const ocupado = screen.getByRole('radio', { name: '09:00, Ocupado' });
    expect(ocupado).toHaveFocus();
    expect(ocupado).toHaveAttribute('aria-disabled', 'true');
    await user.keyboard(' ');
    expect(aoMudar).not.toHaveBeenCalled();
    await user.keyboard('{End} ');
    expect(aoMudar).toHaveBeenCalledWith('10:30');
    expect(screen.getByRole('radiogroup', { name: /Horário/ })).toBeInTheDocument();
    expect(screen.getByText('2 horários livres')).toBeInTheDocument();
  });

  it('sem horários: oferece o próximo dia livre', async () => {
    const buscar = vi.fn();
    render(
      <SeletorHorario
        horarios={[{ hora: '09:00', inicio: '', livre: false, motivo: 'passado' }]}
        carregando={false}
        valor=""
        aoMudar={() => {}}
        semParametros={false}
        aoBuscarProximoDia={buscar}
      />,
    );
    expect(screen.getByText('Nenhum horário livre neste dia.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Próximo dia com horário livre' }));
    expect(buscar).toHaveBeenCalled();
  });
});

describe('Agendar (P9)', () => {
  it('pré-preenchido pela URL: alergia, horário e confirmação', async () => {
    const user = userEvent.setup();
    renderizarComRotas(
      '/consultas/nova?pacienteId=pac-ana-silva&medicoId=med-paulo-mendes&data=2026-11-23',
    );
    expect(await screen.findByRole('combobox', { name: /^Paciente/ })).toHaveValue(
      'Ana Paula Silva',
    );
    expect(await screen.findByRole('region', { name: 'Alergias' })).toHaveTextContent(
      'Penicilina; látex',
    );
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /^Médico/ })).toHaveValue('med-paulo-mendes'),
    );
    await user.click(await horario(/^09:00$/));
    await user.click(screen.getByRole('button', { name: 'Agendar' }));
    expect(
      await toast('Consulta agendada: seg., 23/11 às 09:00 com Dr. Paulo Mendes'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Consulta de Ana Paula Silva' }),
    ).toBeInTheDocument();
  });

  it('escolhendo paciente pela busca e médico na lista', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/consultas/nova?data=2026-11-23');
    await user.type(await screen.findByRole('combobox', { name: /^Paciente/ }), 'lucas');
    await user.click(await screen.findByRole('option', { name: /Lucas Ferreira/ }));
    expect(screen.getByText('Escolha o médico e a data para ver os horários.')).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole('combobox', { name: /^Médico/ }),
      'med-fernanda-lima',
    );
    await user.click(await horario(/^14:00$/));
    await user.click(screen.getByRole('button', { name: 'Agendar' }));
    expect(
      await toast(/^Consulta agendada: seg\., 23\/11 às 14:00 com Dra\. Fernanda Lima/),
    ).toBeInTheDocument();
  });

  it('horário ocupado por outra aba: limpa a escolha e avisa; E-04 ao salvar', async () => {
    const user = userEvent.setup();
    renderizarComRotas(
      '/consultas/nova?pacienteId=pac-ana-silva&medicoId=med-paulo-mendes&data=2026-11-23',
    );
    await user.click(await horario(/^09:00$/));
    // "Outra aba" grava o mesmo horário: o repositório avisa e os horários recarregam.
    await act(() => agendar({ pacienteId: 'pac-lucas-ferreira' }));
    expect(
      await screen.findByText('O horário 09:00 não está mais disponível. Escolha outro.'),
    ).toBeInTheDocument();
    expect(await horario(/^09:00, Ocupado$/)).toHaveAttribute('aria-disabled', 'true');

    // Corrida exata entre escolher e salvar (E-04).
    vi.spyOn(servicoConsultas, 'agendarConsulta').mockRejectedValueOnce(
      new ErroConflito('medico_ocupado', 'O médico já tem consulta neste horário', {
        campo: 'hora',
      }),
    );
    await user.click(await horario(/^10:00$/));
    await user.click(screen.getByRole('button', { name: 'Agendar' }));
    expect(
      await screen.findByText('Este horário acabou de ser ocupado', { selector: 'p' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^10:00/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('médico não atende no dia: aviso e sugestão do próximo dia de atendimento', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/consultas/nova?medicoId=med-paulo-mendes&data=2026-11-28');
    expect(
      await screen.findByText(/Dr\. Paulo Mendes não atende aos sábados\./),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /Próximo dia de atendimento: seg\., 30\/11/ }),
    );
    expect(screen.getByLabelText(/^Data/)).toHaveValue('2026-11-30');
  });

  it('dia sem horário livre: "Próximo dia com horário livre" (A5)', async () => {
    act(() => ajustarRelogio('2026-11-09T18:30:00-03:00'));
    const user = userEvent.setup();
    renderizarComRotas('/consultas/nova?medicoId=med-paulo-mendes&data=2026-11-09');
    await user.click(await screen.findByRole('button', { name: 'Próximo dia com horário livre' }));
    await waitFor(() => expect(screen.getByLabelText(/^Data/)).toHaveValue('2026-11-10'));
  });

  it('sugere "Retorno" quando houve consulta concluída com o mesmo médico há menos de 30 dias', async () => {
    // Um horário livre de hoje (os dados de exemplo já ocupam alguns).
    const livre = (
      await servicoConsultas.horariosLivres('med-paulo-mendes', '2026-11-09', 30, 'pac-ana-silva')
    ).find((h) => h.livre)!;
    const c = await agendar({ data: '2026-11-09', hora: livre.hora });
    act(() => ajustarRelogio('2026-11-09T18:00:00-03:00'));
    await concluirConsulta(c.id);
    renderizarComRotas('/consultas/nova?pacienteId=pac-ana-silva&medicoId=med-paulo-mendes');
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /^Tipo de consulta/ })).toHaveValue('retorno'),
    );
    expect(screen.getByText(/Sugerido "Retorno"/)).toBeInTheDocument();
  });
});

describe('Detalhe, reagendar e cancelar', () => {
  it('linha do tempo na ordem e ações conforme o status', async () => {
    const c = await agendar();
    await reagendarConsulta(
      c.id,
      {
        ...{
          pacienteId: c.pacienteId,
          medicoId: c.medicoId,
          duracaoMin: 30,
          tipo: 'retorno' as const,
        },
        data: '2026-11-24',
        hora: '10:00',
      },
      1,
    );
    renderizarComRotas(`/consultas/${c.id}`);
    const historico = await screen.findByRole('region', { name: 'Histórico' });
    const itens = within(historico)
      .getAllByRole('listitem')
      .map((li) => li.querySelector('p')?.textContent);
    expect(itens).toEqual([
      'Consulta agendada',
      'Reagendada de 23/11/2026 · 09:00 para 24/11/2026 · 10:00',
    ]);
    const concluir = screen.getByRole('button', { name: 'Concluir' });
    expect(concluir).toHaveAttribute('aria-disabled', 'true');
    expect(concluir).toHaveAccessibleDescription('Disponível a partir das 10:00');
  });

  it('reagendar: "Horário atual" marcado e evento de/para', async () => {
    const c = await agendar();
    const user = userEvent.setup();
    renderizarComRotas(`/consultas/${c.id}/editar`);
    const atual = await horario(/^09:00, Horário atual$/);
    expect(atual).toHaveAttribute('aria-checked', 'true');
    expect(atual).not.toHaveAttribute('aria-disabled');
    await user.click(await horario(/^10:30$/));
    await user.click(screen.getByRole('button', { name: 'Salvar novo horário' }));
    expect(await toast('Consulta reagendada para seg., 23/11 às 10:30')).toBeInTheDocument();
    expect(
      await screen.findByText('Reagendada de 23/11/2026 · 09:00 para 23/11/2026 · 10:30'),
    ).toBeInTheDocument();
  });

  it('consulta finalizada não pode ser reagendada', async () => {
    const c = await agendar();
    await servicoConsultas.cancelarConsulta(c.id, 'Paciente desmarcou', 1);
    const { router } = renderizarComRotas(`/consultas/${c.id}/editar`);
    expect(await toast('Esta consulta não pode mais ser reagendada.')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe(`/consultas/${c.id}`));
    expect(
      await screen.findByText('Consulta finalizada: não há ações disponíveis.'),
    ).toBeInTheDocument();
  });

  it('cancelar: motivo obrigatório, sugestões e "Agendar novamente"', async () => {
    const c = await agendar();
    const user = userEvent.setup();
    const { router } = renderizarComRotas(`/consultas/${c.id}`);
    await user.click(await screen.findByRole('button', { name: 'Cancelar consulta' }));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Cancelar consulta' });
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar consulta' }));
    expect(await within(dialogo).findByText('Campo obrigatório')).toBeInTheDocument();
    await user.click(within(dialogo).getByRole('button', { name: 'Paciente desmarcou' }));
    expect(within(dialogo).getByRole('textbox')).toHaveValue('Paciente desmarcou');
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar consulta' }));
    expect(await toast('Consulta cancelada.')).toBeInTheDocument();
    expect(repoConsultas.obter(c.id)).toMatchObject({
      status: 'cancelada',
      motivoCancelamento: 'Paciente desmarcou',
    });
    await user.click(screen.getByRole('button', { name: 'Agendar novamente' }));
    await waitFor(() =>
      expect(router.state.location.pathname + router.state.location.search).toBe(
        '/consultas/nova?pacienteId=pac-ana-silva&medicoId=med-paulo-mendes',
      ),
    );
  });

  it('E-08: consulta inexistente', async () => {
    renderizarComRotas('/consultas/nao-existe');
    expect(
      await screen.findByRole('heading', { name: 'Consulta não encontrada' }),
    ).toBeInTheDocument();
  });
});
