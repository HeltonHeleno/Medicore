/**
 * 17.11 — Telas da Gestão de leitos, com os dados de exemplo e o roteador real.
 * As invariantes são conferidas no fim de cada fluxo (`esperarConsistente`).
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { repoPacientes } from '../services/colecoes';
import {
  repoAtendimentos,
  repoInternacoes,
  repoLeitos,
  repoSolicitacoes,
} from '../services/colecoes-operacoes';
import { darAlta } from '../services/leitos';
import type { Internacao, Leito } from '../types';
import { renderizarComRotas } from './utils/renderizarComRotas';
import {
  esperarConsistente,
  gravarComoOutraAba,
  leitoLivre,
  pacienteLivre,
  prepararOperacoes,
} from './utils/operacoes';
import { ajustarRelogio } from './utils/servicos';

prepararOperacoes('2026-11-10T10:30:00-03:00'); // terça-feira

const toast = async (texto: string | RegExp) =>
  within(await screen.findByRole('region', { name: 'Notificações' })).findByText(texto);
const usuario = () => userEvent.setup();
const ativa = () =>
  repoInternacoes.todos().find((i) => i.status === 'ativa' && i.precaucao === 'padrao')!;
const nomeDe = (pacienteId: string) => {
  const p = repoPacientes.obter(pacienteId)!;
  return p.nomeSocial ?? p.nome;
};

/** Escolhe um paciente no ComboboxPaciente pelo nome. */
async function escolherPaciente(user: ReturnType<typeof usuario>, nome: string) {
  await user.type(await screen.findByRole('combobox', { name: /Paciente/ }), nome);
  await user.click(await screen.findByRole('option', { name: new RegExp(nome) }));
}

describe('Mapa de leitos (17.2–17.4)', { timeout: 30_000 }, () => {
  it('resumo por setor, filtros na URL e grade por setor', async () => {
    const user = usuario();
    const { router } = renderizarComRotas('/leitos');
    const resumo = await screen.findByRole('list', { name: 'Resumo dos leitos' });
    expect(
      within(resumo).getByRole('link', { name: /UTI\s*22\s*\/30 \(73%\)/ }),
    ).toBeInTheDocument();
    expect(
      within(resumo).getByRole('link', { name: /Enfermaria\s*50\s*\/69 \(72%\)/ }),
    ).toBeInTheDocument();
    expect(within(resumo).getByRole('link', { name: /Livres\s*29/ })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'UTI — 22 de 30 ocupados' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Observação/ })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Setor' }), 'uti');
    await waitFor(() => expect(router.state.location.search).toBe('?setor=uti'));
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Enfermaria/ })).toBeNull());
    await user.selectOptions(screen.getByRole('combobox', { name: 'Situação' }), 'livre');
    await waitFor(() => expect(router.state.location.search).toBe('?setor=uti&situacao=livre'));
    const links = await screen.findAllByRole('link', { name: /^UTI-\d+, Livre$/ });
    expect(links.length).toBe(
      repoLeitos.todos().filter((l) => l.setorId === 'uti' && l.status === 'livre').length,
    );
  });

  it('busca de paciente: destaca o leito e move o foco; sem internação, avisa', async () => {
    const user = usuario();
    const i = ativa();
    const codigo = repoLeitos.obter(i.leitoId)!.codigo;
    renderizarComRotas('/leitos');
    const busca = await screen
      .findByRole('searchbox', { name: 'Buscar paciente no mapa' })
      .catch(() => screen.getByLabelText('Buscar paciente no mapa'));
    await user.type(busca, nomeDe(i.pacienteId));
    expect(
      await screen.findByText(/leito encontrado e destacado|leitos encontrados/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toHaveAccessibleName(new RegExp(`^${codigo}, Ocupado`)),
    );

    const livre = pacienteLivre();
    await user.clear(busca);
    await user.type(busca, livre.nome);
    expect(
      await screen.findByText(`"${livre.nome}" não está internado em nenhum leito.`),
    ).toBeInTheDocument();
  });

  it('concluir higienização e desfazer (10 s); o leito volta com o mesmo "desde"', async () => {
    const user = usuario();
    const l = repoLeitos.todos().find((x) => x.status === 'higienizacao')!;
    renderizarComRotas('/leitos');
    await user.click(
      await screen.findByRole('button', { name: `Concluir higienização do leito ${l.codigo}` }),
    );
    expect(await toast('1 leito liberado')).toBeInTheDocument();
    expect(repoLeitos.obter(l.id)!.status).toBe('livre');
    esperarConsistente();
    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(() =>
      expect(repoLeitos.obter(l.id)).toMatchObject({ status: 'higienizacao', desde: l.desde }),
    );
    esperarConsistente();
  });

  it('E-16: concluir um leito que outra aba já liberou só avisa; nada muda em dobro', async () => {
    const user = usuario();
    const l = repoLeitos.todos().find((x) => x.status === 'higienizacao')!;
    renderizarComRotas('/leitos');
    const botao = await screen.findByRole('button', {
      name: `Concluir higienização do leito ${l.codigo}`,
    });
    gravarComoOutraAba<Leito>('leitos', (itens) =>
      itens.map((x) =>
        x.id === l.id
          ? { ...x, status: 'livre', higienizacao: undefined, versao: x.versao + 1 }
          : x,
      ),
    );
    await user.click(botao);
    expect(await toast(/1 leito mudou de situação e foi ignorado/)).toBeInTheDocument();
    esperarConsistente();
  });

  it('menu do cartão: cancelar a reserva e transferir pelo mapa', async () => {
    const user = usuario();
    const reservado = repoLeitos.todos().find((x) => x.status === 'reservado')!;
    renderizarComRotas('/leitos');
    await user.click(
      await screen.findByRole('button', { name: `Mais ações para ${reservado.codigo}` }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Cancelar reserva' }));
    const confirmar = await screen.findByRole('alertdialog', {
      name: `Cancelar a reserva do leito ${reservado.codigo}?`,
    });
    await user.click(within(confirmar).getByRole('button', { name: 'Cancelar reserva' }));
    expect(await toast('Reserva cancelada. O leito voltou a ficar livre.')).toBeInTheDocument();
    expect(repoLeitos.obter(reservado.id)!.status).toBe('livre');
    esperarConsistente();

    const i = ativa();
    const codigo = repoLeitos.obter(i.leitoId)!.codigo;
    await user.click(screen.getByRole('button', { name: `Mais ações para ${codigo}` }));
    await user.click(await screen.findByRole('menuitem', { name: 'Transferir' }));
    expect(await screen.findByRole('dialog', { name: /^Transferir/ })).toBeInTheDocument();
  });

  it('concluir todas do setor pula o leito que outra aba bloqueou', async () => {
    const user = usuario();
    const doSetor = repoLeitos
      .todos()
      .filter((x) => x.setorId === 'enfermaria' && x.status === 'higienizacao');
    expect(doSetor.length).toBeGreaterThan(1);
    renderizarComRotas('/leitos?setor=enfermaria');
    await user.click(await screen.findByRole('button', { name: /Concluir todas do setor/ }));
    const dialogo = await screen
      .findByRole('dialog', { name: /Concluir a higienização/ })
      .catch(() => screen.getByRole('alertdialog', { name: /Concluir a higienização/ }));
    // Outra aba bloqueia um dos leitos antes da confirmação.
    gravarComoOutraAba<Leito>('leitos', (itens) =>
      itens.map((x) =>
        x.id === doSetor[0].id
          ? {
              ...x,
              status: 'bloqueado',
              versao: x.versao + 1,
              bloqueio: { motivo: 'Manutenção', em: x.desde, autor: 'x' },
            }
          : x,
      ),
    );
    await user.click(within(dialogo).getByRole('button', { name: 'Concluir' }));
    expect(await toast(/1 leito mudou de situação e foi ignorado/)).toBeInTheDocument();
    expect(repoLeitos.obter(doSetor[1].id)!.status).toBe('livre');
    esperarConsistente();
  });

  it('pedido eletivo (L9), reservar (L6) e cancelar o pedido', async () => {
    const user = usuario();
    const livre = pacienteLivre();
    renderizarComRotas('/leitos');
    await user.click(await screen.findByRole('button', { name: 'Nova solicitação' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Pedir leito (internação eletiva)' });
    await user.type(within(dialogo).getByRole('combobox', { name: /Paciente/ }), livre.nome);
    await user.click(await screen.findByRole('option', { name: new RegExp(livre.nome) }));
    await user.selectOptions(
      within(dialogo).getByRole('combobox', { name: /Setor desejado/ }),
      'enfermaria',
    );
    await user.type(
      within(dialogo).getByRole('textbox', { name: /Motivo da internação/ }),
      'Cirurgia programada',
    );
    await user.click(within(dialogo).getByRole('button', { name: 'Pedir leito' }));
    expect(
      await toast(`Pedido de leito registrado para ${livre.nomeSocial ?? livre.nome}`),
    ).toBeInTheDocument();
    const pedido = repoSolicitacoes
      .todos()
      .find((s) => s.pacienteId === livre.id && s.status === 'pendente')!;
    expect(pedido).toMatchObject({
      origem: 'eletiva',
      prioridade: 'verde',
      setorDesejado: 'enfermaria',
    });

    const painel = screen.getByRole('region', { name: /Pedidos de leito/ });
    const item = (await within(painel).findByText(livre.nomeSocial ?? livre.nome)).closest('li')!;
    await user.click(within(item).getByRole('button', { name: 'Reservar' }));
    const reservar = await screen.findByRole('dialog', { name: /Reservar leito para/ });
    const sugerido = within(reservar).getAllByRole('radio')[0];
    await user.click(sugerido);
    await user.click(within(reservar).getByRole('button', { name: 'Reservar' }));
    expect(await toast(/Leito ENF-.* reservado/)).toBeInTheDocument();
    expect(repoSolicitacoes.obter(pedido.id)!.status).toBe('reservada');
    esperarConsistente();

    const item2 = (await within(painel).findByText(livre.nomeSocial ?? livre.nome)).closest('li')!;
    await user.click(within(item2).getByRole('button', { name: /Ações do pedido/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Cancelar pedido' }));
    const cancelar = await screen.findByRole('alertdialog', { name: /Cancelar o pedido de leito/ });
    await user.type(
      within(cancelar).getByRole('textbox', { name: /Motivo do cancelamento/ }),
      'Paciente desistiu',
    );
    await user.click(within(cancelar).getByRole('button', { name: 'Cancelar pedido' }));
    expect(await toast('Pedido de leito cancelado')).toBeInTheDocument();
    expect(repoSolicitacoes.obter(pedido.id)!.status).toBe('cancelada');
    esperarConsistente();
  });
});

describe('Internar (17.5)', { timeout: 30_000 }, () => {
  async function preencherBasico(user: ReturnType<typeof usuario>) {
    await user.selectOptions(
      screen.getByRole('combobox', { name: /Médico responsável/ }),
      'med-helena-duarte',
    );
    await user.type(
      screen.getByRole('textbox', { name: /Motivo da internação/ }),
      'Pneumonia comunitária',
    );
  }

  it('eletiva: sugerido marcado por teclado, grava e vai para o detalhe', async () => {
    const user = usuario();
    const livre = pacienteLivre();
    const { router } = renderizarComRotas('/leitos/internar');
    await screen.findByRole('heading', { name: 'Internar paciente', level: 1 });
    await escolherPaciente(user, livre.nome);
    const grupo = await screen.findByRole('radiogroup', { name: /Leito/ });
    const sugerido = within(grupo).getAllByRole('radio')[0];
    expect(sugerido).toHaveAccessibleName(/Sugerido/);
    sugerido.focus();
    await user.keyboard(' ');
    expect(sugerido).toHaveAttribute('aria-checked', 'true');
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /Médico responsável/ })).toContainElement(
        screen.getByRole('option', { name: /Helena Duarte/ }),
      ),
    );
    await preencherBasico(user);
    await user.click(screen.getByRole('button', { name: 'Internar' }));
    expect(await toast(/internado\(a\) no leito/)).toBeInTheDocument();
    const nova = repoInternacoes
      .todos()
      .find((i) => i.pacienteId === livre.id && i.status === 'ativa')!;
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/leitos/internacoes/${nova.id}`),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: /Internação de/ }),
    ).toBeInTheDocument();
    esperarConsistente();
  });

  it('transferência externa sem hospital e exceção de perfil sem justificativa dão erro', async () => {
    const user = usuario();
    const livre = pacienteLivre();
    renderizarComRotas('/leitos/internar');
    await escolherPaciente(user, livre.nome);
    await user.click(screen.getByRole('radio', { name: 'Transferência de outro hospital' }));
    await user.click(screen.getByRole('checkbox', { name: /Usar mesmo assim/ }));
    const pediatrico = (await screen.findAllByRole('radio', { name: /Exceção/ }))[0];
    await user.click(pediatrico);
    await preencherBasico(user);
    await user.click(screen.getByRole('button', { name: 'Internar' }));
    const resumo = await screen
      .findByRole('alert', { name: /campos? precisa/ })
      .catch(() => screen.findByText(/campos precisam de correção|campo precisa de correção/));
    expect(resumo).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Hospital de origem/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByRole('textbox', { name: /Justificativa da exceção/ })).toBeInTheDocument();
    expect(repoInternacoes.todos().some((i) => i.pacienteId === livre.id)).toBe(false);
  });

  it('E-11: outra aba ocupa o leito antes de salvar — escolha limpa, nada gravado', async () => {
    const user = usuario();
    const livre = pacienteLivre();
    const alvo = leitoLivre('enfermaria');
    renderizarComRotas(`/leitos/internar?pacienteId=${livre.id}&leitoId=${alvo.id}`);
    const radio = await screen.findByRole('radio', { name: new RegExp(`^${alvo.codigo},`) });
    await waitFor(() => expect(radio).toHaveAttribute('aria-checked', 'true'));
    await preencherBasico(user);
    gravarComoOutraAba<Leito>('leitos', (itens) =>
      itens.map((x) =>
        x.id === alvo.id
          ? {
              ...x,
              status: 'bloqueado',
              versao: x.versao + 1,
              bloqueio: { motivo: 'Outra aba', em: x.desde, autor: 'x' },
            }
          : x,
      ),
    );
    const antes = repoInternacoes.todos().length;
    await user.click(screen.getByRole('button', { name: 'Internar' }));
    expect((await screen.findAllByText(/Este leito acabou de ser ocupado/)).length).toBeGreaterThan(
      0,
    );
    expect(repoInternacoes.todos().length).toBe(antes);
    await waitFor(() =>
      expect(screen.queryByRole('radio', { name: new RegExp(`^${alvo.codigo},`) })).toBeNull(),
    );
    esperarConsistente();
  });

  it('R-X1: paciente em atendimento mostra o aviso e não deixa internar avulso', async () => {
    const user = usuario();
    const at = repoAtendimentos
      .todos()
      .find((a) => a.status === 'em_atendimento' && a.pacienteId && !a.solicitacaoId)!;
    renderizarComRotas(`/leitos/internar?pacienteId=${at.pacienteId}`);
    expect(
      await screen.findByText(new RegExp(`em atendimento na emergência \\(${at.numero}\\)`)),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      `/emergencia/${at.id}`,
    );
    expect(screen.getByRole('button', { name: 'Internar' })).toBeDisabled();
    void user;
  });

  it('pelo pedido da emergência (L6): encerra o atendimento por internação', async () => {
    const user = usuario();
    const pedido = repoSolicitacoes
      .todos()
      .find((s) => s.status === 'reservada' && s.atendimentoId)!;
    renderizarComRotas(`/leitos/internar?solicitacaoId=${pedido.id}`);
    expect(await screen.findByText(/Pelo pedido de leito: Emergência E-/)).toBeInTheDocument();
    const reservado = await screen.findByRole('radio', {
      name: new RegExp(`^${repoLeitos.obter(pedido.leitoReservadoId!)!.codigo},`),
    });
    await waitFor(() => expect(reservado).toHaveAttribute('aria-checked', 'true'));
    if (
      !(screen.getByRole('combobox', { name: /Médico responsável/ }) as HTMLSelectElement).value
    ) {
      await user.selectOptions(
        screen.getByRole('combobox', { name: /Médico responsável/ }),
        'med-helena-duarte',
      );
    }
    await user.click(screen.getByRole('button', { name: 'Internar' }));
    expect(await toast(/internado\(a\) no leito/)).toBeInTheDocument();
    expect(repoSolicitacoes.obter(pedido.id)!.status).toBe('atendida');
    expect(repoAtendimentos.obter(pedido.atendimentoId!)).toMatchObject({
      status: 'encerrado',
      desfecho: { tipo: 'internacao' },
    });
    esperarConsistente();
  });
});

describe('Internações e detalhe (17.6–17.9)', { timeout: 30_000 }, () => {
  it('lista: filtro de alta prevista vencida e aba de encerradas', async () => {
    const user = usuario();
    const { router } = renderizarComRotas('/leitos/internacoes');
    const tabela = await screen.findByRole('table', { name: 'Internações' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Alta prevista' }), 'vencida');
    await waitFor(() => expect(router.state.location.search).toBe('?alta=vencida'));
    await waitFor(() => expect(within(tabela).getAllByRole('row')).toHaveLength(1 + 2));
    expect(within(tabela).getAllByText('Vencida')).toHaveLength(2);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Situação' }), 'encerrada');
    await waitFor(() => expect(router.state.location.search).toBe('?situacao=encerrada'));
    expect(await screen.findByRole('columnheader', { name: 'Alta' })).toBeInTheDocument();
  });

  it('transferir: escolhe o destino, grava o evento e a origem vai para higienização', async () => {
    const user = usuario();
    const i = ativa();
    const origem = repoLeitos.obter(i.leitoId)!;
    renderizarComRotas(`/leitos/internacoes/${i.id}`);
    await user.click(await screen.findByRole('button', { name: 'Transferir' }));
    const dialogo = await screen.findByRole('dialog', { name: /^Transferir/ });
    await user.click((await within(dialogo).findAllByRole('radio'))[0]);
    await user.click(within(dialogo).getByRole('button', { name: 'Piora clínica (UTI)' }));
    await user.click(within(dialogo).getByRole('button', { name: 'Transferir' }));
    expect(await toast(new RegExp(`Transferido de ${origem.codigo} para`))).toBeInTheDocument();
    expect(repoLeitos.obter(origem.id)!.status).toBe('higienizacao');
    expect(await screen.findByText('Transferência')).toBeInTheDocument();
    esperarConsistente();
  });

  it('alta → higienização; desfazer dentro da janela; depois de 6 h, só "Internar novamente"', async () => {
    const user = usuario();
    const i = ativa();
    renderizarComRotas(`/leitos/internacoes/${i.id}`);
    await user.click(await screen.findByRole('button', { name: 'Dar alta' }));
    const dialogo = await screen.findByRole('dialog', { name: /^Dar alta a/ });
    await user.click(within(dialogo).getByRole('button', { name: 'Registrar alta' }));
    expect(await toast(/Alta registrada\. Leito .* em higienização/)).toBeInTheDocument();
    expect(repoLeitos.obter(i.leitoId)!.status).toBe('higienizacao');
    expect(await screen.findByText(/A alta pode ser desfeita até/)).toBeInTheDocument();
    esperarConsistente();

    await user.click(screen.getByRole('button', { name: 'Desfazer alta' }));
    const desfazer = await screen.findByRole('alertdialog', { name: /Desfazer a alta/ });
    await user.type(
      within(desfazer).getByRole('textbox', { name: /Motivo da correção/ }),
      'Alta no paciente errado',
    );
    await user.click(within(desfazer).getByRole('button', { name: 'Desfazer alta' }));
    expect(await toast('Alta desfeita. O paciente voltou ao leito.')).toBeInTheDocument();
    expect(repoInternacoes.obter(i.id)!.status).toBe('ativa');
    esperarConsistente();
  });

  it('janela vencida (E-18): o botão some, o aviso explica e "Internar novamente" copia os dados', async () => {
    const user = usuario();
    const i = ativa();
    await darAlta(i.id, { tipo: 'melhorada', em: new Date().toISOString() }, i.versao);
    ajustarRelogio('2026-11-10T17:00:00-03:00');
    const { router } = renderizarComRotas(`/leitos/internacoes/${i.id}`);
    expect(
      await screen.findByText(/Não é mais possível desfazer: o prazo de 6 h terminou/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desfazer alta' })).toBeNull();
    await user.click(screen.getByRole('link', { name: 'Internar novamente' }));
    await waitFor(() => expect(router.state.location.search).toBe(`?deInternacao=${i.id}`));
    expect(await screen.findByText(/Dados copiados da internação anterior/)).toBeInTheDocument();
  });

  it('alta por óbito pede a segunda confirmação e aplica a R-X7', async () => {
    const user = usuario();
    const i = ativa();
    renderizarComRotas(`/leitos/internacoes/${i.id}`);
    await user.click(await screen.findByRole('button', { name: 'Dar alta' }));
    const dialogo = await screen.findByRole('dialog', { name: /^Dar alta a/ });
    await user.click(within(dialogo).getByRole('radio', { name: 'Óbito' }));
    await user.click(within(dialogo).getByRole('button', { name: 'Registrar alta' }));
    const confirmacao = await screen.findByRole('alertdialog', { name: /Registrar óbito de/ });
    expect(confirmacao).toHaveTextContent(/cadastro do paciente será inativado/);
    await user.click(within(confirmacao).getByRole('button', { name: 'Registrar óbito' }));
    expect(await toast(/Alta registrada/)).toBeInTheDocument();
    expect(repoPacientes.obter(i.pacienteId)!.ativo).toBe(false);
    esperarConsistente();
  });

  it('editar: um evento por campo alterado; E-05 quando outra aba grava antes', async () => {
    const user = usuario();
    const i = ativa();
    const { router } = renderizarComRotas(`/leitos/internacoes/${i.id}/editar`);
    const motivo = await screen.findByRole('textbox', { name: /Motivo da internação/ });
    await user.clear(motivo);
    await user.type(motivo, 'Pneumonia com derrame pleural');
    gravarComoOutraAba<Internacao>('internacoes', (itens) =>
      itens.map((x) => (x.id === i.id ? { ...x, versao: x.versao + 1 } : x)),
    );
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    const aviso = await screen
      .findByRole('alertdialog', { name: /alterada em outra aba/ })
      .catch(() => screen.findByRole('dialog', { name: /alterada em outra aba/ }));
    await user.click(within(aviso).getByRole('button', { name: 'Continuar editando' }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await toast('Internação atualizada')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe(`/leitos/internacoes/${i.id}`));
    expect(repoInternacoes.obter(i.id)!.eventos.at(-1)).toMatchObject({ tipo: 'motivo_alterado' });
    esperarConsistente();
  });

  it('id inexistente mostra "não encontrada" com o caminho de volta (E-08)', async () => {
    renderizarComRotas('/leitos/internacoes/nao-existe');
    expect(
      await screen.findByRole('heading', { name: 'Internação não encontrada' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para as internações' })).toHaveAttribute(
      'href',
      '/leitos/internacoes',
    );
  });
});

describe('Detalhe do leito (17.10)', { timeout: 30_000 }, () => {
  it('bloquear (só livre ou em higienização) e desbloquear', async () => {
    const user = usuario();
    const l = leitoLivre('apartamento');
    renderizarComRotas(`/leitos/${l.id}`);
    expect(
      await screen.findByRole('heading', { level: 1, name: `Leito ${l.codigo}` }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bloquear' }));
    const dialogo = await screen.findByRole('dialog', { name: `Bloquear o leito ${l.codigo}` });
    await user.click(within(dialogo).getByRole('button', { name: 'Manutenção' }));
    await user.click(within(dialogo).getByRole('button', { name: 'Bloquear' }));
    expect(await toast(`Leito ${l.codigo} bloqueado`)).toBeInTheDocument();
    expect(repoLeitos.obter(l.id)!.status).toBe('bloqueado');
    await user.click(await screen.findByRole('button', { name: 'Desbloquear' }));
    const confirmar = await screen
      .findByRole('alertdialog', { name: `Desbloquear o leito ${l.codigo}?` })
      .catch(() => screen.findByRole('dialog', { name: `Desbloquear o leito ${l.codigo}?` }));
    await user.click(within(confirmar).getByRole('button', { name: 'Desbloquear' }));
    expect(await toast(`Leito ${l.codigo} liberado`)).toBeInTheDocument();
    expect(repoLeitos.obter(l.id)!.status).toBe('livre');
    esperarConsistente();
  });

  it('ocupado mostra o ocupante e o histórico de 30 dias; sem botão de bloquear', async () => {
    const i = ativa();
    const l = repoLeitos.obter(i.leitoId)!;
    renderizarComRotas(`/leitos/${l.id}`);
    expect((await screen.findAllByRole('link', { name: nomeDe(i.pacienteId) }))[0]).toHaveAttribute(
      'href',
      `/leitos/internacoes/${i.id}`,
    );
    expect(screen.queryByRole('button', { name: 'Bloquear' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Transferir' })).toBeInTheDocument();
    const historico = screen
      .getByRole('heading', { name: 'Ocupação nos últimos 30 dias' })
      .closest('section, div')!;
    expect(within(historico as HTMLElement).getAllByRole('listitem').length).toBeGreaterThan(0);
  });
});
