import { repoAtividades, repoMedicos } from '../services/colecoes';
import {
  repoAtendimentos,
  repoInternacoes,
  repoLeitos,
  repoSolicitacoes,
} from '../services/colecoes-operacoes';
import { ErroConcorrencia, ErroConflito, ErroValidacao } from '../services/erros';
import {
  avaliarParaPaciente,
  bloquear,
  buscarPacienteNoMapa,
  cancelarReserva,
  cancelarSolicitacao,
  concluirHigienizacao,
  consultasDuranteInternacao,
  darAlta,
  desbloquear,
  desfazerAlta,
  editarInternacao,
  internar,
  listarInternacoes,
  listarLeitos,
  listarSolicitacoes,
  obterInternacao,
  obterLeito,
  reservarLeito,
  reverterHigienizacao,
  solicitarLeitoEletivo,
  transferir,
  medicosResponsaveis,
} from '../services/leitos';
import { agendarConsulta } from '../services/consultas';
import type { EntradaInternacao } from '../schemas/internacao';
import type { Internacao } from '../types';
import {
  agoraIso,
  esperarConsistente,
  gravarComoOutraAba,
  leitoLivre,
  leitoPorCodigo,
  medicoClinico,
  MEDICO_INATIVO,
  pacienteLivre,
  prepararOperacoes,
} from './utils/operacoes';
import { ajustarRelogio, erroDe } from './utils/servicos';

prepararOperacoes('2026-11-10T10:30:00-03:00'); // terça-feira

const entradaInternacao = (extra: Partial<EntradaInternacao> = {}): EntradaInternacao => ({
  pacienteId: pacienteLivre().id,
  origem: 'eletiva',
  precaucao: 'padrao',
  leitoId: leitoLivre('enfermaria', { isolamento: false }).id,
  medicoResponsavelId: medicoClinico().id,
  motivo: 'Pneumonia comunitária',
  inicio: agoraIso(),
  ...extra,
});

const internacaoAtivaQualquer = (): Internacao =>
  repoInternacoes
    .todos()
    .filter((i) => i.status === 'ativa' && i.precaucao === 'padrao')
    .sort((a, b) => a.id.localeCompare(b.id))[0];

/** Atendimento aguardando leito com reserva (UTI-12) e o outro, pendente e em observação. */
const aguardandoLeito = (reservado: boolean) =>
  repoAtendimentos.todos().find((a) => {
    if (a.status !== 'aguardando_leito') return false;
    const s = repoSolicitacoes.obter(a.solicitacaoId!);
    return reservado ? s?.status === 'reservada' : s?.status === 'pendente';
  })!;

describe('L1 — internar (eletiva ou transferência externa)', () => {
  it('grava a internação, ocupa o leito e registra a atividade', async () => {
    const e = entradaInternacao({ previsaoAlta: '2026-11-15' });
    const int = await internar(e);
    expect(int).toMatchObject({
      status: 'ativa',
      origem: 'eletiva',
      leitoId: e.leitoId,
      versao: 1,
    });
    expect(int.eventos).toEqual([
      expect.objectContaining({
        tipo: 'internada',
        autor: 'Usuário de demonstração',
        para: leitoPorCodigo(repoLeitos.obter(e.leitoId)!.codigo).codigo,
      }),
    ]);
    expect(repoLeitos.obter(e.leitoId)).toMatchObject({ status: 'ocupado', internacaoId: int.id });
    expect(
      repoAtividades
        .todos()
        .some((a) => a.tipo === 'paciente_internado' && a.referenciaId === int.id),
    ).toBe(true);
    esperarConsistente();
  });

  it('transferência externa exige o hospital de origem (M25)', async () => {
    const erro = await erroDe(internar(entradaInternacao({ origem: 'transferencia_externa' })));
    expect(erro).toBeInstanceOf(ErroValidacao);
    expect((erro as unknown as ErroValidacao).campos.hospitalOrigem).toBeDefined();
    const int = await internar(
      entradaInternacao({ origem: 'transferencia_externa', hospitalOrigem: 'Santa Casa' }),
    );
    expect(int.hospitalOrigem).toBe('Santa Casa');
  });

  it('R-L1 / E-14: paciente já internado', async () => {
    const atual = internacaoAtivaQualquer();
    const erro = await erroDe(internar(entradaInternacao({ pacienteId: atual.pacienteId })));
    expect(erro).toMatchObject({ codigo: 'paciente_internado', campo: 'pacienteId' });
  });

  it('R-X1 / E-14: paciente em atendimento só pelo pedido do próprio atendimento', async () => {
    const a = repoAtendimentos.todos().find((x) => x.status === 'em_atendimento' && x.pacienteId)!;
    const erro = await erroDe(internar(entradaInternacao({ pacienteId: a.pacienteId })));
    expect(erro).toMatchObject({ codigo: 'paciente_em_atendimento' });
  });

  it('R-L2 / E-11: leito ocupado ou reservado para outro pedido', async () => {
    const ocupado = repoLeitos
      .todos()
      .find((l) => l.status === 'ocupado' && l.setorId === 'enfermaria')!;
    expect(await erroDe(internar(entradaInternacao({ leitoId: ocupado.id })))).toMatchObject({
      codigo: 'leito_indisponivel',
      campo: 'leitoId',
    });
    expect(
      await erroDe(internar(entradaInternacao({ leitoId: leitoPorCodigo('UTI-12').id }))),
    ).toMatchObject({
      codigo: 'leito_indisponivel',
    });
  });

  it('R-L5: criança em leito adulto exige justificativa (registrada no evento)', async () => {
    const crianca = pacienteLivre({ menor: true });
    const leito = leitoLivre('enfermaria', { isolamento: false });
    const erro = await erroDe(
      internar(entradaInternacao({ pacienteId: crianca.id, leitoId: leito.id })),
    );
    expect((erro as unknown as ErroValidacao).campos.justificativa).toMatch(/perfil/);
    const int = await internar(
      entradaInternacao({
        pacienteId: crianca.id,
        leitoId: leito.id,
        justificativa: 'Sem leito pediátrico livre agora',
      }),
    );
    expect(int.eventos[0].justificativa).toBe('Sem leito pediátrico livre agora');
    esperarConsistente();
  });

  it('R-L6: precaução de contato em leito sem isolamento exige justificativa', async () => {
    const erro = await erroDe(internar(entradaInternacao({ precaucao: 'contato' })));
    expect((erro as unknown as ErroValidacao).campos.justificativa).toMatch(/isolamento/);
    const isolamento = repoLeitos
      .todos()
      .find(
        (l) =>
          l.status === 'livre' &&
          l.isolamento &&
          l.perfil === 'adulto' &&
          l.setorId !== 'observacao',
      );
    if (isolamento) {
      const int = await internar(
        entradaInternacao({ precaucao: 'contato', leitoId: isolamento.id }),
      );
      expect(int.precaucao).toBe('contato');
    }
  });

  it('R-L10 / E-03: médico inativo; leito de observação é só da emergência', async () => {
    expect(
      await erroDe(internar(entradaInternacao({ medicoResponsavelId: MEDICO_INATIVO }))),
    ).toMatchObject({
      codigo: 'medico_inativo',
      campo: 'medicoResponsavelId',
    });
    const obs = leitoLivre('observacao');
    expect(await erroDe(internar(entradaInternacao({ leitoId: obs.id })))).toBeInstanceOf(
      ErroValidacao,
    );
  });

  it('início no futuro ou mais de 24 h antes: erro no campo', async () => {
    const futuro = new Date(Date.now() + 3_600_000).toISOString();
    const antigo = new Date(Date.now() - 25 * 3_600_000).toISOString();
    expect(
      (await erroDe(internar(entradaInternacao({ inicio: futuro })))) as unknown as ErroValidacao,
    ).toMatchObject({
      campos: { inicio: expect.any(String) },
    });
    expect(
      (await erroDe(internar(entradaInternacao({ inicio: antigo })))) as unknown as ErroValidacao,
    ).toMatchObject({
      campos: { inicio: expect.any(String) },
    });
  });

  it('E-11 com outra aba: o leito foi ocupado antes de gravar — nada é gravado', async () => {
    const e = entradaInternacao();
    const antes = repoInternacoes.todos().length;
    gravarComoOutraAba<{ id: string; status: string }>('leitos', (itens) =>
      itens.map((l) => (l.id === e.leitoId ? { ...l, status: 'bloqueado' } : l)),
    );
    expect(await erroDe(internar(e))).toMatchObject({ codigo: 'leito_indisponivel' });
    expect(repoInternacoes.todos()).toHaveLength(antes);
  });
});

describe('L6 — internar pelo pedido de leito', () => {
  it('no leito reservado: pedido atendido, atendimento encerrado por internação', async () => {
    const a = aguardandoLeito(true);
    const sol = repoSolicitacoes.obter(a.solicitacaoId!)!;
    const int = await internar(
      entradaInternacao({
        pacienteId: a.pacienteId!,
        origem: 'emergencia',
        solicitacaoId: sol.id,
        leitoId: sol.leitoReservadoId!,
        medicoResponsavelId: medicoClinico().id,
      }),
    );
    expect(int).toMatchObject({ origem: 'emergencia', atendimentoId: a.id, solicitacaoId: sol.id });
    expect(repoSolicitacoes.obter(sol.id)).toMatchObject({
      status: 'atendida',
      internacaoId: int.id,
    });
    expect(repoAtendimentos.obter(a.id)).toMatchObject({
      status: 'encerrado',
      desfecho: { tipo: 'internacao', internacaoId: int.id, statusAnterior: 'em_atendimento' },
    });
    expect(
      repoAtividades
        .todos()
        .some((x) => x.tipo === 'emergencia_desfecho' && x.referenciaId === a.id),
    ).toBe(true);
    esperarConsistente();
  });

  it('vindo da observação: libera o leito OBS para higienização; reserva de outro leito é solta', async () => {
    const a = aguardandoLeito(false);
    const obs = a.leitoObservacaoId!;
    const sol = repoSolicitacoes.obter(a.solicitacaoId!)!;
    const destino = leitoLivre('enfermaria', { isolamento: false });
    const outro = leitoLivre('enfermaria', { isolamento: false, pular: 1 });
    await reservarLeito(sol.id, outro.id, sol.versao);
    await internar(
      entradaInternacao({
        pacienteId: a.pacienteId!,
        origem: 'emergencia',
        solicitacaoId: sol.id,
        leitoId: destino.id,
      }),
    );
    expect(repoLeitos.obter(obs)).toMatchObject({ status: 'higienizacao' });
    expect(repoLeitos.obter(outro.id)).toMatchObject({ status: 'livre' });
    expect(repoAtendimentos.obter(a.id)?.desfecho?.statusAnterior).toBe('em_observacao');
    esperarConsistente();
  });

  it('origem "emergência" sem pedido é recusada', async () => {
    expect(await erroDe(internar(entradaInternacao({ origem: 'emergencia' })))).toBeInstanceOf(
      ErroValidacao,
    );
  });

  it('transação desfeita: com o leito ocupado por outra aba, o pedido continua em aberto', async () => {
    const a = aguardandoLeito(false);
    const sol = repoSolicitacoes.obter(a.solicitacaoId!)!;
    const destino = leitoLivre('enfermaria', { isolamento: false });
    gravarComoOutraAba<{ id: string; status: string }>('leitos', (itens) =>
      itens.map((l) => (l.id === destino.id ? { ...l, status: 'bloqueado' } : l)),
    );
    expect(
      await erroDe(
        internar(
          entradaInternacao({
            pacienteId: a.pacienteId!,
            origem: 'emergencia',
            solicitacaoId: sol.id,
            leitoId: destino.id,
          }),
        ),
      ),
    ).toMatchObject({ codigo: 'leito_indisponivel' });
    expect(repoSolicitacoes.obter(sol.id)?.status).toBe('pendente');
    expect(repoAtendimentos.obter(a.id)?.status).toBe('aguardando_leito');
  });
});

describe('L2, L3, L4, L5, L8', () => {
  it('L2: transfere, leva a origem para higienização e grava o evento', async () => {
    const int = internacaoAtivaQualquer();
    const origem = repoLeitos.obter(int.leitoId)!;
    const destino = repoLeitos
      .todos()
      .find(
        (l) =>
          l.status === 'livre' &&
          l.setorId === 'uti' &&
          l.perfil === origem.perfil &&
          !l.isolamento,
      )!;
    const r = await transferir(
      int.id,
      { leitoDestinoId: destino.id, motivo: 'Piora clínica (UTI)' },
      int.versao,
    );
    expect(r.leitoId).toBe(destino.id);
    expect(r.eventos.at(-1)).toMatchObject({
      tipo: 'transferida',
      de: origem.codigo,
      para: destino.codigo,
    });
    expect(repoLeitos.obter(origem.id)).toMatchObject({
      status: 'higienizacao',
      higienizacao: { tipo: 'terminal' },
    });
    expect(
      repoAtividades
        .todos()
        .some((a) => a.tipo === 'paciente_transferido' && a.referenciaId === int.id),
    ).toBe(true);
    expect(repoLeitos.obter(destino.id)).toMatchObject({ status: 'ocupado', internacaoId: int.id });
    esperarConsistente();
  });

  it('L2: destino ocupado (E-11), mesmo leito e versão antiga (E-05)', async () => {
    const int = internacaoAtivaQualquer();
    const ocupado = repoLeitos.todos().find((l) => l.status === 'ocupado' && l.id !== int.leitoId)!;
    expect(
      await erroDe(
        transferir(int.id, { leitoDestinoId: ocupado.id, motivo: 'Isolamento' }, int.versao),
      ),
    ).toMatchObject({
      codigo: 'leito_indisponivel',
    });
    expect(
      await erroDe(
        transferir(int.id, { leitoDestinoId: int.leitoId, motivo: 'Isolamento' }, int.versao),
      ),
    ).toBeInstanceOf(ErroValidacao);
    expect(
      await erroDe(
        transferir(
          int.id,
          { leitoDestinoId: leitoLivre('apartamento').id, motivo: 'Isolamento' },
          99,
        ),
      ),
    ).toBeInstanceOf(ErroConcorrencia);
  });

  it('L3: alta leva o leito para higienização (isolamento pela precaução)', async () => {
    const int = repoInternacoes
      .todos()
      .find((i) => i.status === 'ativa' && i.precaucao !== 'padrao')!;
    const r = await darAlta(int.id, { tipo: 'melhorada', em: agoraIso() }, int.versao);
    expect(r.internacao).toMatchObject({ status: 'encerrada', alta: { tipo: 'melhorada' } });
    expect(repoLeitos.obter(int.leitoId)).toMatchObject({
      status: 'higienizacao',
      higienizacao: { tipo: 'isolamento' },
    });
    expect(
      repoAtividades.todos().some((a) => a.tipo === 'alta_registrada' && a.referenciaId === int.id),
    ).toBe(true);
    esperarConsistente();
    // Já encerrada: E-16.
    expect(
      await erroDe(darAlta(int.id, { tipo: 'melhorada', em: agoraIso() }, r.internacao.versao)),
    ).toMatchObject({
      codigo: 'transicao_invalida',
    });
  });

  it('L3: alta antes do início e transferência sem hospital', async () => {
    const int = internacaoAtivaQualquer();
    const antes = new Date(new Date(int.inicio).getTime() - 60_000).toISOString();
    expect(
      await erroDe(darAlta(int.id, { tipo: 'melhorada', em: antes }, int.versao)),
    ).toBeInstanceOf(ErroValidacao);
    expect(
      await erroDe(darAlta(int.id, { tipo: 'transferencia', em: agoraIso() }, int.versao)),
    ).toBeInstanceOf(ErroValidacao);
  });

  it('L3: alta no mesmo minuto da internação é aceita (os campos têm precisão de minuto)', async () => {
    ajustarRelogio('2026-11-10T10:30:40-03:00');
    const int = await internar(entradaInternacao());
    // O campo "Data e hora" manda 10:30:00, antes do início (10:30:40), mas no mesmo minuto.
    const r = await darAlta(
      int.id,
      { tipo: 'melhorada', em: '2026-11-10T13:30:00.000Z' },
      int.versao,
    );
    expect(r.internacao.status).toBe('encerrada');
    ajustarRelogio('2026-11-10T10:30:00-03:00');
    esperarConsistente();
  });

  it('L4: conclui em lote e pula o leito que mudou (E-16); "Desfazer" volta com o início original', async () => {
    const emHig = repoLeitos.todos().filter((l) => l.status === 'higienizacao');
    expect(emHig.length).toBeGreaterThanOrEqual(2);
    const [a, b] = emHig;
    const r = await concluirHigienizacao([
      { id: a.id, versao: a.versao },
      { id: b.id, versao: b.versao + 5 },
    ]);
    expect(r).toEqual({ concluidos: [a.id], ignorados: [b.id] });
    const livre = repoLeitos.obter(a.id)!;
    expect(livre.status).toBe('livre');
    await reverterHigienizacao(a.id, livre.versao, { desde: a.desde, tipo: a.higienizacao!.tipo });
    expect(repoLeitos.obter(a.id)).toMatchObject({ status: 'higienizacao', desde: a.desde });
    esperarConsistente();
  });

  it('L5: bloqueia livre, recusa ocupado (E-16) e desbloqueia', async () => {
    const l = leitoLivre('apartamento');
    const b = await bloquear(
      l.id,
      { motivo: 'Manutenção', previsaoLiberacao: '2026-11-12' },
      l.versao,
    );
    expect(b).toMatchObject({
      status: 'bloqueado',
      bloqueio: { motivo: 'Manutenção', previsaoLiberacao: '2026-11-12' },
    });
    expect((await obterLeito(l.id)).liberacaoVencida).toBe(false);
    // R-L14: passada a previsão de liberação, o leito aparece com "Liberação prevista vencida".
    ajustarRelogio('2026-11-13T09:00:00-03:00');
    expect((await obterLeito(l.id)).liberacaoVencida).toBe(true);
    ajustarRelogio('2026-11-10T10:30:00-03:00');
    const ocupado = repoLeitos.todos().find((x) => x.status === 'ocupado')!;
    expect(
      await erroDe(bloquear(ocupado.id, { motivo: 'Manutenção' }, ocupado.versao)),
    ).toMatchObject({
      codigo: 'transicao_invalida',
    });
    const d = await desbloquear(l.id, b.versao);
    expect(d.status).toBe('livre');
    expect(
      repoAtividades
        .todos()
        .filter((a) => a.referenciaId === l.id)
        .map((a) => a.tipo),
    ).toEqual(expect.arrayContaining(['leito_bloqueado', 'leito_desbloqueado']));
    esperarConsistente();
  });

  it('L8: desfaz a alta dentro de 6 h (o paciente volta ao leito)', async () => {
    const int = internacaoAtivaQualquer();
    const { internacao } = await darAlta(int.id, { tipo: 'melhorada', em: agoraIso() }, int.versao);
    expect((await obterInternacao(int.id)).desfazerAltaAte).toBe('2026-11-10T19:30:00.000Z');
    ajustarRelogio('2026-11-10T16:00:00-03:00');
    const r = await desfazerAlta(int.id, 'Alta registrada no paciente errado', internacao.versao);
    expect(r.internacao).toMatchObject({ status: 'ativa', alta: undefined });
    expect(r.internacao.eventos.map((e) => e.tipo)).toEqual(
      expect.arrayContaining(['alta', 'alta_desfeita']),
    );
    expect(repoLeitos.obter(int.leitoId)).toMatchObject({
      status: 'ocupado',
      internacaoId: int.id,
    });
    esperarConsistente();
  });

  it('L8: fora da janela (E-18) ou com o leito já ocupado (E-11)', async () => {
    const int = internacaoAtivaQualquer();
    const { internacao } = await darAlta(int.id, { tipo: 'melhorada', em: agoraIso() }, int.versao);
    ajustarRelogio('2026-11-10T17:00:00-03:00');
    expect(await erroDe(desfazerAlta(int.id, 'Registro errado', internacao.versao))).toMatchObject({
      codigo: 'janela_correcao_expirada',
    });

    ajustarRelogio('2026-11-10T11:00:00-03:00');
    const outra = repoInternacoes
      .todos()
      .filter((i) => i.status === 'ativa' && i.precaucao === 'padrao')[1];
    const alta = await darAlta(outra.id, { tipo: 'melhorada', em: agoraIso() }, outra.versao);
    const leito = repoLeitos.obter(outra.leitoId)!;
    await concluirHigienizacao([{ id: leito.id, versao: leito.versao }]);
    await internar(entradaInternacao({ leitoId: leito.id }));
    expect(
      await erroDe(desfazerAlta(outra.id, 'Registro errado', alta.internacao.versao)),
    ).toMatchObject({
      codigo: 'leito_indisponivel',
    });
  });
});

describe('L7, L9 e pedidos de leito', () => {
  it('L7: um evento por campo alterado; E-05 com versão antiga', async () => {
    const int = internacaoAtivaQualquer();
    const r = await editarInternacao(
      int.id,
      {
        medicoResponsavelId: 'med-fernanda-lima',
        previsaoAlta: '2026-11-20',
        precaucao: 'padrao',
        motivo: 'Outro motivo',
      },
      int.versao,
    );
    const tipos = r.eventos.slice(1).map((e) => e.tipo);
    expect(tipos).toEqual(
      expect.arrayContaining(['responsavel_alterado', 'previsao_alterada', 'motivo_alterado']),
    );
    expect(tipos).not.toContain('precaucao_alterada');
    expect(
      await erroDe(
        editarInternacao(
          int.id,
          { medicoResponsavelId: int.medicoResponsavelId, precaucao: 'padrao', motivo: 'x x x' },
          int.versao,
        ),
      ),
    ).toBeInstanceOf(ErroConcorrencia);
  });

  it('L7: precaução nova sem isolamento no leito exige justificativa', async () => {
    const int = repoInternacoes
      .todos()
      .find(
        (i) =>
          i.status === 'ativa' &&
          i.precaucao === 'padrao' &&
          !repoLeitos.obter(i.leitoId)!.isolamento,
      )!;
    const base = {
      medicoResponsavelId: int.medicoResponsavelId,
      precaucao: 'goticulas' as const,
      motivo: int.motivo,
    };
    expect(await erroDe(editarInternacao(int.id, base, int.versao))).toBeInstanceOf(ErroValidacao);
    const r = await editarInternacao(
      int.id,
      { ...base, justificativa: 'Transferência para isolamento em seguida' },
      int.versao,
    );
    expect(r.eventos.at(-1)).toMatchObject({
      tipo: 'precaucao_alterada',
      de: 'padrao',
      para: 'goticulas',
    });
  });

  it('L9: pede leito eletivo; E-14 com pedido já em aberto; amarelo exige justificativa', async () => {
    const p = pacienteLivre();
    const base = {
      pacienteId: p.id,
      setorDesejado: 'apartamento' as const,
      precaucao: 'padrao' as const,
      dataPrevista: '2026-11-12',
      motivo: 'Cirurgia programada',
    };
    expect(await erroDe(solicitarLeitoEletivo({ ...base, prioridade: 'amarelo' }))).toBeInstanceOf(
      ErroValidacao,
    );
    expect(
      await erroDe(solicitarLeitoEletivo({ ...base, dataPrevista: '2026-12-25' })),
    ).toBeInstanceOf(ErroValidacao);
    const s = await solicitarLeitoEletivo(base);
    expect(s).toMatchObject({ origem: 'eletiva', prioridade: 'verde', status: 'pendente' });
    expect(await erroDe(solicitarLeitoEletivo(base))).toMatchObject({
      codigo: 'paciente_com_solicitacao',
    });
    esperarConsistente();
  });

  it('reservar, trocar a reserva e cancelar só a reserva', async () => {
    const p = pacienteLivre();
    const s = await solicitarLeitoEletivo({
      pacienteId: p.id,
      setorDesejado: 'apartamento',
      precaucao: 'padrao',
      dataPrevista: '2026-11-11',
      motivo: 'Cirurgia',
    });
    const l1 = leitoLivre('apartamento');
    const l2 = leitoLivre('apartamento', { pular: 1 });
    const r1 = await reservarLeito(s.id, l1.id, s.versao);
    expect(repoLeitos.obter(l1.id)).toMatchObject({ status: 'reservado', solicitacaoId: s.id });
    const r2 = await reservarLeito(s.id, l2.id, r1.versao);
    expect(repoLeitos.obter(l1.id)?.status).toBe('livre');
    esperarConsistente();
    const r3 = await cancelarReserva(s.id, r2.versao);
    expect(r3).toMatchObject({ status: 'pendente' });
    expect(repoLeitos.obter(l2.id)?.status).toBe('livre');
    esperarConsistente();
  });

  it('cancelar o pedido da emergência devolve o atendimento ao status anterior (R-E15)', async () => {
    const a = aguardandoLeito(true);
    const s = repoSolicitacoes.obter(a.solicitacaoId!)!;
    await cancelarSolicitacao(s.id, 'Paciente melhorou', s.versao);
    expect(repoAtendimentos.obter(a.id)).toMatchObject({
      status: 'em_atendimento',
      solicitacaoId: undefined,
    });
    expect(repoLeitos.obter(s.leitoReservadoId!)?.status).toBe('livre');
    expect(repoSolicitacoes.obter(s.id)).toMatchObject({
      status: 'cancelada',
      motivoCancelamento: 'Paciente melhorou',
    });
    esperarConsistente();
  });
});

describe('leituras', () => {
  it('mapa: 130 leitos, filtros, destaques e ocupante com dia de internação', async () => {
    const todos = await listarLeitos();
    expect(todos).toHaveLength(130);
    expect(todos[0].codigo).toBe('UTI-01');
    expect((await listarLeitos({ setorId: 'uti', status: 'ocupado' })).length).toBe(22);
    expect(
      (await listarLeitos({ perfil: 'pediatrico' })).every((l) => l.perfil === 'pediatrico'),
    ).toBe(true);
    expect((await listarLeitos({ soIsolamento: true })).every((l) => l.isolamento)).toBe(true);
    const ocupado = todos.find((l) => l.status === 'ocupado' && l.ocupante?.internacaoId)!;
    expect(ocupado.ocupante).toMatchObject({
      nome: expect.any(String),
      diaInternacao: expect.any(Number),
    });
    expect(todos.find((l) => l.codigo === 'ENF-102B')?.higienizacaoAtrasada).toBe('alerta');
    expect(todos.find((l) => l.codigo === 'ENF-118A')?.higienizacaoAtrasada).toBe('destaque');
    expect(todos.find((l) => l.codigo === 'UTI-12')).toMatchObject({
      status: 'reservado',
      reservaLonga: true,
    });
  });

  it('busca de paciente no mapa (M24)', async () => {
    const int = internacaoAtivaQualquer();
    const nome = (await obterInternacao(int.id)).pacienteNome;
    const achados = await buscarPacienteNoMapa(nome.split(' ')[0]);
    expect(achados.some((l) => l.id === int.leitoId)).toBe(true);
  });

  it('R-X5: o mapa mostra o nome social; a busca acha pelos dois nomes', async () => {
    const id = 'pac-joana-freitas';
    const ativa = repoInternacoes.todos().find((i) => i.status === 'ativa' && i.pacienteId === id);
    const leitoId =
      ativa?.leitoId ?? (await internar(entradaInternacao({ pacienteId: id }))).leitoId;
    expect((await obterLeito(leitoId)).ocupante?.nome).toBe('Joana Freitas');
    expect((await buscarPacienteNoMapa('Joana')).some((l) => l.id === leitoId)).toBe(true);
    // Acha também pelo nome civil (como a lista de pacientes), mas o cartão mostra o social.
    const pelaCivil = (await buscarPacienteNoMapa('João Freitas')).find((l) => l.id === leitoId);
    expect(pelaCivil?.ocupante?.nome).toBe('Joana Freitas');
  });

  it('internações: alta prevista hoje (3) e vencida (2); encerradas', async () => {
    expect((await listarInternacoes()).total).toBe(86);
    expect((await listarInternacoes({ altaPrevista: 'hoje' })).total).toBe(3);
    expect((await listarInternacoes({ altaPrevista: 'vencida' })).total).toBe(2);
    expect((await listarInternacoes({ status: 'encerrada' })).total).toBeGreaterThan(20);
  });

  it('pedidos em aberto ordenados por prioridade', async () => {
    const lista = await listarSolicitacoes();
    expect(lista.map((s) => s.prioridade)).toEqual(['laranja', 'amarelo', 'verde']);
    expect(lista[1]).toMatchObject({ esperaLonga: true });
  });

  it('L1 passo 6: responsáveis ativos, os do departamento do setor primeiro', async () => {
    const lista = await medicosResponsaveis('uti');
    expect(lista[0].departamentoId).toBe('clinica-geral');
    expect(lista.every((m) => m.ativo)).toBe(true);
    expect((await medicosResponsaveis()).length).toBe(lista.length);
  });

  it('A11 para um paciente: o sugerido vem primeiro', () => {
    const r = avaliarParaPaciente({
      pacienteId: pacienteLivre().id,
      precaucao: 'padrao',
      setorDesejado: 'enfermaria',
    });
    expect(r[0]).toMatchObject({
      sugerido: true,
      compativel: true,
      leito: { setorId: 'enfermaria' },
    });
    expect(r.some((x) => x.leito.setorId === 'observacao')).toBe(false);
  });

  it('R-X8: consultas agendadas durante a internação', async () => {
    const e = entradaInternacao({ previsaoAlta: '2026-11-14' });
    const int = await internar(e);
    await agendarConsulta({
      pacienteId: e.pacienteId,
      medicoId: 'med-paulo-mendes',
      data: '2026-11-12',
      hora: '09:00',
      duracaoMin: 30,
      tipo: 'retorno',
    });
    expect(await consultasDuranteInternacao(int.id)).toHaveLength(1);
  });

  it('o erro de conflito traz o campo para o formulário', async () => {
    const atual = internacaoAtivaQualquer();
    const erro = await erroDe(internar(entradaInternacao({ pacienteId: atual.pacienteId })));
    expect(erro).toBeInstanceOf(ErroConflito);
    expect(repoMedicos.todos().length).toBeGreaterThan(0);
  });
});
