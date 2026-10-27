import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { repoConsultas, repoMedicos } from '../services/colecoes';
import { agendarConsulta, horariosLivres } from '../services/consultas';
import { calcularIndicadores } from '../utils/indicadores';
import { dataDoInstante } from '../utils/datas';
import { renderizarComRotas } from './utils/renderizarComRotas';
import { prepararServicos } from './utils/servicos';

prepararServicos('2026-11-09T08:00:00-03:00'); // segunda-feira

const tabela = () => screen.getByRole('table', { name: 'Lista de médicos' });
const nomesNaTabela = () =>
  within(tabela())
    .getAllByRole('rowheader')
    .map((c) => within(c).getByRole('link').textContent);
const toast = (texto: string | RegExp) =>
  within(screen.getByRole('region', { name: 'Notificações' })).findByText(texto);
const caixa = (nome: string | RegExp) => screen.getByRole('textbox', { name: nome });

afterEach(() => {
  try {
    localStorage.removeItem('medicore-medicos-visualizacao');
  } catch {
    /* sem storage */
  }
});

describe('Lista de médicos', () => {
  it('busca pelo número do CRM e filtra por departamento', async () => {
    const user = userEvent.setup();
    const crm = repoMedicos.obter('med-paulo-mendes')!.crm.numero;
    const { router } = renderizarComRotas('/medicos');
    await screen.findByText('Mostrando 1–7 de 7');
    expect(within(tabela()).getAllByText(/^\d{6}\/SP$/)).toHaveLength(7);

    await user.type(screen.getByRole('searchbox', { name: 'Buscar por nome ou CRM' }), crm);
    await waitFor(() => expect(nomesNaTabela()).toEqual(['Dr. Paulo Mendes']));

    await user.click(screen.getAllByRole('button', { name: 'Limpar filtros' })[0]);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Departamento' }), 'cardiologia');
    await waitFor(() => expect(nomesNaTabela()).toEqual(['Dr. Paulo Mendes', 'Dr. Rafael Costa']));
    expect(router.state.location.search).toBe('?departamentoId=cardiologia');
  });

  it('alterna tabela/cartões e lembra a preferência', async () => {
    const user = userEvent.setup();
    const { unmount } = renderizarComRotas('/medicos');
    const grupo = await screen.findByRole('group', { name: 'Visualização' });
    expect(within(grupo).getByRole('button', { name: 'Tabela' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(within(grupo).getByRole('button', { name: 'Cartões' }));
    expect(within(grupo).getByRole('button', { name: 'Cartões' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(localStorage.getItem('medicore-medicos-visualizacao')).toBe('cartoes');
    unmount();

    renderizarComRotas('/medicos');
    const grupo2 = await screen.findByRole('group', { name: 'Visualização' });
    expect(within(grupo2).getByRole('button', { name: 'Cartões' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('Cadastro (P6)', () => {
  async function preencher(user = userEvent.setup()) {
    const tratamento = await screen.findByRole('combobox', { name: /^Tratamento/ });
    await waitFor(() => expect(tratamento).toHaveFocus());
    await user.selectOptions(tratamento, 'Dra.');
    await user.type(caixa(/^Nome completo/), 'Clara Antunes');
    await user.type(caixa(/^Número do CRM/), '765432');
    await user.selectOptions(screen.getByRole('combobox', { name: /^UF do CRM/ }), 'SP');
    await user.type(caixa(/^Telefone/), '1133334444');
    await user.type(caixa(/^E-mail/), 'clara@exemplo.com');
    await user.selectOptions(screen.getByRole('combobox', { name: /^Departamento/ }), 'pediatria');
    return user;
  }

  it('prévia em tempo real, com e sem pausa', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/medicos/novo');
    expect(
      await screen.findByText(
        'Seg a Sex · 08:00–17:00 · pausa 12:00–13:00 · 16 horários de 30 min por dia',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Tem pausa (ex.: almoço)' }));
    expect(
      screen.getByText('Seg a Sex · 08:00–17:00 · 18 horários de 30 min por dia'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sex, sexta-feira' }));
    await user.selectOptions(screen.getByRole('combobox', { name: /^Duração padrão/ }), '60');
    expect(
      screen.getByText('Seg a Qui · 08:00–17:00 · 9 horários de 60 min por dia'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sex, sexta-feira' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('CRM inválido e CRM já cadastrado (R-M1)', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/medicos/novo');
    const numero = await screen.findByRole('textbox', { name: /^Número do CRM/ });
    await user.type(numero, '123');
    await user.tab();
    await waitFor(() =>
      expect(numero).toHaveAccessibleDescription(/Informe um CRM com 4 a 7 dígitos/),
    );

    const paulo = repoMedicos.obter('med-paulo-mendes')!;
    await user.clear(numero);
    await user.type(numero, paulo.crm.numero);
    await user.selectOptions(screen.getByRole('combobox', { name: /^UF do CRM/ }), 'SP');
    expect(await screen.findByText('Já existe um médico com este CRM')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Abrir cadastro existente \(Dr\. Paulo Mendes\)/ }),
    ).toBeInTheDocument();
  });

  it('sem dias, fim antes do início e pausa fora do expediente', async () => {
    renderizarComRotas('/medicos/novo');
    const user = await preencher();
    for (const dia of ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']) {
      await user.click(screen.getByRole('button', { name: new RegExp(`^${dia}, `) }));
    }
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(
      await screen.findByText('Selecione pelo menos um dia de atendimento', { selector: 'p' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Seg, segunda-feira' }));
    fireEvent.change(screen.getByLabelText(/^Fim do expediente/), { target: { value: '07:00' } });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(
      await screen.findByText('O fim do expediente deve ser depois do início', { selector: 'p' }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Fim do expediente/), { target: { value: '12:00' } });
    fireEvent.change(screen.getByLabelText(/^Fim da pausa/), { target: { value: '12:30' } });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(
      await screen.findByText('A pausa deve estar dentro do expediente', { selector: 'p' }),
    ).toBeInTheDocument();
  });

  it('salva, abre o detalhe e os horários livres seguem a disponibilidade (11.6.1)', async () => {
    renderizarComRotas('/medicos/novo');
    const user = await preencher();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await toast('Médico cadastrado.')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dra. Clara Antunes' }),
    ).toBeInTheDocument();

    const clara = repoMedicos.todos().find((m) => m.nome === 'Clara Antunes')!;
    const grade = await horariosLivres(clara.id, '2026-11-10', 30);
    expect(grade.filter((h) => h.livre)).toHaveLength(16);
    expect(grade.find((h) => h.hora === '12:00')?.motivo).toBe('pausa');
    expect(await horariosLivres(clara.id, '2026-11-14', 30)).toEqual([]); // sábado
  });
});

describe('Edição (P7)', () => {
  it('avisa as consultas que ficarão fora do novo horário antes de salvar', async () => {
    await agendarConsulta({
      pacienteId: 'pac-ana-silva',
      medicoId: 'med-paulo-mendes',
      data: '2026-11-20', // sexta, além dos dados de exemplo
      hora: '09:00',
      duracaoMin: 30,
      tipo: 'retorno',
    });
    const user = userEvent.setup();
    renderizarComRotas('/medicos/med-paulo-mendes/editar');
    await user.click(await screen.findByRole('button', { name: 'Sex, sexta-feira' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    const dialogo = await screen.findByRole('alertdialog', {
      name: 'Consultas fora do novo horário',
    });
    expect(dialogo).toHaveTextContent(/ficar(á|ão) fora do novo horário/);
    await user.click(within(dialogo).getByRole('button', { name: 'Revisar' }));
    expect(repoMedicos.obter('med-paulo-mendes')?.versao).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await user.click(await screen.findByRole('button', { name: 'Salvar mesmo assim' }));
    expect(await toast(/^Alterações salvas\. \d+ consultas? fic/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver consultas afetadas' })).toBeInTheDocument();
    expect(repoMedicos.obter('med-paulo-mendes')?.disponibilidade.diasSemana).toEqual([1, 2, 3, 4]);
  });
});

describe('Edição: concorrência (E-05) e E-08', () => {
  it('outra aba grava: aviso; ao salvar, "Recarregar dados" descarta o que foi digitado', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/medicos/med-gustavo-martins/editar');
    const email = await screen.findByRole('textbox', { name: /^E-mail/ });
    repoMedicos.atualizar('med-gustavo-martins', { email: 'outra.aba@medicore.example' });
    expect(await screen.findByText(/alterado em outra aba/)).toBeInTheDocument();

    await user.clear(email);
    await user.type(email, 'minha.versao@medicore.example');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    const dialogo = await screen.findByRole('alertdialog', {
      name: 'Cadastro alterado em outro lugar',
    });
    await user.click(within(dialogo).getByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /^E-mail/ })).toHaveValue(
        'outra.aba@medicore.example',
      ),
    );
    expect(repoMedicos.obter('med-gustavo-martins')?.email).toBe('outra.aba@medicore.example');
  });

  it('editar médico inexistente mostra E-08', async () => {
    renderizarComRotas('/medicos/nao-existe/editar');
    expect(
      await screen.findByRole('heading', { name: 'Médico não encontrado' }),
    ).toBeInTheDocument();
  });
});

describe('Detalhe', () => {
  it('E-08: médico inexistente', async () => {
    renderizarComRotas('/medicos/nao-existe');
    expect(
      await screen.findByRole('heading', { name: 'Médico não encontrado' }),
    ).toBeInTheDocument();
  });

  it('grade semanal e indicadores do mês calculados dos dados', async () => {
    renderizarComRotas('/medicos/med-paulo-mendes');
    const grade = await screen.findByRole('table', {
      name: 'Horário de atendimento por dia da semana',
    });
    expect(within(grade).getAllByText('08:00–12:00')).toHaveLength(5);
    expect(within(grade).getAllByText('Não atende')).toHaveLength(2);

    const doMes = repoConsultas
      .todos()
      .filter(
        (c) => c.medicoId === 'med-paulo-mendes' && dataDoInstante(c.inicio).startsWith('2026-11'),
      );
    const esperado = calcularIndicadores(doMes);
    const card = screen.getByRole('region', { name: 'Indicadores do mês' });
    await waitFor(() =>
      expect(within(card).getByText('Consultas no mês').nextSibling).toHaveTextContent(
        String(esperado.consultas),
      ),
    );
    expect(within(card).getByText('Cancelamentos').nextSibling).toHaveTextContent(
      String(esperado.cancelamentos),
    );
  });
});

describe('Inativação (P8)', () => {
  it('bloqueia até zerar as consultas futuras; a lista se atualiza ao cancelar', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/medicos/med-rafael-costa');
    await user.click(
      await screen.findByRole('button', { name: 'Mais ações para Dr. Rafael Costa' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Inativar' }));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Inativar Dr. Rafael Costa?' });

    // Garante ao menos uma consulta futura para o teste.
    const futuras = () =>
      repoConsultas
        .todos()
        .filter(
          (c) =>
            c.medicoId === 'med-rafael-costa' &&
            c.status === 'agendada' &&
            new Date(c.inicio) >= new Date(),
        );
    if (futuras().length === 0) {
      await agendarConsulta({
        pacienteId: 'pac-ana-silva',
        medicoId: 'med-rafael-costa',
        data: '2026-11-24',
        hora: '14:00',
        duracaoMin: 30,
        tipo: 'retorno',
      });
    }
    const inativar = within(dialogo).getByRole('button', { name: 'Inativar' });
    await waitFor(() =>
      expect(
        within(dialogo).getAllByRole('button', { name: /^Cancelar consulta de/ }).length,
      ).toBeGreaterThan(0),
    );
    expect(inativar).toBeDisabled();

    while (futuras().length > 0) {
      const antes = futuras().length;
      await user.click(
        within(dialogo).getAllByRole('button', { name: /^Cancelar consulta de/ })[0],
      );
      await user.type(
        within(dialogo).getByRole('textbox', { name: 'Motivo do cancelamento' }),
        'Médico de licença',
      );
      await user.click(within(dialogo).getByRole('button', { name: 'Confirmar cancelamento' }));
      await waitFor(() => expect(futuras().length).toBe(antes - 1));
    }
    await waitFor(() => expect(inativar).toBeEnabled());
    expect(dialogo).toHaveTextContent('Não há consultas futuras');
    await user.type(
      within(dialogo).getByRole('textbox', { name: 'Motivo da inativação (opcional)' }),
      'Licença',
    );
    await user.click(inativar);
    expect(await toast('Médico inativado.')).toBeInTheDocument();
    expect(repoMedicos.obter('med-rafael-costa')).toMatchObject({
      ativo: false,
      motivoInativacao: 'Licença',
    });
    expect(
      await screen.findByText(/Médico inativo desde 09\/11\/2026 — motivo: Licença/),
    ).toBeInTheDocument();
  });
});
