/**
 * 19.11 — Telas da Farmácia, com os dados de exemplo e o roteador real.
 * As invariantes são conferidas no fim de cada fluxo que grava (`esperarConsistente`).
 */
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  repoDispensacoes,
  repoInternacoes,
  repoLotes,
  repoMedicamentos,
  repoMovimentacoes,
} from '../services/colecoes-operacoes';
import { devolver, dispensar } from '../services/farmacia';
import type { Lote } from '../types';
import { disponivelDe } from '../utils/fefo';
import { renderizarComRotas } from './utils/renderizarComRotas';
import { esperarConsistente, gravarComoOutraAba, prepararOperacoes } from './utils/operacoes';
import { ajustarRelogio } from './utils/servicos';

prepararOperacoes('2026-11-10T10:30:00-03:00'); // terça-feira

const HOJE = '2026-11-10';
/** Internada sem alergias informadas. */
const SEM_ALERGIA = 'pac-g-043';
/** Internado com alergia a "Penicilina". */
const ALERGICO = 'pac-g-004';
const MEDICO = 'med-helena-duarte';

const toast = async (texto: string | RegExp) =>
  within(await screen.findByRole('region', { name: 'Notificações' })).findByText(texto);
const usuario = () => userEvent.setup();
const dialogo = (nome: string | RegExp) => screen.findByRole('dialog', { name: nome });
const alerta = (nome: string | RegExp) => screen.findByRole('alertdialog', { name: nome });
const disponivel = (medicamentoId: string) =>
  disponivelDe(
    repoLotes.todos().filter((l) => l.medicamentoId === medicamentoId),
    HOJE,
  );

/** Dispensação pelo serviço (para as telas de detalhe). */
const dispensacao = (medicamentoId: string, quantidade: number) =>
  dispensar({
    pacienteId: SEM_ALERGIA,
    medicoSolicitanteId: MEDICO,
    itens: [{ medicamentoId, quantidade }],
  });

describe('Estoque (19.2)', { timeout: 30_000 }, () => {
  it('resumo, busca por princípio ativo e filtro de situação na URL', async () => {
    const user = usuario();
    const { router } = renderizarComRotas('/farmacia');
    const resumo = await screen.findByRole('list', { name: 'Resumo do estoque' });
    expect(within(resumo).getByRole('link', { name: /Baixo\s*3/ })).toBeInTheDocument();
    expect(within(resumo).getByRole('link', { name: /Zerado\s*1/ })).toBeInTheDocument();
    expect(within(resumo).getByRole('link', { name: /Lotes vencidos\s*2/ })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Situação' }), 'baixo');
    await waitFor(() => expect(router.state.location.search).toBe('?situacao=baixo'));
    const tabela = await screen.findByRole('table', { name: 'Estoque de medicamentos' });
    await waitFor(() => expect(within(tabela).getAllByRole('row')).toHaveLength(1 + 3));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Situação' }), '');
    await user.type(screen.getByRole('searchbox', { name: 'Buscar medicamento' }), 'Novalgina');
    await waitFor(() => expect(router.state.location.search).toContain('busca=Novalgina'));
    await waitFor(() =>
      expect(
        within(tabela).getByRole('link', { name: 'Dipirona sódica 500 mg' }),
      ).toBeInTheDocument(),
    );
  });

  it('ordenar por disponível vai para a URL', async () => {
    const user = usuario();
    const { router } = renderizarComRotas('/farmacia?controlados=1');
    const tabela = await screen.findByRole('table', { name: 'Estoque de medicamentos' });
    await waitFor(() => expect(within(tabela).getAllByRole('row')).toHaveLength(1 + 4));
    await user.click(within(tabela).getByRole('button', { name: /Disponível/ }));
    await waitFor(() => expect(router.state.location.search).toContain('ordenarPor=disponivel'));
    const primeira = within(tabela).getAllByRole('row')[1];
    expect(primeira).toHaveTextContent(/Morfina/);
  });
});

describe('Catálogo (19.3)', { timeout: 30_000 }, () => {
  it('cadastrar e abrir o detalhe; duplicado mostra o link do existente (E-02)', async () => {
    const user = usuario();
    const { router } = renderizarComRotas('/farmacia/medicamentos/novo');
    await user.type(
      await screen.findByRole('textbox', { name: /Nome \(genérico\)/ }),
      'Dipirona sódica',
    );
    await user.type(screen.getByRole('textbox', { name: /Princípio ativo/ }), 'Dipirona sódica');
    await user.type(screen.getByRole('textbox', { name: /Concentração/ }), '500 mg');
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Forma farmacêutica/ }),
      'comprimido',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Unidade de dispensação/ }),
      'comprimido',
    );
    await user.type(screen.getByRole('textbox', { name: /Estoque mínimo/ }), '10');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('link', { name: 'Abrir o cadastro existente' })).toHaveAttribute(
      'href',
      '/farmacia/medicamentos/med-dipirona-500',
    );

    await user.clear(screen.getByRole('textbox', { name: /Concentração/ }));
    await user.type(screen.getByRole('textbox', { name: /Concentração/ }), '250 mg');
    await user.selectOptions(screen.getByRole('combobox', { name: /Controlado/ }), 'B1');
    expect(screen.getByText(/dispensar exige médico solicitante/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await toast('Medicamento cadastrado')).toBeInTheDocument();
    const novo = repoMedicamentos.todos().find((m) => m.concentracao === '250 mg')!;
    expect(novo).toMatchObject({ controlado: { lista: 'B1' }, estoqueMinimo: 10 });
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/farmacia/medicamentos/${novo.id}`),
    );
  });

  it('editar com movimentações: a unidade fica travada', async () => {
    renderizarComRotas('/farmacia/medicamentos/med-dipirona-500/editar');
    expect(await screen.findByText(/não podem mudar/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Unidade de dispensação/ })).toHaveAttribute(
      'readonly',
    );
  });

  it('ajuste negativo maior que o saldo dá erro (E-12); perda registra', async () => {
    const user = usuario();
    renderizarComRotas('/farmacia/medicamentos/med-ceftriaxona-1g');
    await user.click(await screen.findByRole('button', { name: 'Mais ações para lote L23119' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Ajuste de inventário' }));
    const d = await dialogo('Ajuste do lote L23119');
    await user.type(within(d).getByRole('spinbutton'), '30');
    await user.type(within(d).getByRole('textbox', { name: /Motivo/ }), 'Contagem do inventário');
    await user.click(within(d).getByRole('button', { name: 'Registrar' }));
    expect(await within(d).findByText(/não pode ficar negativo/)).toBeInTheDocument();
    expect(repoLotes.todos().find((l) => l.numero === 'L23119')!.quantidadeAtual).toBe(24);
    await user.click(within(d).getByRole('button', { name: 'Voltar' }));

    await user.click(screen.getByRole('button', { name: 'Mais ações para lote L23119' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Registrar perda/avaria' }));
    const p = await dialogo('Perda/avaria do lote L23119');
    await user.type(within(p).getByRole('spinbutton'), '4');
    await user.type(within(p).getByRole('textbox', { name: /Motivo/ }), 'Frasco quebrado');
    await user.click(within(p).getByRole('button', { name: 'Registrar' }));
    expect(await toast(/Movimentação registrada \(4 frascos\)/)).toBeInTheDocument();
    expect(repoLotes.todos().find((l) => l.numero === 'L23119')!.quantidadeAtual).toBe(20);
    esperarConsistente();
  });

  it('bloquear o lote tira do disponível; desbloquear devolve', async () => {
    const user = usuario();
    const antes = disponivel('med-paracetamol-750');
    renderizarComRotas('/farmacia/medicamentos/med-paracetamol-750');
    await user.click(await screen.findByRole('button', { name: 'Mais ações para lote L23035' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Bloquear lote' }));
    const d = await alerta('Bloquear o lote L23035?');
    await user.click(within(d).getByRole('button', { name: 'Recolhimento' }));
    await user.type(within(d).getByRole('textbox', { name: /Referência/ }), 'ANVISA 123');
    await user.click(within(d).getByRole('button', { name: 'Bloquear' }));
    expect(await toast('Lote L23035 bloqueado')).toBeInTheDocument();
    expect(disponivel('med-paracetamol-750')).toBe(antes - 678);
    expect(await screen.findByText('Bloqueado: Recolhimento')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mais ações para lote L23035' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Desbloquear lote' }));
    await user.click(
      within(await alerta(/Desbloquear o lote/)).getByRole('button', { name: 'Desbloquear' }),
    );
    expect(await toast('Lote L23035 desbloqueado')).toBeInTheDocument();
    expect(disponivel('med-paracetamol-750')).toBe(antes);
    esperarConsistente();
  });

  it('inativar com saldo mostra os lotes (E-17)', async () => {
    const user = usuario();
    renderizarComRotas('/farmacia/medicamentos/med-ringer-lactato');
    await user.click(await screen.findByRole('button', { name: 'Inativar' }));
    const c = await alerta(/Inativar Ringer/);
    await user.click(within(c).getByRole('button', { name: 'Inativar' }));
    const aviso = (await screen.findByText('Não é possível inativar')).closest('[role="alert"]')!;
    expect(aviso).toHaveTextContent(/há 1 lote com saldo/);
    expect(aviso).toHaveTextContent('L23504');
    expect(repoMedicamentos.obter('med-ringer-lactato')!.ativo).toBe(true);
  });

  it('id inexistente: "não encontrado" (E-08)', async () => {
    renderizarComRotas('/farmacia/medicamentos/nao-existe');
    expect(
      await screen.findByRole('heading', { name: 'Medicamento não encontrado' }),
    ).toBeInTheDocument();
  });
});

describe('Entrada de lote (19.4)', { timeout: 30_000 }, () => {
  it('por embalagem, com a conversão; volta ao detalhe', async () => {
    const user = usuario();
    const { router } = renderizarComRotas('/farmacia/entrada?medicamentoId=med-dipirona-500');
    expect(await screen.findByText(/Disponível: 1\.574 comprimidos/)).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /Número do lote/ }), 'L99001');
    await user.type(screen.getByLabelText(/Validade/), '2028-12-31');
    await user.click(screen.getByRole('radio', { name: 'Embalagens' }));
    await user.type(screen.getByRole('spinbutton'), '3');
    expect(screen.getByText('3 × 20 = 60 comprimidos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Registrar entrada' }));
    expect(
      await toast('Entrada registrada: 60 comprimidos de Dipirona sódica 500 mg (lote L99001)'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/farmacia/medicamentos/med-dipirona-500'),
    );
    esperarConsistente();
  });

  it('vencida é erro (E-13); curta pede confirmação', async () => {
    const user = usuario();
    renderizarComRotas('/farmacia/entrada?medicamentoId=med-ondansetrona-8');
    await user.type(await screen.findByRole('textbox', { name: /Número do lote/ }), 'L99002');
    await user.type(screen.getByLabelText(/Validade/), '2026-11-09');
    await user.type(screen.getByRole('spinbutton'), '10');
    await user.click(screen.getByRole('button', { name: 'Registrar entrada' }));
    expect(await screen.findAllByText(/vencid/i)).not.toHaveLength(0);
    expect(repoLotes.todos().some((l) => l.numero === 'L99002')).toBe(false);

    await user.clear(screen.getByLabelText(/Validade/));
    await user.type(screen.getByLabelText(/Validade/), '2026-11-25');
    await user.click(screen.getByRole('button', { name: 'Registrar entrada' }));
    const c = await alerta('Validade curta');
    await user.click(within(c).getByRole('button', { name: 'Registrar mesmo assim' }));
    expect(await toast(/Entrada registrada: 10 ampolas/)).toBeInTheDocument();
    esperarConsistente();
  });

  it('lote repetido com a mesma validade: "Somar ao lote"', async () => {
    const user = usuario();
    renderizarComRotas('/farmacia/entrada?medicamentoId=med-dipirona-500');
    await user.type(await screen.findByRole('textbox', { name: /Número do lote/ }), 'L23007');
    await user.type(screen.getByLabelText(/Validade/), '2027-07-05');
    await user.type(screen.getByRole('spinbutton'), '13');
    await user.click(
      await screen.findByRole('checkbox', { name: 'Somar ao lote L23007 (mesma validade)' }),
    );
    await user.click(screen.getByRole('button', { name: 'Registrar entrada' }));
    expect(await toast(/13 comprimidos/)).toBeInTheDocument();
    expect(repoLotes.todos().find((l) => l.numero === 'L23007')!.quantidadeAtual).toBe(1000);
    esperarConsistente();
  });
});

describe('Dispensar (19.5)', { timeout: 30_000 }, () => {
  it('FEFO em 2 lotes, resumo e detalhe; alergias não informadas no topo', async () => {
    const user = usuario();
    const { router } = renderizarComRotas(`/farmacia/dispensar?pacienteId=${SEM_ALERGIA}`);
    expect(
      await screen.findByText('Alergias não informadas — confirme com a equipe'),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Internado em UTI-/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /Médico solicitante/ })).not.toHaveValue(''),
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: /^Medicamento/ }),
      'med-ibuprofeno-600',
    );
    await user.type(screen.getByRole('spinbutton'), '50');
    expect(
      await screen.findByText(/45 do lote L23616 \(vence 30\/11\/2026\), 5 do lote L23049/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Revisar dispensação' }));
    const d = await dialogo('Confirmar dispensação');
    expect(within(d).getByText(/Ibuprofeno 600 mg · 50 comprimidos/)).toBeInTheDocument();
    await user.click(within(d).getByRole('button', { name: 'Dispensar' }));
    expect(await toast('Dispensação registrada (1 item)')).toBeInTheDocument();
    const x = repoDispensacoes
      .todos()
      .find((y) => y.pacienteId === SEM_ALERGIA && y.itens[0].quantidade === 50)!;
    expect(x.itens[0].lotes).toHaveLength(2);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/farmacia/dispensacoes/${x.id}`),
    );
    esperarConsistente();
  });

  it('alergia (A10): sem "Ciente" e justificativa não segue; com elas, grava o alerta', async () => {
    const user = usuario();
    renderizarComRotas(`/farmacia/dispensar?pacienteId=${ALERGICO}`);
    expect(await screen.findByText('Alergias: Penicilina')).toBeInTheDocument();
    await user.selectOptions(
      await screen.findByRole('combobox', { name: /^Medicamento/ }),
      'med-amoxicilina-500',
    );
    await user.type(screen.getByRole('spinbutton'), '14');
    expect(await screen.findByText(/Possível alergia: penicilina/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Revisar dispensação' }));
    expect(await screen.findAllByText(/marque "Ciente"/)).not.toHaveLength(0);
    expect(screen.queryByRole('dialog', { name: 'Confirmar dispensação' })).toBeNull();

    await user.click(screen.getByRole('checkbox', { name: /Ciente/ }));
    await user.type(
      screen.getByRole('textbox', { name: /Justificativa/ }),
      'Prescrição confirmada com o médico',
    );
    await user.click(screen.getByRole('button', { name: 'Revisar dispensação' }));
    const d = await dialogo('Confirmar dispensação');
    expect(within(d).getByText(/Alergia \("penicilina"\) — justificada/i)).toBeInTheDocument();
    await user.click(within(d).getByRole('button', { name: 'Dispensar' }));
    expect(await toast(/Dispensação registrada/)).toBeInTheDocument();
    const x = repoDispensacoes
      .todos()
      .filter((y) => y.pacienteId === ALERGICO)
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0];
    expect(x.alertasConfirmados[0]).toMatchObject({
      tipo: 'alergia',
      justificativa: 'Prescrição confirmada com o médico',
    });
    esperarConsistente();
  });

  it('controlado e quantidade alta exigem confirmação', async () => {
    const user = usuario();
    renderizarComRotas(`/farmacia/dispensar?pacienteId=${SEM_ALERGIA}`);
    await user.selectOptions(
      await screen.findByRole('combobox', { name: /^Medicamento/ }),
      'med-morfina-10',
    );
    await user.type(screen.getByRole('spinbutton'), '61');
    await user.click(screen.getByRole('button', { name: 'Revisar dispensação' }));
    expect(await screen.findAllByText(/confirme a conferência da receita/)).not.toHaveLength(0);
    expect(screen.getAllByText(/Quantidade alta: confirme/)).not.toHaveLength(0);
    await user.click(screen.getByRole('checkbox', { name: 'Conferi a receita/prescrição' }));
    await user.click(screen.getByRole('checkbox', { name: 'Confirmo a quantidade' }));
    await user.click(screen.getByRole('button', { name: 'Revisar dispensação' }));
    const d = await dialogo('Confirmar dispensação');
    await user.click(within(d).getByRole('button', { name: 'Dispensar' }));
    expect(await toast(/Dispensação registrada/)).toBeInTheDocument();
    const x = repoDispensacoes
      .todos()
      .find((y) => y.itens[0].medicamentoId === 'med-morfina-10' && y.itens[0].quantidade === 61)!;
    expect(x.alertasConfirmados.map((a) => a.tipo).sort()).toEqual([
      'controlado',
      'quantidade_alta',
    ]);
    esperarConsistente();
  });

  it('E-12: outra aba consome o estoque antes de confirmar; nada é gravado', async () => {
    const user = usuario();
    renderizarComRotas(`/farmacia/dispensar?pacienteId=${SEM_ALERGIA}`);
    await user.selectOptions(
      await screen.findByRole('combobox', { name: /^Medicamento/ }),
      'med-insulina-nph',
    );
    await user.type(screen.getByRole('spinbutton'), '10');
    await user.click(screen.getByRole('button', { name: 'Revisar dispensação' }));
    const d = await dialogo('Confirmar dispensação');
    gravarComoOutraAba<Lote>('lotes', (itens) =>
      itens.map((l) =>
        l.numero === 'L23336' ? { ...l, quantidadeAtual: 3, versao: l.versao + 1 } : l,
      ),
    );
    const antes = repoDispensacoes.todos().length;
    await user.click(within(d).getByRole('button', { name: 'Dispensar' }));
    expect(await screen.findAllByText(/Estoque insuficiente: disponível 3/)).not.toHaveLength(0);
    expect(repoDispensacoes.todos()).toHaveLength(antes);
  });

  it('o mesmo medicamento em dois itens pede para unir', async () => {
    const user = usuario();
    renderizarComRotas(`/farmacia/dispensar?pacienteId=${SEM_ALERGIA}&medicamentoId=med-aas-100`);
    expect(await screen.findByRole('combobox', { name: /^Medicamento/ })).toHaveValue(
      'med-aas-100',
    );
    await user.type(screen.getByRole('spinbutton'), '2');
    await user.click(screen.getByRole('button', { name: 'Adicionar item' }));
    const selects = screen.getAllByRole('combobox', { name: /^Medicamento/ });
    await user.selectOptions(selects[1], 'med-aas-100');
    await user.type(screen.getAllByRole('spinbutton')[1], '1');
    await user.click(screen.getByRole('button', { name: 'Revisar dispensação' }));
    expect(await screen.findAllByText(/una as linhas/)).not.toHaveLength(0);
  });
});

describe('Detalhe da dispensação (19.6)', { timeout: 30_000 }, () => {
  it('devolução parcial e estorno bloqueado depois dela', async () => {
    const user = usuario();
    const x = await dispensacao('med-captopril-25', 10);
    renderizarComRotas(`/farmacia/dispensacoes/${x.id}`);
    expect(await screen.findByText(/Pode ser estornada até/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Devolver Captopril 25 mg' }));
    const d = await alerta('Devolver Captopril 25 mg');
    await user.type(within(d).getByRole('spinbutton'), '4');
    await user.click(within(d).getByRole('button', { name: 'Não utilizado' }));
    await user.click(within(d).getByRole('button', { name: 'Devolver' }));
    expect(await toast('Devolução registrada (4 comprimidos)')).toBeInTheDocument();
    expect(await screen.findByText('Devolvido: 4 comprimidos')).toBeInTheDocument();
    expect(screen.getByText(/Já houve devolução/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Estornar dispensação' })).toBeNull();
    esperarConsistente();
  });

  it('estorno dentro da janela devolve tudo e marca como estornada', async () => {
    const user = usuario();
    const x = await dispensacao('med-captopril-25', 6);
    renderizarComRotas(`/farmacia/dispensacoes/${x.id}`);
    await user.click(await screen.findByRole('button', { name: 'Estornar dispensação' }));
    const d = await alerta('Estornar a dispensação?');
    await user.click(within(d).getByRole('button', { name: 'Duplicidade' }));
    await user.click(within(d).getByRole('button', { name: 'Estornar dispensação' }));
    expect(await toast('Dispensação estornada')).toBeInTheDocument();
    expect(repoDispensacoes.obter(x.id)!.status).toBe('estornada');
    expect(await screen.findByText('Estornada')).toBeInTheDocument();
    esperarConsistente();
  });

  it('fora da janela de 24 h o botão some e o aviso explica (E-18)', async () => {
    const x = await dispensacao('med-captopril-25', 2);
    ajustarRelogio('2026-11-11T11:00:00-03:00');
    renderizarComRotas(`/farmacia/dispensacoes/${x.id}`);
    expect(await screen.findByText(/prazo de 24 h/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Estornar dispensação' })).toBeNull();
  });

  it('outra aba devolve antes: a tela relê o saldo e não deixa devolver além dele', async () => {
    const user = usuario();
    const x = await dispensacao('med-captopril-25', 3);
    renderizarComRotas(`/farmacia/dispensacoes/${x.id}`);
    await user.click(await screen.findByRole('button', { name: 'Devolver Captopril 25 mg' }));
    const d = await alerta('Devolver Captopril 25 mg');
    await act(() => devolver(x.id, 0, { quantidade: 2, motivo: 'Alta' }, 1).then(() => undefined));
    await user.type(within(d).getByRole('spinbutton'), '3');
    await user.click(within(d).getByRole('button', { name: 'Alta' }));
    await user.click(within(d).getByRole('button', { name: 'Devolver' }));
    expect(await within(d).findByText('Só é possível devolver até 1.')).toBeInTheDocument();
    expect(repoDispensacoes.obter(x.id)!.itens[0].devolvido).toBe(2);
    esperarConsistente();
  });
});

describe('Movimentações, vencimentos e controlados (19.7–19.9)', { timeout: 30_000 }, () => {
  it('movimentações: filtro de tipo na URL e link para a dispensação', async () => {
    const user = usuario();
    const { router } = renderizarComRotas('/farmacia/movimentacoes');
    const tabela = await screen.findByRole('table', { name: 'Movimentações' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), 'entrada');
    await waitFor(() => expect(router.state.location.search).toBe('?tipo=entrada'));
    await waitFor(() =>
      within(tabela)
        .getAllByRole('row')
        .slice(1)
        .forEach((r) => expect(r).toHaveTextContent('Entrada')),
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), 'dispensacao');
    await waitFor(() =>
      expect(
        within(tabela)
          .getAllByRole('link')
          .some((l) => l.getAttribute('href')?.startsWith('/farmacia/dispensacoes/')),
      ).toBe(true),
    );
  });

  it('vencimentos: descarte em lote dos vencidos selecionados', async () => {
    const user = usuario();
    renderizarComRotas('/farmacia/vencimentos');
    const tabela = await screen.findByRole('table', { name: 'Lotes vencidos com saldo' });
    await user.click(screen.getByRole('button', { name: 'Descartar selecionados' }));
    expect(await screen.findByText('Selecione ao menos um lote vencido.')).toBeInTheDocument();
    for (const caixa of within(tabela).getAllByRole('checkbox').slice(1)) await user.click(caixa);
    await user.click(screen.getByRole('button', { name: 'Descartar 2 selecionado(s)' }));
    const d = await alerta('Descartar 2 lotes?');
    await user.click(within(d).getByRole('button', { name: 'Validade expirada' }));
    await user.click(within(d).getByRole('button', { name: 'Descartar' }));
    expect(await toast('2 lotes descartados (40 unidades)')).toBeInTheDocument();
    expect(
      repoMovimentacoes
        .todos()
        .filter((m) => m.tipo === 'descarte_vencido' && m.motivo === 'Validade expirada'),
    ).toHaveLength(2);
    expect(await screen.findByText('Nenhum lote vencido com saldo.')).toBeInTheDocument();
    esperarConsistente();
  });

  it('vencimentos: controlado exige o termo de descarte', async () => {
    const user = usuario();
    // Um lote de morfina vencido (gravado direto, como se tivesse vencido na virada do dia).
    const morfina = repoLotes.todos().find((l) => l.numero === 'L23539')!;
    repoLotes.atualizar(morfina.id, { validade: '2026-11-01' });
    renderizarComRotas('/farmacia/vencimentos');
    const tabela = await screen.findByRole('table', { name: 'Lotes vencidos com saldo' });
    await user.click(
      await within(tabela).findByRole('checkbox', {
        name: /Selecionar Morfina 10 mg\/mL, lote L23539/,
      }),
    );
    await user.click(screen.getByRole('button', { name: /Descartar 1/ }));
    const d = await alerta('Descartar 1 lote?');
    await user.click(within(d).getByRole('button', { name: 'Validade expirada' }));
    await user.click(within(d).getByRole('button', { name: 'Descartar' }));
    expect(await within(d).findByText(/número do termo de descarte/)).toBeInTheDocument();
    await user.type(within(d).getByRole('textbox', { name: /Número do termo/ }), 'TD-2026-17');
    await user.click(within(d).getByRole('button', { name: 'Descartar' }));
    expect(await toast(/1 lote descartado/)).toBeInTheDocument();
    expect(repoMovimentacoes.todos().find((m) => m.termo === 'TD-2026-17')).toBeTruthy();
    esperarConsistente();
  });

  it('livro de controlados: saldo final = inicial + entradas − saídas', async () => {
    renderizarComRotas(
      '/farmacia/controlados?medicamento=med-morfina-10&de=2026-10-01&ate=2026-11-10',
    );
    const resumo = await screen.findByRole('list', { name: 'Movimentações do período' });
    const numero = (rotulo: string) =>
      Number(
        within(resumo)
          .getByText(rotulo)
          .parentElement!.textContent!.replace(rotulo, '')
          .replace(/\D/g, ''),
      );
    const inicial = numero('Saldo inicial');
    const entradas = numero('Entradas');
    const saidas = numero('Saídas');
    const final = numero('Saldo final');
    expect(final).toBe(inicial + entradas - saidas);
    expect(final).toBe(179 + 105);
  });
});

describe('Ligações com leitos e emergência (19.10)', { timeout: 30_000 }, () => {
  it('detalhe da internação: "Dispensar medicamento" e a seção de dispensações', async () => {
    const i = repoInternacoes
      .todos()
      .find((x) => x.pacienteId === SEM_ALERGIA && x.status === 'ativa')!;
    const x = await dispensacao('med-captopril-25', 2);
    renderizarComRotas(`/leitos/internacoes/${i.id}`);
    expect(await screen.findByRole('link', { name: 'Dispensar medicamento' })).toHaveAttribute(
      'href',
      `/farmacia/dispensar?pacienteId=${SEM_ALERGIA}`,
    );
    const secao = (await screen.findByRole('heading', { name: 'Dispensações' })).closest(
      'section',
    )!;
    expect(await within(secao).findByText(/Captopril 25 mg \(2 comprimidos\)/)).toBeInTheDocument();
    expect(
      within(secao)
        .getAllByRole('link')
        .some((l) => l.getAttribute('href') === `/farmacia/dispensacoes/${x.id}`),
    ).toBe(true);
  });
});
