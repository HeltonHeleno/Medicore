import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { limparCacheCep } from '../services/cep';
import { repoConsultas, repoPacientes } from '../services/colecoes';
import { agendarConsulta } from '../services/consultas';
import { criarPaciente } from '../services/pacientes';
import { renderizarComRotas } from './utils/renderizarComRotas';
import { prepararServicos } from './utils/servicos';

prepararServicos('2026-11-09T08:00:00-03:00'); // segunda-feira

const tabela = () => screen.getByRole('table', { name: 'Lista de pacientes' });
const nomesNaTabela = () =>
  within(tabela())
    .getAllByRole('rowheader')
    .map((c) => within(c).getByRole('link').textContent); // (sem as iniciais do avatar)
const caixa = (nome: string | RegExp) => screen.getByRole('textbox', { name: nome });
const toast = (texto: string) =>
  within(screen.getByRole('region', { name: 'Notificações' })).findByText(texto);

async function novoPacienteValido(user = userEvent.setup()) {
  await user.type(caixa(/^Nome completo/), 'Zuleica Prado');
  await user.type(caixa(/^CPF/), '52998224725');
  fireEvent.change(screen.getByLabelText(/^Data de nascimento/), {
    target: { value: '1985-03-10' },
  });
  await user.selectOptions(screen.getByRole('combobox', { name: /^Sexo/ }), 'feminino');
  await user.type(caixa(/^Telefone\s*\(/), '11987654321');
  await user.click(screen.getByRole('checkbox', { name: /autoriza o uso dos dados/ }));
  return user;
}

describe('Lista de pacientes', () => {
  it('pagina de 10 em 10, busca (inclusive nome social) e mantém tudo na URL', async () => {
    const user = userEvent.setup();
    const { router } = renderizarComRotas('/pacientes');
    expect(await screen.findByText('Mostrando 1–10 de 27')).toBeInTheDocument();
    expect(nomesNaTabela()).toHaveLength(10);

    await user.click(screen.getByRole('button', { name: 'Página 3' }));
    await waitFor(() => expect(nomesNaTabela()).toHaveLength(7));
    expect(router.state.location.search).toBe('?pagina=3');

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por nome, CPF ou telefone' }),
      'rafaela',
    );
    await waitFor(() => expect(nomesNaTabela()).toEqual(['Rafaela Martins']));
    expect(router.state.location.search).toBe('?busca=rafaela'); // filtro novo volta à página 1
  });

  it('filtra por situação e ordena pelo cabeçalho', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/pacientes');
    await screen.findByText('Mostrando 1–10 de 27');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Situação' }), 'inativos');
    await waitFor(() =>
      expect(nomesNaTabela()).toEqual(['Luíza Monteiro', 'Roberto Vieira', 'Sandra Lopes']),
    );
    expect(within(tabela()).getAllByText('Inativo')).toHaveLength(3);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Situação' }), 'ativos');
    await user.click(within(tabela()).getByRole('button', { name: 'Idade' }));
    await waitFor(() => expect(nomesNaTabela()[0]).toBe('Beatriz Lima')); // 10 anos
    await user.click(within(tabela()).getByRole('button', { name: 'Idade' }));
    await waitFor(() => expect(nomesNaTabela()[0]).toBe('Antônio Batista')); // 78 anos
    expect(within(tabela()).getAllByRole('columnheader')[2]).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('sem resultado: mensagem com o termo e "Limpar filtros"', async () => {
    const user = userEvent.setup();
    const { router } = renderizarComRotas('/pacientes?busca=xyzw');
    expect(await screen.findByText('Nenhum paciente encontrado para "xyzw".')).toBeInTheDocument();
    // (há um na barra de filtros e outro no estado vazio)
    await user.click(screen.getAllByRole('button', { name: 'Limpar filtros' })[0]);
    expect(await screen.findByText('Mostrando 1–10 de 27')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('sem cadastros: convida a cadastrar', async () => {
    repoPacientes.substituirTodos([]);
    const user = userEvent.setup();
    const { router } = renderizarComRotas('/pacientes');
    expect(await screen.findByText('Nenhum paciente cadastrado.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Novo paciente' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/pacientes/novo'));
  });

  it('"Voltar" do detalhe volta à lista com os mesmos filtros (M14)', async () => {
    const user = userEvent.setup();
    const { router } = renderizarComRotas('/pacientes?busca=ana&status=todos');
    await user.click(
      await within(await screen.findByRole('table')).findByRole('link', {
        name: 'Ana Paula Silva',
      }),
    );
    await user.click(await screen.findByRole('link', { name: 'Voltar para a lista de pacientes' }));
    await waitFor(() => expect(router.state.location.search).toBe('?busca=ana&status=todos'));
  });
});

describe('Cadastro (P1)', () => {
  it('abre com foco no nome; salvar vazio mostra o resumo e foca o 1º erro', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/pacientes/novo');
    const nome = await screen.findByRole('textbox', { name: /^Nome completo/ });
    await waitFor(() => expect(nome).toHaveFocus());
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    const resumo = await screen.findByText(/campos precisam de correção/);
    expect(resumo.closest('[role="alert"]')).toHaveTextContent('Nome completo: Campo obrigatório');
    expect(resumo.closest('[role="alert"]')).toHaveTextContent('Consentimento (LGPD)');
    await waitFor(() => expect(nome).toHaveFocus());
  });

  it('CPF inválido e CPF já cadastrado (com link para o cadastro existente)', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/pacientes/novo');
    const cpf = await screen.findByRole('textbox', { name: /^CPF/ });
    await user.type(cpf, '11111111111');
    await user.tab();
    await waitFor(() => expect(cpf).toHaveAccessibleDescription(/Informe um CPF válido/));

    const joao = repoPacientes.obter('pac-joao-pereira')!;
    await user.clear(cpf);
    await user.type(cpf, joao.cpf);
    await user.tab();
    expect(await screen.findByText('Já existe um paciente com este CPF')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Abrir cadastro existente \(João Pereira\)/ }),
    ).toHaveAttribute('href', '/pacientes/pac-joao-pereira');
  });

  it('menor de idade: mostra a idade e exige o responsável legal (R-P5)', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/pacientes/novo');
    await screen.findByRole('textbox', { name: /^Nome completo/ });
    expect(screen.queryByRole('region', { name: 'Responsável legal' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Data de nascimento/), {
      target: { value: '2015-05-05' },
    });
    expect(await screen.findByText(/11 anos · Menor de idade/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Responsável legal' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(
      await within(screen.getByRole('region', { name: 'Responsável legal' })).findByText(
        'Paciente menor de 18 anos: informe o responsável legal',
      ),
    ).toBeInTheDocument();
  });

  it('campos de convênio só aparecem com "Convênio" e ficam obrigatórios', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/pacientes/novo');
    await screen.findByRole('textbox', { name: /^Nome completo/ });
    expect(screen.queryByRole('textbox', { name: /Nome do convênio/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Convênio' }));
    const nomeConvenio = screen.getByRole('textbox', {
      name: /^Nome do convênio\s*\(obrigatório\)/,
    });
    expect(nomeConvenio).toHaveAttribute('aria-required', 'true');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(nomeConvenio).toHaveAttribute('aria-invalid', 'true'));
  });

  it('sucesso: grava, avisa e abre o detalhe', async () => {
    renderizarComRotas('/pacientes/novo');
    await screen.findByRole('textbox', { name: /^Nome completo/ });
    const user = await novoPacienteValido();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await toast('Paciente cadastrado.')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Zuleica Prado' }),
    ).toBeInTheDocument();
    expect(repoPacientes.todos().some((p) => p.cpf === '52998224725')).toBe(true);
  });

  it('com ?voltarPara= volta ao agendamento com o paciente selecionado', async () => {
    const { router } = renderizarComRotas('/pacientes/novo?voltarPara=/consultas/nova');
    await screen.findByRole('textbox', { name: /^Nome completo/ });
    const user = await novoPacienteValido();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    const novo = await waitFor(() => repoPacientes.todos().find((p) => p.cpf === '52998224725')!);
    await waitFor(() =>
      expect(router.state.location.pathname + router.state.location.search).toBe(
        `/consultas/nova?pacienteId=${novo.id}`,
      ),
    );
  });

  describe('busca de CEP (A6)', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      limparCacheCep();
    });

    it('preenche só o que não foi digitado e leva o foco ao número', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(
              JSON.stringify({
                logradouro: 'Avenida Paulista',
                bairro: 'Bela Vista',
                localidade: 'São Paulo',
                uf: 'SP',
              }),
            ),
        ),
      );
      const user = userEvent.setup();
      renderizarComRotas('/pacientes/novo');
      await screen.findByRole('textbox', { name: /^Nome completo/ });
      await user.type(caixa('Logradouro'), 'Rua que eu digitei');
      await user.type(caixa('CEP'), '01310100');
      await waitFor(() => expect(caixa('Bairro')).toHaveValue('Bela Vista'));
      expect(caixa('Cidade')).toHaveValue('São Paulo');
      expect(screen.getByRole('combobox', { name: 'UF' })).toHaveValue('SP');
      expect(caixa('Logradouro')).toHaveValue('Rua que eu digitei');
      await waitFor(() => expect(caixa('Número')).toHaveFocus());
    });

    it('CEP não encontrado e falha de rede mostram a mensagem certa', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(JSON.stringify({ erro: true }))),
      );
      const user = userEvent.setup();
      renderizarComRotas('/pacientes/novo');
      await screen.findByRole('textbox', { name: /^Nome completo/ });
      await user.type(caixa('CEP'), '99999999');
      expect(await screen.findByText('CEP não encontrado')).toBeInTheDocument();

      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Promise.reject(new TypeError('offline'))),
      );
      await user.clear(caixa('CEP'));
      await user.type(caixa('CEP'), '01310200');
      expect(await screen.findByText(/Não foi possível buscar o CEP/)).toBeInTheDocument();
    });
  });
});

describe('Edição (P2)', () => {
  it('"Salvar" só habilita com alterações; salvar volta ao detalhe', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/pacientes/pac-ana-silva/editar');
    const nome = await screen.findByRole('textbox', { name: /^Nome completo/ });
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    await user.clear(nome);
    await user.type(nome, 'Ana Paula Silva Costa');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await toast('Alterações salvas.')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ana Paula Silva Costa' }),
    ).toBeInTheDocument();
    expect(repoPacientes.obter('pac-ana-silva')?.versao).toBe(2);
  });

  it('trocar o CPF pede confirmação', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/pacientes/pac-ana-silva/editar');
    const cpf = await screen.findByRole('textbox', { name: /^CPF/ });
    await user.clear(cpf);
    await user.type(cpf, '52998224725');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    const dialogo = await screen.findByRole('alertdialog', {
      name: 'Alterar o CPF deste paciente?',
    });
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(repoPacientes.obter('pac-ana-silva')?.cpf).not.toBe('52998224725');

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await user.click(await screen.findByRole('button', { name: 'Alterar CPF' }));
    expect(await toast('Alterações salvas.')).toBeInTheDocument();
    expect(repoPacientes.obter('pac-ana-silva')?.cpf).toBe('52998224725');
  });

  it('alteração em outra aba: aviso, e ao salvar pergunta (E-05)', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/pacientes/pac-ana-silva/editar');
    const obs = await screen.findByRole('textbox', { name: 'Observações' });
    // "Outra aba" grava uma nova versão.
    repoPacientes.atualizar('pac-ana-silva', { observacoes: 'Gravado na outra aba' });
    expect(await screen.findByText(/alterado em outra aba/)).toBeInTheDocument();

    await user.type(obs, 'Minha observação');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    const dialogo = await screen.findByRole('alertdialog', {
      name: 'Cadastro alterado em outro lugar',
    });
    await user.click(within(dialogo).getByRole('button', { name: 'Continuar editando' }));
    expect(obs).toHaveValue('Minha observação');

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await toast('Alterações salvas.')).toBeInTheDocument();
    expect(repoPacientes.obter('pac-ana-silva')?.observacoes).toBe('Minha observação');
  });
});

describe('Detalhe', () => {
  it('E-08: paciente inexistente', async () => {
    renderizarComRotas('/pacientes/nao-existe');
    expect(
      await screen.findByRole('heading', { name: 'Paciente não encontrado' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para a lista de pacientes' })).toHaveAttribute(
      'href',
      '/pacientes',
    );
  });

  it('CPF oculto por padrão (R-P4), alergias em destaque e nome civil (R-P6)', async () => {
    const user = userEvent.setup();
    const cpf = repoPacientes.obter('pac-rafaela-martins')!.cpf;
    repoPacientes.atualizar('pac-rafaela-martins', { alergias: 'Iodo' });
    renderizarComRotas('/pacientes/pac-rafaela-martins');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Rafaela Martins' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Nome civil/).length).toBeGreaterThan(0);
    expect(
      within(screen.getByRole('region', { name: 'Alergias' })).getByText('Iodo'),
    ).toBeInTheDocument();

    const mascarado = `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
    expect(screen.getByText(mascarado)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mostrar CPF' }));
    expect(
      screen.getByText(`${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocultar CPF' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('Inativar, reativar e excluir (P3–P5)', () => {
  const novo = () =>
    criarPaciente({
      nome: 'Otávio Reis',
      cpf: '52998224725',
      dataNascimento: '1980-01-01',
      sexo: 'masculino',
      telefone: '11987654321',
      convenio: { tipo: 'particular' },
      consentimentoLgpd: true,
    });

  it('inativar cancela as consultas futuras; reativar não as traz de volta', async () => {
    const p = await novo();
    const consulta = await agendarConsulta({
      pacienteId: p.id,
      medicoId: 'med-paulo-mendes',
      data: '2026-11-23',
      hora: '09:00',
      duracaoMin: 30,
      tipo: 'retorno',
    });
    const user = userEvent.setup();
    renderizarComRotas(`/pacientes/${p.id}`);
    await user.click(await screen.findByRole('button', { name: 'Mais ações para Otávio Reis' }));
    await user.click(screen.getByRole('menuitem', { name: 'Inativar' }));

    const dialogo = await screen.findByRole('alertdialog', { name: 'Inativar Otávio Reis?' });
    expect(dialogo).toHaveTextContent('1 consulta futura será cancelada automaticamente.');
    await user.type(
      within(dialogo).getByRole('textbox', { name: 'Motivo da inativação (opcional)' }),
      'Mudou de cidade',
    );
    await user.click(within(dialogo).getByRole('button', { name: 'Inativar' }));

    expect(await toast('Paciente inativado. 1 consulta cancelada.')).toBeInTheDocument();
    expect(
      await screen.findByText(/Paciente inativo desde 09\/11\/2026 — motivo: Mudou de cidade/),
    ).toBeInTheDocument();
    expect(repoConsultas.obter(consulta.id)?.status).toBe('cancelada');

    await user.click(screen.getByRole('button', { name: 'Mais ações para Otávio Reis' }));
    await user.click(screen.getByRole('menuitem', { name: 'Reativar' }));
    await user.click(await screen.findByRole('button', { name: 'Reativar' }));
    expect(
      await toast('Paciente reativado. As consultas canceladas não foram restauradas.'),
    ).toBeInTheDocument();
    expect(repoConsultas.obter(consulta.id)?.status).toBe('cancelada');
  });

  it('excluir só sem consultas, digitando o nome', async () => {
    const user = userEvent.setup();
    renderizarComRotas('/pacientes/pac-joao-pereira');
    await user.click(await screen.findByRole('button', { name: 'Mais ações para João Pereira' }));
    expect(
      screen.queryByRole('menuitem', { name: 'Excluir definitivamente' }),
    ).not.toBeInTheDocument();
  });

  it('exclusão definitiva volta para a lista', async () => {
    const p = await novo();
    const user = userEvent.setup();
    const { router } = renderizarComRotas(`/pacientes/${p.id}`);
    await screen.findByRole('heading', { level: 1, name: 'Otávio Reis' });
    await user.click(screen.getByRole('button', { name: 'Mais ações para Otávio Reis' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Excluir definitivamente' }));
    const dialogo = await screen.findByRole('alertdialog');
    const confirmar = within(dialogo).getByRole('button', { name: 'Excluir definitivamente' });
    expect(confirmar).toBeDisabled();
    await user.type(within(dialogo).getByRole('textbox'), 'Otávio Reis');
    await user.click(confirmar);
    expect(await toast('Cadastro excluído.')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/pacientes'));
    expect(repoPacientes.obter(p.id)).toBeUndefined();
  });
});
