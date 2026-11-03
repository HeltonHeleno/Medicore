import { repoAtividades } from '../services/colecoes';
import { repoAtendimentos, repoLeitos, repoSolicitacoes } from '../services/colecoes-operacoes';
import {
  chamar,
  colocarEmObservacao,
  desfechosPermitidos,
  encerrar,
  listarFila,
  listarHistorico,
  obterAtendimento,
  reabrir,
  reavaliar,
  registrarChegada,
  retomarAtendimento,
  solicitarLeito,
  triar,
  vincularPaciente,
  medicosParaChamar,
} from '../services/emergencia';
import { ErroConcorrencia, ErroValidacao } from '../services/erros';
import { internar } from '../services/leitos';
import type { EntradaChegada, EntradaTriagem } from '../schemas/emergencia';
import type { Atendimento } from '../types';
import {
  agoraIso,
  esperarConsistente,
  gravarComoOutraAba,
  leitoLivre,
  medicoClinico,
  MEDICO_EMERGENCIA,
  MEDICO_INATIVO,
  pacienteLivre,
  prepararOperacoes,
} from './utils/operacoes';
import { ajustarRelogio, erroDe } from './utils/servicos';

prepararOperacoes('2026-11-10T10:30:00-03:00');

const chegada = (extra: Partial<EntradaChegada> = {}): EntradaChegada => ({
  pacienteId: pacienteLivre().id,
  modoChegada: 'meios_proprios',
  queixa: 'Dor abdominal',
  chegadaEm: agoraIso(),
  ...extra,
});

const triagem = (extra: Partial<EntradaTriagem> = {}): EntradaTriagem => ({
  risco: 'amarelo',
  profissional: 'Enf. Teste',
  sinais: { pas: 130, pad: 85, fc: 90, spo2: 97 },
  ...extra,
});

const atual = (id: string) => repoAtendimentos.obter(id)!;

/** Chegada → triagem → chamado: devolve o atendimento em atendimento. */
async function emAtendimento(extra: Partial<EntradaChegada> = {}): Promise<Atendimento> {
  const a = await registrarChegada(chegada(extra));
  await triar(a.id, triagem(), a.versao);
  return chamar(a.id, MEDICO_EMERGENCIA, atual(a.id).versao);
}

describe('E1 — registrar chegada', () => {
  it('paciente cadastrado: número do dia, aguardando triagem', async () => {
    const a = await registrarChegada(chegada());
    expect(a).toMatchObject({
      status: 'aguardando_triagem',
      numero: expect.stringMatching(/^E-\d{4}$/),
    });
    expect(a.eventos).toEqual([
      expect.objectContaining({ tipo: 'chegada', autor: 'Usuário de demonstração' }),
    ]);
    esperarConsistente();
  });

  it('sem identificação (D9); exige paciente ou provisório', async () => {
    const a = await registrarChegada(
      chegada({
        pacienteId: undefined,
        provisorio: { descricao: 'Homem, ~30 anos, boné', sexo: 'masculino', idadeAproximada: 30 },
      }),
    );
    expect(a.provisorio).toMatchObject({ idadeAproximada: 30 });
    expect(await erroDe(registrarChegada(chegada({ pacienteId: undefined })))).toBeInstanceOf(
      ErroValidacao,
    );
  });

  it('emergência imediata: vermelho, prazo na chegada, atividade (R-E2)', async () => {
    const a = await registrarChegada(chegada({ emergenciaImediata: true }));
    expect(a).toMatchObject({
      status: 'aguardando_atendimento',
      risco: 'vermelho',
      prazo: a.chegadaEm,
    });
    expect(
      repoAtividades
        .todos()
        .some((x) => x.tipo === 'emergencia_vermelho' && x.referenciaId === a.id),
    ).toBe(true);
  });

  it('números diferentes mesmo com outra aba registrando ao mesmo tempo (A8 na transação)', async () => {
    const a = await registrarChegada(chegada());
    const copia = {
      ...a,
      id: 'outra-aba',
      numero: `E-${String(Number(a.numero.slice(2)) + 1).padStart(4, '0')}`,
      pacienteId: undefined,
      provisorio: { descricao: 'Outra aba chegada', sexo: 'feminino' },
    };
    gravarComoOutraAba<Atendimento>('atendimentos', (itens) => [...itens, copia as Atendimento]);
    const b = await registrarChegada(chegada({ pacienteId: pacienteLivre({ pular: 1 }).id }));
    expect(new Set([a.numero, copia.numero, b.numero]).size).toBe(3);
  });

  it('E-14: paciente internado ou com atendimento aberto; chegada retroativa só até 2 h', async () => {
    const aberto = repoAtendimentos
      .todos()
      .find((x) => x.status === 'em_atendimento' && x.pacienteId)!;
    expect(
      await erroDe(registrarChegada(chegada({ pacienteId: aberto.pacienteId }))),
    ).toMatchObject({
      codigo: 'paciente_em_atendimento',
    });
    const antiga = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(await erroDe(registrarChegada(chegada({ chegadaEm: antiga })))).toBeInstanceOf(
      ErroValidacao,
    );
  });
});

describe('E2 / E10 — triagem, retriagem e reavaliação', () => {
  it('triagem: prazo, status e evento de → para', async () => {
    const a = await registrarChegada(chegada());
    const r = await triar(a.id, triagem({ risco: 'laranja' }), a.versao);
    expect(r).toMatchObject({
      status: 'aguardando_atendimento',
      risco: 'laranja',
      prazo: '2026-11-10T13:40:00.000Z',
    });
    expect(r.eventos.at(-1)).toMatchObject({ tipo: 'triagem', para: 'laranja' });
    esperarConsistente();
  });

  it('retriagem mais grave adianta o prazo; menos grave exige justificativa e não adia', async () => {
    const a = await registrarChegada(chegada());
    const t1 = await triar(a.id, triagem({ risco: 'amarelo' }), a.versao);
    ajustarRelogio('2026-11-10T10:40:00-03:00');
    const t2 = await triar(a.id, triagem({ risco: 'laranja' }), t1.versao);
    expect(t2.prazo).toBe('2026-11-10T13:50:00.000Z');
    expect(await erroDe(triar(a.id, triagem({ risco: 'verde' }), t2.versao))).toBeInstanceOf(
      ErroValidacao,
    );
    const t3 = await triar(
      a.id,
      triagem({ risco: 'verde', justificativa: 'Dor controlada após avaliação' }),
      t2.versao,
    );
    expect(t3).toMatchObject({ risco: 'verde', prazo: t2.prazo });
    expect(t3.triagens).toHaveLength(3);
  });

  it('vermelho na retriagem gera a atividade; E-05 com versão antiga', async () => {
    const a = await registrarChegada(chegada());
    const t1 = await triar(a.id, triagem(), a.versao);
    await triar(a.id, triagem({ risco: 'vermelho' }), t1.versao);
    expect(
      repoAtividades
        .todos()
        .some((x) => x.tipo === 'emergencia_vermelho' && x.referenciaId === a.id),
    ).toBe(true);
    expect(await erroDe(triar(a.id, triagem({ risco: 'vermelho' }), t1.versao))).toBeInstanceOf(
      ErroConcorrencia,
    );
  });

  it('faixas válidas (R-E5): SpO₂ 101 e PAS ≤ PAD são erro', async () => {
    const a = await registrarChegada(chegada());
    expect(await erroDe(triar(a.id, triagem({ sinais: { spo2: 101 } }), a.versao))).toBeInstanceOf(
      ErroValidacao,
    );
    expect(
      await erroDe(triar(a.id, triagem({ sinais: { pas: 80, pad: 80 } }), a.versao)),
    ).toBeInstanceOf(ErroValidacao);
  });

  it('E10: reavaliação não muda cor nem prazo; sinais de alerta aparecem no detalhe', async () => {
    const a = await registrarChegada(chegada());
    const t1 = await triar(a.id, triagem(), a.versao);
    const r = await reavaliar(a.id, { sinais: { spo2: 88, fc: 120 } }, t1.versao);
    expect(r).toMatchObject({ risco: t1.risco, prazo: t1.prazo });
    expect(r.reavaliacoes).toHaveLength(1);
    expect((await obterAtendimento(a.id)).alertasSinais.map((x) => x.campo)).toEqual(['spo2']);
  });
});

describe('E3, E4, E6, E7', () => {
  it('R-E7: médicos ativos para chamar, os da Emergência primeiro', async () => {
    const lista = await medicosParaChamar();
    expect(lista[0].departamentoId).toBe('emergencia');
    expect(lista.every((m) => m.ativo)).toBe(true);
    expect(lista.some((m) => m.id === MEDICO_INATIVO)).toBe(false);
    expect(lista.some((m) => m.departamentoId !== 'emergencia')).toBe(true);
  });

  it('E3: chama (registra o excesso) e recusa chamar de novo (E-16); médico inativo (E-03)', async () => {
    const a = await registrarChegada(chegada());
    const t1 = await triar(a.id, triagem({ risco: 'laranja' }), a.versao);
    expect(await erroDe(chamar(a.id, MEDICO_INATIVO, t1.versao))).toMatchObject({
      codigo: 'medico_inativo',
    });
    ajustarRelogio('2026-11-10T10:45:00-03:00');
    const c = await chamar(a.id, MEDICO_EMERGENCIA, t1.versao);
    expect(c).toMatchObject({ status: 'em_atendimento', medicoId: MEDICO_EMERGENCIA });
    expect(c.eventos.at(-1)).toMatchObject({ tipo: 'chamado', excessoMin: 5 });
    expect(await erroDe(chamar(a.id, MEDICO_EMERGENCIA, c.versao))).toMatchObject({
      codigo: 'transicao_invalida',
    });
  });

  it('E4: observação só em leito OBS de perfil compatível; retomar mantém o leito', async () => {
    const a = await emAtendimento();
    expect(
      await erroDe(colocarEmObservacao(a.id, leitoLivre('enfermaria').id, a.versao)),
    ).toBeInstanceOf(ErroValidacao);
    expect(
      await erroDe(
        colocarEmObservacao(a.id, leitoLivre('observacao', { perfil: 'pediatrico' }).id, a.versao),
      ),
    ).toBeInstanceOf(ErroValidacao);
    const obs = leitoLivre('observacao');
    const o = await colocarEmObservacao(a.id, obs.id, a.versao);
    expect(o).toMatchObject({ status: 'em_observacao', leitoObservacaoId: obs.id });
    expect(repoLeitos.obter(obs.id)).toMatchObject({ status: 'ocupado', atendimentoId: a.id });
    const r = await retomarAtendimento(a.id, o.versao);
    expect(r.status).toBe('em_atendimento');
    expect(repoLeitos.obter(obs.id)?.status).toBe('ocupado');
    esperarConsistente();
  });

  it('E6: pede leito (status anterior guardado); provisório é recusado (R-E9)', async () => {
    const a = await emAtendimento();
    const r = await solicitarLeito(
      a.id,
      { setorDesejado: 'enfermaria', precaucao: 'padrao', motivo: 'Dor abdominal' },
      a.versao,
    );
    expect(r).toMatchObject({ status: 'aguardando_leito', statusAntesDoLeito: 'em_atendimento' });
    expect(repoSolicitacoes.obter(r.solicitacaoId!)).toMatchObject({
      status: 'pendente',
      prioridade: 'amarelo',
      origem: 'emergencia',
    });
    esperarConsistente();

    const prov = await emAtendimento({
      pacienteId: undefined,
      provisorio: { descricao: 'Mulher, ~50 anos', sexo: 'feminino' },
    });
    expect(
      await erroDe(
        solicitarLeito(
          prov.id,
          { setorDesejado: 'uti', precaucao: 'padrao', motivo: 'Dor' },
          prov.versao,
        ),
      ),
    ).toBeInstanceOf(ErroValidacao);
  });

  it('E7: vincula o provisório a um cadastro; E-14 se o paciente já tem atendimento', async () => {
    const prov = await registrarChegada(
      chegada({
        pacienteId: undefined,
        provisorio: { descricao: 'Homem, ~40 anos', sexo: 'masculino' },
      }),
    );
    const ocupado = repoAtendimentos
      .todos()
      .find((x) => x.status === 'em_atendimento' && x.pacienteId)!;
    expect(await erroDe(vincularPaciente(prov.id, ocupado.pacienteId!, prov.versao))).toMatchObject(
      { codigo: 'paciente_em_atendimento' },
    );
    const p = pacienteLivre();
    const v = await vincularPaciente(prov.id, p.id, prov.versao);
    expect(v.pacienteId).toBe(p.id);
    expect(v.eventos.at(-1)).toMatchObject({ tipo: 'vinculado', detalhe: 'Homem, ~40 anos' });
    esperarConsistente();
  });
});

describe('E5 / E9 — desfechos e reabrir', () => {
  it('matriz: desfechos por status', () => {
    expect(desfechosPermitidos('aguardando_triagem')).toEqual(['evasao']);
    expect(desfechosPermitidos('aguardando_atendimento')).toEqual(['obito', 'evasao']);
    expect(desfechosPermitidos('em_atendimento')).toEqual(['alta', 'transferencia', 'obito']);
    expect(desfechosPermitidos('aguardando_leito')).toEqual(['alta', 'transferencia', 'obito']);
  });

  it('alta: encerra e libera o leito OBS; transferência exige hospital', async () => {
    const a = await emAtendimento();
    const obs = leitoLivre('observacao');
    const o = await colocarEmObservacao(a.id, obs.id, a.versao);
    expect(
      await erroDe(encerrar(a.id, { tipo: 'transferencia', em: agoraIso() }, o.versao)),
    ).toBeInstanceOf(ErroValidacao);
    const { atendimento } = await encerrar(a.id, { tipo: 'alta', em: agoraIso() }, o.versao);
    expect(atendimento).toMatchObject({
      status: 'encerrado',
      desfecho: { tipo: 'alta', statusAnterior: 'em_observacao' },
    });
    expect(repoLeitos.obter(obs.id)?.status).toBe('higienizacao');
    expect(
      repoAtividades
        .todos()
        .some((x) => x.tipo === 'emergencia_desfecho' && x.referenciaId === a.id),
    ).toBe(true);
    esperarConsistente();
  });

  it('desfecho fora da matriz é E-16 (ex.: alta de quem aguarda triagem)', async () => {
    const a = await registrarChegada(chegada());
    expect(await erroDe(encerrar(a.id, { tipo: 'alta', em: agoraIso() }, a.versao))).toMatchObject({
      codigo: 'transicao_invalida',
    });
  });

  it('evasão (R-E11): bloqueada aos 29 min, aceita aos 31', async () => {
    const a = await registrarChegada(chegada());
    ajustarRelogio('2026-11-10T10:59:00-03:00');
    expect(
      await erroDe(encerrar(a.id, { tipo: 'evasao', em: agoraIso() }, a.versao)),
    ).toBeInstanceOf(ErroValidacao);
    ajustarRelogio('2026-11-10T11:01:00-03:00');
    const { atendimento } = await encerrar(a.id, { tipo: 'evasao', em: agoraIso() }, a.versao);
    expect(atendimento.desfecho?.tipo).toBe('evasao');
  });

  it('R-E15: alta de quem aguarda leito cancela o pedido e libera a reserva', async () => {
    const a = repoAtendimentos
      .todos()
      .find(
        (x) =>
          x.status === 'aguardando_leito' &&
          repoSolicitacoes.obter(x.solicitacaoId!)?.status === 'reservada',
      )!;
    const s = repoSolicitacoes.obter(a.solicitacaoId!)!;
    await encerrar(a.id, { tipo: 'alta', em: agoraIso() }, a.versao);
    expect(repoSolicitacoes.obter(s.id)).toMatchObject({
      status: 'cancelada',
      motivoCancelamento: 'Atendimento encerrado: alta',
    });
    expect(repoLeitos.obter(s.leitoReservadoId!)?.status).toBe('livre');
    expect(atual(a.id).desfecho?.statusAnterior).toBe('em_atendimento');
    esperarConsistente();
  });

  it('E9: reabre dentro de 2 h e volta ao leito OBS; fora da janela é E-18', async () => {
    const a = await emAtendimento();
    const obs = leitoLivre('observacao');
    const o = await colocarEmObservacao(a.id, obs.id, a.versao);
    const { atendimento } = await encerrar(a.id, { tipo: 'alta', em: agoraIso() }, o.versao);
    expect((await obterAtendimento(a.id)).reabrirAte).toBe('2026-11-10T15:30:00.000Z');
    ajustarRelogio('2026-11-10T12:00:00-03:00');
    const { atendimento: r } = await reabrir(a.id, 'Paciente voltou com dor', atendimento.versao);
    expect(r).toMatchObject({
      status: 'em_observacao',
      leitoObservacaoId: obs.id,
      desfecho: undefined,
    });
    expect(repoLeitos.obter(obs.id)).toMatchObject({ status: 'ocupado', atendimentoId: a.id });
    expect(
      repoAtividades
        .todos()
        .some((x) => x.tipo === 'atendimento_reaberto' && x.referenciaId === a.id),
    ).toBe(true);
    esperarConsistente();

    const { atendimento: e2 } = await encerrar(a.id, { tipo: 'alta', em: agoraIso() }, r.versao);
    ajustarRelogio('2026-11-10T14:30:00-03:00');
    expect(await erroDe(reabrir(a.id, 'Tarde demais', e2.versao))).toMatchObject({
      codigo: 'janela_correcao_expirada',
    });
  });

  it('E9: leito OBS já ocupado (E-11) e desfecho internação não reabre', async () => {
    const a = await emAtendimento();
    const obs = leitoLivre('observacao');
    const o = await colocarEmObservacao(a.id, obs.id, a.versao);
    const { atendimento } = await encerrar(a.id, { tipo: 'alta', em: agoraIso() }, o.versao);
    const outro = await emAtendimento({ pacienteId: pacienteLivre({ pular: 3 }).id });
    const hig = repoLeitos.obter(obs.id)!;
    await (
      await import('../services/leitos')
    ).concluirHigienizacao([{ id: hig.id, versao: hig.versao }]);
    await colocarEmObservacao(outro.id, obs.id, outro.versao);
    expect(await erroDe(reabrir(a.id, 'Voltou com dor', atendimento.versao))).toMatchObject({
      codigo: 'leito_indisponivel',
    });
    // Com outro leito escolhido, reabre.
    const livre = leitoLivre('observacao');
    const { atendimento: r } = await reabrir(a.id, 'Voltou com dor', atendimento.versao, livre.id);
    expect(r.leitoObservacaoId).toBe(livre.id);
    esperarConsistente();

    const internado = repoAtendimentos.todos().find((x) => x.desfecho?.tipo === 'internacao')!;
    expect(await erroDe(reabrir(internado.id, 'Teste de reabrir', internado.versao))).toMatchObject(
      { codigo: 'transicao_invalida' },
    );
  });
});

describe('fila e histórico (E8)', () => {
  it('grupos por status e ordem de A7 (vermelho primeiro)', async () => {
    const fila = await listarFila();
    expect(fila.aguardandoAtendimento.length).toBeGreaterThanOrEqual(6);
    expect(fila.aguardandoAtendimento[0].risco).toBe('vermelho');
    expect(fila.aguardandoAtendimento.filter((a) => a.acimaDoPrazo).length).toBeGreaterThanOrEqual(
      2,
    );
    expect(fila.aguardandoTriagem).toHaveLength(2);
    expect(fila.emObservacao).toHaveLength(2);
    expect(fila.aguardandoLeito).toHaveLength(2);
    expect(fila.aguardandoTriagem.some((a) => a.nomeExibicao.includes('~70 anos'))).toBe(true);
  });

  it('o prazo estoura com o relógio, sem nova gravação', async () => {
    const a = await registrarChegada(chegada());
    await triar(a.id, triagem({ risco: 'laranja' }), a.versao);
    expect((await obterAtendimento(a.id)).acimaDoPrazo).toBe(false);
    ajustarRelogio('2026-11-10T10:45:00-03:00');
    expect(await obterAtendimento(a.id)).toMatchObject({ acimaDoPrazo: true, excessoMin: 5 });
  });

  it('histórico dos últimos 7 dias com filtros', async () => {
    const todos = await listarHistorico({ porPagina: 500 });
    expect(todos.total).toBeGreaterThan(20);
    const altas = await listarHistorico({ desfecho: 'alta', porPagina: 500 });
    expect(altas.itens.every((a) => a.desfecho?.tipo === 'alta')).toBe(true);
  });

  it('internar pelo pedido também tira o atendimento da fila', async () => {
    const a = await emAtendimento();
    const r = await solicitarLeito(
      a.id,
      { setorDesejado: 'enfermaria', precaucao: 'padrao', motivo: 'Dor' },
      a.versao,
    );
    await internar({
      pacienteId: a.pacienteId!,
      origem: 'emergencia',
      solicitacaoId: r.solicitacaoId!,
      precaucao: 'padrao',
      leitoId: leitoLivre('enfermaria', { isolamento: false }).id,
      medicoResponsavelId: medicoClinico().id,
      motivo: 'Dor abdominal',
      inicio: agoraIso(),
    });
    const fila = await listarFila();
    expect(
      Object.values(fila)
        .flat()
        .some((x) => x.id === a.id),
    ).toBe(false);
    esperarConsistente();
  });
});
