/**
 * 18.9 — Telas da Emergência, com os dados de exemplo e o roteador real.
 * As invariantes são conferidas no fim de cada fluxo (`esperarConsistente`).
 */
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { repoPacientes } from '../services/colecoes';
import {
  repoAtendimentos,
  repoInternacoes,
  repoLeitos,
  repoSolicitacoes,
} from '../services/colecoes-operacoes';
import { chamar, encerrar, registrarChegada, triar } from '../services/emergencia';
import type { Atendimento } from '../types';
import { renderizarComRotas } from './utils/renderizarComRotas';
import {
  agoraIso,
  esperarConsistente,
  gravarComoOutraAba,
  MEDICO_EMERGENCIA,
  pacienteLivre,
  prepararOperacoes,
} from './utils/operacoes';
import { ajustarRelogio } from './utils/servicos';
import { idade } from '../utils/datas';
import { avaliarSinais } from '../utils/sinais-vitais';

prepararOperacoes('2026-11-10T10:30:00-03:00'); // terça-feira

const toast = async (texto: string | RegExp) =>
  within(await screen.findByRole('region', { name: 'Notificações' })).findByText(texto);
const usuario = () => userEvent.setup();
const dialogo = (nome: string | RegExp) => screen.findByRole('dialog', { name: nome });
const alerta = (nome: string | RegExp) => screen.findByRole('alertdialog', { name: nome });
const abertos = (status: Atendimento['status']) =>
  repoAtendimentos.todos().filter((a) => a.status === status);

/** Chegada já triada e chamada (em atendimento), com paciente cadastrado. */
async function emAtendimento(pular = 0) {
  const p = pacienteLivre({ pular });
  const a = await registrarChegada({
    pacienteId: p.id,
    modoChegada: 'meios_proprios',
    queixa: 'Dor abdominal',
    chegadaEm: agoraIso(),
  });
  const t = await triar(a.id, { risco: 'amarelo', profissional: 'Enf. Teste', sinais: {} }, 1);
  await chamar(a.id, MEDICO_EMERGENCIA, t.versao);
  return { a: repoAtendimentos.obter(a.id)!, p };
}

async function escolherPaciente(user: ReturnType<typeof usuario>, nome: string) {
  await user.type(await screen.findByRole('combobox', { name: /Paciente/ }), nome);
  await user.click(await screen.findByRole('option', { name: new RegExp(nome) }));
}

describe('Fila (18.2)', { timeout: 30_000 }, () => {
  it('grupos, ordem do A7 (vermelho primeiro) e resumo por cor', async () => {
    renderizarComRotas('/emergencia');
    const grupo = await screen.findByRole('region', { name: /^Aguardando atendimento/ });
    const itens = within(grupo).getAllByRole('listitem');
    expect(within(itens[0]).getByText('Vermelho')).toBeInTheDocument();
    const resumo = screen.getByRole('list', { name: 'Resumo da fila' });
    expect(
      within(resumo).getByRole('link', { name: /Vermelho\s*1 aguardando/ }),
    ).toBeInTheDocument();
    for (const g of ['Aguardando triagem', 'Em atendimento', 'Em observação', 'Aguardando leito'])
      expect(screen.getByRole('heading', { name: new RegExp(`^${g} \\(`) })).toBeInTheDocument();
  });

  it('"Mostrar só" vai para a URL e não muda a ordem', async () => {
    const user = usuario();
    const { router } = renderizarComRotas('/emergencia');
    await screen.findByRole('region', { name: /^Aguardando atendimento/ });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Mostrar só' }), 'laranja');
    await waitFor(() => expect(router.state.location.search).toBe('?mostrar=laranja'));
    const linhas = await screen.findAllByRole('group', { name: /^Ações do atendimento/ });
    const esperado = repoAtendimentos
      .todos()
      .filter((a) => a.status !== 'encerrado' && a.risco === 'laranja').length;
    expect(linhas).toHaveLength(esperado);
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Mostrar só' }),
      'aguardandoTriagem',
    );
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /^Aguardando atendimento/ })).toBeNull(),
    );
    expect(screen.getByRole('heading', { name: /^Aguardando triagem/ })).toBeInTheDocument();
  });

  it('chamar: escolhe o médico e o próximo chamado lembra a escolha', async () => {
    const user = usuario();
    renderizarComRotas('/emergencia');
    const alvo = abertos('aguardando_atendimento').sort((x, y) =>
      x.numero.localeCompare(y.numero),
    )[0];
    await user.click(await screen.findByRole('button', { name: `Chamar ${alvo.numero}` }));
    const d = await dialogo(`Chamar ${alvo.numero}`);
    const medico = await within(d).findByRole('combobox', { name: /Médico/ });
    await user.selectOptions(medico, MEDICO_EMERGENCIA);
    await user.click(within(d).getByRole('button', { name: 'Chamar' }));
    expect(await toast(new RegExp(`${alvo.numero} chamado`))).toBeInTheDocument();
    expect(repoAtendimentos.obter(alvo.id)).toMatchObject({
      status: 'em_atendimento',
      medicoId: MEDICO_EMERGENCIA,
    });
    const outro = abertos('aguardando_atendimento')[0];
    await user.click(await screen.findByRole('button', { name: `Chamar ${outro.numero}` }));
    const d2 = await dialogo(`Chamar ${outro.numero}`);
    await waitFor(() =>
      expect(within(d2).getByRole('combobox', { name: /Médico/ })).toHaveValue(MEDICO_EMERGENCIA),
    );
    esperarConsistente();
  });

  it('chamar quem outra aba já chamou só avisa (E-05/E-16)', async () => {
    const user = usuario();
    renderizarComRotas('/emergencia');
    const alvo = abertos('aguardando_atendimento')[0];
    await user.click(await screen.findByRole('button', { name: `Chamar ${alvo.numero}` }));
    const d = await dialogo(`Chamar ${alvo.numero}`);
    await within(d).findByRole('combobox', { name: /Médico/ });
    gravarComoOutraAba<Atendimento>('atendimentos', (itens) =>
      itens.map((x) =>
        x.id === alvo.id
          ? { ...x, status: 'em_atendimento', medicoId: MEDICO_EMERGENCIA, versao: x.versao + 1 }
          : x,
      ),
    );
    await user.click(within(d).getByRole('button', { name: 'Chamar' }));
    expect(await toast(/mudou de situação|não disponível/)).toBeInTheDocument();
    expect(
      repoAtendimentos.obter(alvo.id)!.eventos.filter((e) => e.tipo === 'chamado'),
    ).toHaveLength(0);
  });

  it('anuncia só vermelho ou laranja novo vindo de outra aba', async () => {
    renderizarComRotas('/emergencia');
    await screen.findByRole('region', { name: /^Aguardando atendimento/ });
    const status = screen
      .getAllByRole('status')
      .find((x) => x.getAttribute('aria-live') === 'polite' && x.classList.contains('sr-only'))!;
    expect(status).toHaveTextContent('');
    const base = abertos('aguardando_triagem')[0];
    gravarComoOutraAba<Atendimento>('atendimentos', (itens) => [
      ...itens,
      {
        ...base,
        id: 'ate-outra-aba',
        numero: 'E-0099',
        risco: 'laranja',
        prazo: agoraIso(),
        status: 'aguardando_atendimento',
        pacienteId: undefined,
        provisorio: { descricao: 'Mulher, jaqueta verde', sexo: 'feminino' },
      },
    ]);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'medicore:atendimentos:v1' }));
    });
    await waitFor(() => expect(status).toHaveTextContent('Novo paciente na fila: laranja, E-0099'));
  });

  it('o prazo estoura com a tela aberta: a faixa aparece sem recarregar', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-11-10T10:30:00-03:00'));
    const p = pacienteLivre();
    const a = await registrarChegada({
      pacienteId: p.id,
      modoChegada: 'meios_proprios',
      queixa: 'Febre',
      chegadaEm: agoraIso(),
    });
    await triar(a.id, { risco: 'laranja', profissional: 'Enf. Teste', sinais: {} }, 1);
    renderizarComRotas('/emergencia');
    const linha = (await screen.findByText(new RegExp(p.nomeSocial ?? p.nome))).closest('li')!;
    expect(within(linha).queryByText(/Acima do prazo/)).toBeNull();
    // Garante que os efeitos (o `setInterval` do relógio) já rodaram antes de avançar o tempo;
    // sob carga, o texto pode aparecer antes dos efeitos.
    await act(async () => {});
    act(() => {
      vi.advanceTimersByTime(12 * 60_000);
    });
    expect(await within(linha).findByText('Acima do prazo (+2 min)')).toBeInTheDocument();
  });
});

describe('Registrar chegada (18.3)', { timeout: 30_000 }, () => {
  it('identificada: vai para a triagem', async () => {
    const user = usuario();
    const p = pacienteLivre();
    const { router } = renderizarComRotas('/emergencia/chegada');
    await escolherPaciente(user, p.nome);
    await user.click(screen.getByRole('button', { name: 'Dor torácica' }));
    await user.click(screen.getByRole('button', { name: 'Registrar chegada' }));
    expect(await toast(/Chegada registrada: E-/)).toBeInTheDocument();
    const a = repoAtendimentos
      .todos()
      .find((x) => x.pacienteId === p.id && x.status !== 'encerrado')!;
    expect(a).toMatchObject({ status: 'aguardando_triagem', queixa: 'Dor torácica' });
    await waitFor(() => expect(router.state.location.pathname).toBe(`/emergencia/${a.id}/triagem`));
    esperarConsistente();
  });

  it('sem identificação: descrição, sexo e idade aproximada', async () => {
    const user = usuario();
    renderizarComRotas('/emergencia/chegada');
    await user.click(await screen.findByRole('radio', { name: 'Sem identificação' }));
    await user.click(screen.getByRole('button', { name: 'Registrar chegada' }));
    expect(await screen.findByRole('textbox', { name: /Descrição/ })).toHaveAccessibleDescription(
      /.+/,
    );
    await user.type(screen.getByRole('textbox', { name: /Descrição/ }), 'Homem, boné vermelho');
    await user.selectOptions(screen.getByRole('combobox', { name: /Sexo/ }), 'masculino');
    await user.type(screen.getByRole('textbox', { name: /Idade aproximada/ }), '35');
    await user.type(screen.getByRole('textbox', { name: /Queixa principal/ }), 'Trauma no braço');
    await user.click(screen.getByRole('button', { name: 'Registrar chegada' }));
    expect(await toast(/Chegada registrada/)).toBeInTheDocument();
    expect(
      repoAtendimentos.todos().find((x) => x.provisorio?.descricao === 'Homem, boné vermelho'),
    ).toMatchObject({ provisorio: { sexo: 'masculino', idadeAproximada: 35 } });
    esperarConsistente();
  });

  it('emergência imediata: confirmação e volta para a fila já em vermelho', async () => {
    const user = usuario();
    const p = pacienteLivre();
    const { router } = renderizarComRotas(`/emergencia/chegada?pacienteId=${p.id}`);
    expect(await screen.findByRole('combobox', { name: /Paciente/ })).toHaveValue(
      p.nomeSocial ?? p.nome,
    );
    await user.type(screen.getByRole('textbox', { name: /Queixa principal/ }), 'Parada');
    await user.click(screen.getByRole('checkbox', { name: /Emergência imediata/ }));
    await user.click(screen.getByRole('button', { name: 'Registrar chegada' }));
    const c = await alerta('Emergência imediata?');
    await user.click(within(c).getByRole('button', { name: 'Confirmar' }));
    expect(await toast(/Chegada registrada/)).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/emergencia'));
    expect(
      repoAtendimentos.todos().find((x) => x.pacienteId === p.id && x.status !== 'encerrado'),
    ).toMatchObject({ status: 'aguardando_atendimento', risco: 'vermelho' });
    esperarConsistente();
  });

  it('E-14: paciente internado mostra o aviso com link e não deixa registrar', async () => {
    const id = repoInternacoes.todos().find((i) => i.status === 'ativa')!.pacienteId;
    renderizarComRotas(`/emergencia/chegada?pacienteId=${id}`);
    expect(await screen.findByText(/está internado no leito/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/leitos\/internacoes\//),
    );
    expect(screen.getByRole('button', { name: 'Registrar chegada' })).toBeDisabled();
  });
});

describe('Triagem (18.4)', { timeout: 30_000 }, () => {
  const novaChegada = async (pular = 0) => {
    const p = pacienteLivre({ pular });
    return registrarChegada({
      pacienteId: p.id,
      modoChegada: 'ambulancia',
      queixa: 'Falta de ar',
      chegadaEm: agoraIso(),
    });
  };

  it('triagem com sinais: prazo previsto, aviso e volta para a fila', async () => {
    const user = usuario();
    const a = await novaChegada();
    const { router } = renderizarComRotas(`/emergencia/${a.id}/triagem`);
    expect(await screen.findByText(/não um diagnóstico/)).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /Frequência cardíaca/ }), '118');
    await user.type(screen.getByRole('textbox', { name: /Saturação de O₂/ }), '89');
    expect(await screen.findByText(/Atenção: abaixo de/)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /^Laranja/ }));
    expect(screen.getByText('Prazo para o atendimento médico: até 10:40')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Registrar triagem' }));
    expect(await toast('Triagem registrada: laranja (até 10:40)')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/emergencia'));
    expect(repoAtendimentos.obter(a.id)).toMatchObject({
      status: 'aguardando_atendimento',
      risco: 'laranja',
      triagens: [expect.objectContaining({ sinais: { fc: 118, spo2: 89 } })],
    });
    esperarConsistente();
  });

  it('sem sinais pede confirmação', async () => {
    const user = usuario();
    const a = await novaChegada();
    renderizarComRotas(`/emergencia/${a.id}/triagem`);
    await user.click(await screen.findByRole('radio', { name: /^Verde/ }));
    await user.click(screen.getByRole('button', { name: 'Registrar triagem' }));
    const c = await alerta('Classificar sem sinais vitais?');
    await user.click(within(c).getByRole('button', { name: 'Classificar' }));
    expect(await toast(/Triagem registrada: verde/)).toBeInTheDocument();
  });

  it('retriagem: mostra a anterior; menos grave exige justificativa; mais grave adianta', async () => {
    const user = usuario();
    const a = await novaChegada();
    await triar(a.id, { risco: 'amarelo', profissional: 'Enf. Ana', sinais: { fc: 90 } }, 1);
    renderizarComRotas(`/emergencia/${a.id}/triagem`);
    expect(await screen.findByRole('heading', { name: /^Retriagem/ })).toBeInTheDocument();
    expect(screen.getByText(/Amarelo às 10:30, por Enf. Ana/)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /^Verde/ }));
    expect(
      screen.getByRole('textbox', { name: /Justificativa da reclassificação/ }),
    ).toBeInTheDocument();
    // O prazo não é adiado ao ficar menos grave.
    expect(screen.getByText('Prazo para o atendimento médico: até 11:30')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /^Vermelho/ }));
    expect(screen.queryByRole('textbox', { name: /Justificativa/ })).toBeNull();
    expect(screen.getByText('Prazo para o atendimento médico: até 10:30')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Registrar triagem' }));
    expect(await toast(/Triagem registrada: vermelho/)).toBeInTheDocument();
    expect(repoAtendimentos.obter(a.id)!.risco).toBe('vermelho');
    esperarConsistente();
  });

  it('retriagem menos grave sem justificativa mostra o erro no campo', async () => {
    const user = usuario();
    const a = await novaChegada();
    await triar(a.id, { risco: 'laranja', profissional: 'Enf. Ana', sinais: { fc: 90 } }, 1);
    renderizarComRotas(`/emergencia/${a.id}/triagem`);
    await user.type(await screen.findByRole('textbox', { name: /Frequência cardíaca/ }), '80');
    await user.click(screen.getByRole('radio', { name: /^Azul/ }));
    await user.click(screen.getByRole('button', { name: 'Registrar triagem' }));
    expect(
      await screen.findAllByText('Explique por que a classificação ficou menos grave.'),
    ).not.toHaveLength(0);
    expect(repoAtendimentos.obter(a.id)!.risco).toBe('laranja');
  });

  it('criança: a sinalização usa a faixa etária', async () => {
    const user = usuario();
    const p = pacienteLivre({ menor: true });
    const a = await registrarChegada({
      pacienteId: p.id,
      modoChegada: 'meios_proprios',
      queixa: 'Febre',
      chegadaEm: agoraIso(),
    });
    renderizarComRotas(`/emergencia/${a.id}/triagem`);
    await user.type(await screen.findByRole('textbox', { name: /Pressão sistólica/ }), '75');
    const anos = idade(p.dataNascimento);
    const crianca = avaliarSinais({ pas: 75 }, anos).alertas[0].texto;
    expect(crianca).not.toBe(avaliarSinais({ pas: 75 }, 30).alertas[0]?.texto);
    expect(await screen.findByText(crianca)).toBeInTheDocument();
  });
});

describe('Detalhe e ações do atendimento (18.5–18.6)', { timeout: 30_000 }, () => {
  it('id inexistente: "não encontrado" (E-08)', async () => {
    renderizarComRotas('/emergencia/nao-existe');
    expect(
      await screen.findByRole('heading', { name: 'Atendimento não encontrado' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para a fila' })).toHaveAttribute(
      'href',
      '/emergencia',
    );
  });

  it('observação e retomar: o leito OBS fica com o paciente', async () => {
    const user = usuario();
    const { a } = await emAtendimento();
    renderizarComRotas(`/emergencia/${a.id}`);
    await user.click(await screen.findByRole('button', { name: 'Colocar em observação' }));
    const d = await dialogo(`Observação — ${a.numero}`);
    const radio = await within(d).findByRole('radio', { checked: true });
    await user.click(within(d).getByRole('button', { name: 'Colocar em observação' }));
    expect(await toast(/Em observação no OBS-/)).toBeInTheDocument();
    const obs = repoAtendimentos.obter(a.id)!;
    expect(obs.status).toBe('em_observacao');
    expect(radio).toBeTruthy();
    expect(await screen.findAllByText(/Em observação no OBS-/)).not.toHaveLength(0);
    await user.click(await screen.findByRole('button', { name: 'Retomar atendimento' }));
    expect(await toast(/continua no leito/)).toBeInTheDocument();
    expect(repoAtendimentos.obter(a.id)).toMatchObject({
      status: 'em_atendimento',
      leitoObservacaoId: obs.leitoObservacaoId,
    });
    esperarConsistente();
  });

  it('pedir leito (E6): o pedido aparece no mapa de leitos', async () => {
    const user = usuario();
    const { a, p } = await emAtendimento();
    const { router } = renderizarComRotas(`/emergencia/${a.id}`);
    await user.click(await screen.findByRole('button', { name: 'Pedir leito (internação)' }));
    const d = await dialogo(`Pedir leito — ${a.numero}`);
    expect(within(d).getByRole('textbox', { name: /Motivo/ })).toHaveValue('Dor abdominal');
    await user.selectOptions(within(d).getByRole('combobox', { name: /Setor desejado/ }), 'uti');
    await user.click(within(d).getByRole('button', { name: 'Pedir leito' }));
    expect(await toast(/Leito solicitado/)).toBeInTheDocument();
    const s = repoSolicitacoes.todos().find((x) => x.atendimentoId === a.id)!;
    expect(s).toMatchObject({ status: 'pendente', setorDesejado: 'uti', prioridade: 'amarelo' });
    expect(await screen.findByText('Aguardando leito', { selector: 'p, p *' })).toBeInTheDocument();
    await act(() => router.navigate('/leitos'));
    expect(await screen.findAllByText(p.nomeSocial ?? p.nome)).not.toHaveLength(0);
    esperarConsistente();
  });

  it('provisório: pedir leito oferece identificar antes (R-E9)', async () => {
    const user = usuario();
    const a = await registrarChegada({
      provisorio: { descricao: 'Mulher, vestido azul', sexo: 'feminino' },
      modoChegada: 'samu',
      queixa: 'Queda',
      chegadaEm: agoraIso(),
    });
    const t = await triar(a.id, { risco: 'verde', profissional: 'Enf.', sinais: {} }, 1);
    await chamar(a.id, MEDICO_EMERGENCIA, t.versao);
    renderizarComRotas(`/emergencia/${a.id}`);
    await user.click(await screen.findByRole('button', { name: 'Pedir leito (internação)' }));
    const d = await dialogo(`Pedir leito — ${a.numero}`);
    expect(within(d).getByText(/identifique o paciente com um cadastro/)).toBeInTheDocument();
    await user.click(within(d).getByRole('button', { name: 'Identificar paciente' }));
    const v = await dialogo(`Identificar paciente — ${a.numero}`);
    expect(within(v).getByRole('link', { name: 'Cadastrar novo paciente' })).toHaveAttribute(
      'href',
      `/pacientes/novo?voltarPara=${encodeURIComponent(`/emergencia/${a.id}`)}&sexo=feminino`,
    );
  });

  it('identificar (E7) ao voltar do cadastro novo, com o paciente já escolhido', async () => {
    const user = usuario();
    const a = await registrarChegada({
      provisorio: { descricao: 'Homem, casaco cinza', sexo: 'masculino' },
      modoChegada: 'samu',
      queixa: 'Queda',
      chegadaEm: agoraIso(),
    });
    const p = pacienteLivre();
    const { router } = renderizarComRotas(`/emergencia/${a.id}?pacienteId=${p.id}`);
    const v = await dialogo(`Identificar paciente — ${a.numero}`);
    expect(within(v).getByText(/Homem, casaco cinza/)).toBeInTheDocument();
    await waitFor(() =>
      expect(within(v).getByRole('combobox', { name: /Paciente/ })).toHaveValue(
        p.nomeSocial ?? p.nome,
      ),
    );
    await user.click(within(v).getByRole('button', { name: 'Vincular' }));
    expect(await toast(new RegExp(`${a.numero} vinculado`))).toBeInTheDocument();
    expect(repoAtendimentos.obter(a.id)!.pacienteId).toBe(p.id);
    expect(router.state.location.search).toBe('');
    esperarConsistente();
  });

  it('encerrar com alta e reabrir pelo "Desfazer" do aviso (E5, E9)', async () => {
    const user = usuario();
    const { a } = await emAtendimento();
    renderizarComRotas(`/emergencia/${a.id}`);
    await user.click(await screen.findByRole('button', { name: 'Encerrar atendimento' }));
    const d = await dialogo(`Encerrar ${a.numero}`);
    expect(within(d).queryByRole('radio', { name: /Evasão/ })).toBeNull();
    await user.click(within(d).getByRole('radio', { name: 'Alta' }));
    await user.click(within(d).getByRole('button', { name: 'Encerrar' }));
    const aviso = await toast(new RegExp(`Atendimento ${a.numero} encerrado: alta`));
    expect(repoAtendimentos.obter(a.id)!.status).toBe('encerrado');
    await user.click(
      within(aviso.closest('[role="status"], li, div')!.parentElement!).getByRole('button', {
        name: 'Desfazer',
      }),
    );
    const r = await alerta(`Reabrir ${a.numero}?`);
    await user.type(
      within(r).getByRole('textbox', { name: /Motivo da correção/ }),
      'Alta registrada por engano',
    );
    await user.click(within(r).getByRole('button', { name: 'Reabrir' }));
    expect(await toast(`Atendimento ${a.numero} reaberto`)).toBeInTheDocument();
    expect(repoAtendimentos.obter(a.id)!.status).toBe('em_atendimento');
    esperarConsistente();
  });

  it('reabrir some depois de 2 h e aparece o aviso (E-18)', async () => {
    const { a } = await emAtendimento();
    await encerrar(a.id, { tipo: 'alta', em: agoraIso() }, repoAtendimentos.obter(a.id)!.versao);
    ajustarRelogio('2026-11-10T12:31:00-03:00');
    renderizarComRotas(`/emergencia/${a.id}`);
    expect(await screen.findByText(/janela|prazo de 2 h|2 h/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reabrir atendimento' })).toBeNull();
  });

  it('óbito: segundo passo com o aviso da R-X7 e cadastro inativado', async () => {
    const user = usuario();
    const { a, p } = await emAtendimento();
    renderizarComRotas(`/emergencia/${a.id}`);
    await user.click(await screen.findByRole('button', { name: 'Encerrar atendimento' }));
    const d = await dialogo(`Encerrar ${a.numero}`);
    await user.click(within(d).getByRole('radio', { name: 'Óbito' }));
    await user.click(within(d).getByRole('button', { name: 'Encerrar' }));
    const c = await alerta(/^Registrar óbito de/);
    expect(within(c).getByText(/consultas futuras serão canceladas/)).toBeInTheDocument();
    await user.click(within(c).getByRole('button', { name: 'Registrar óbito' }));
    expect(await toast(/encerrado: óbito/)).toBeInTheDocument();
    expect(repoPacientes.obter(p.id)!.ativo).toBe(false);
    esperarConsistente();
  });

  it('evasão fica desabilitada antes de 30 min da chegada', async () => {
    const user = usuario();
    const p = pacienteLivre();
    const a = await registrarChegada({
      pacienteId: p.id,
      modoChegada: 'meios_proprios',
      queixa: 'Tontura',
      chegadaEm: agoraIso(),
    });
    renderizarComRotas(`/emergencia/${a.id}`);
    await user.click(await screen.findByRole('button', { name: 'Encerrar atendimento' }));
    const d = await dialogo(`Encerrar ${a.numero}`);
    const evasao = within(d).getByRole('radio', { name: /Evasão/ });
    expect(evasao).toBeDisabled();
    expect(evasao).toHaveAccessibleDescription('Disponível depois de 30 min da chegada.');
  });

  it('alta de quem aguarda leito cancela o pedido e libera a reserva (R-E15)', async () => {
    const user = usuario();
    const pedido = repoSolicitacoes
      .todos()
      .find((s) => s.status === 'reservada' && s.atendimentoId)!;
    const leito = pedido.leitoReservadoId!;
    renderizarComRotas(`/emergencia/${pedido.atendimentoId}`);
    expect(
      await screen.findByText(`Leito ${repoLeitos.obter(leito)!.codigo} reservado`, {
        exact: false,
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));
    const d = await dialogo(/^Encerrar E-/);
    expect(within(d).getByText(/pedido de leito será cancelado/)).toBeInTheDocument();
    await user.click(within(d).getByRole('radio', { name: 'Alta' }));
    await user.click(within(d).getByRole('button', { name: 'Encerrar' }));
    expect(await toast(/encerrado: alta/)).toBeInTheDocument();
    expect(repoSolicitacoes.obter(pedido.id)!.status).toBe('cancelada');
    expect(repoLeitos.obter(leito)!.status).toBe('livre');
    esperarConsistente();
  });

  it('sinais vitais (E10): piora sugere retriagem', async () => {
    const user = usuario();
    const { a } = await emAtendimento();
    const { router } = renderizarComRotas(`/emergencia/${a.id}`);
    await user.click(await screen.findByRole('button', { name: 'Registrar sinais vitais' }));
    const d = await dialogo(`Registrar sinais vitais — ${a.numero}`);
    await user.type(within(d).getByRole('textbox', { name: /Saturação de O₂/ }), '85');
    await user.click(within(d).getByRole('button', { name: 'Registrar' }));
    expect(await toast('Sinais vitais registrados')).toBeInTheDocument();
    const c = await alerta('Fazer retriagem');
    await user.click(within(c).getByRole('button', { name: 'Fazer retriagem' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/emergencia/${a.id}/triagem`));
    expect(repoAtendimentos.obter(a.id)!.reavaliacoes).toHaveLength(1);
    esperarConsistente();
  });
});

describe('Alertas e histórico (18.7)', { timeout: 30_000 }, () => {
  it('aba Alertas: "Sem triagem" aparece com o relógio avançando', async () => {
    const p = pacienteLivre();
    await registrarChegada({
      pacienteId: p.id,
      modoChegada: 'meios_proprios',
      queixa: 'Tosse',
      chegadaEm: agoraIso(),
    });
    ajustarRelogio('2026-11-10T10:46:00-03:00');
    renderizarComRotas('/emergencia?aba=alertas');
    expect(
      await screen.findByRole('link', { current: 'page', name: /Alertas/ }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Sem triagem há 16 min' })).toBeInTheDocument();
  });

  it('histórico: filtros de cor e desfecho na URL', async () => {
    const user = usuario();
    const { router } = renderizarComRotas('/emergencia/historico');
    const tabela = await screen.findByRole('table', { name: 'Atendimentos encerrados' });
    await waitFor(() => expect(within(tabela).getAllByRole('row').length).toBeGreaterThan(1));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Desfecho' }), 'alta');
    await waitFor(() => expect(router.state.location.search).toBe('?desfecho=alta'));
    await waitFor(() =>
      within(tabela)
        .getAllByRole('row')
        .slice(1)
        .forEach((r) => expect(r).toHaveTextContent('Alta')),
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Classificação' }), 'vermelho');
    await waitFor(() => expect(router.state.location.search).toBe('?desfecho=alta&risco=vermelho'));
  });
});
