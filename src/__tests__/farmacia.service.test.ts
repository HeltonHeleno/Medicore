import { repoAtividades } from '../services/colecoes';
import {
  repoDispensacoes,
  repoLotes,
  repoMedicamentos,
  repoMovimentacoes,
} from '../services/colecoes-operacoes';
import { ErroConcorrencia, ErroValidacao } from '../services/erros';
import {
  ajustar,
  bloquearLote,
  criarMedicamento,
  descartarVencidos,
  desbloquearLote,
  devolver,
  dispensar,
  editarMedicamento,
  estornar,
  inativarMedicamento,
  listarEstoque,
  listarLotesVencimento,
  listarMovimentacoes,
  livroControlados,
  obterDispensacao,
  obterMedicamento,
  previaFefo,
  reativarMedicamento,
  registrarEntrada,
  verificarAlergia,
} from '../services/farmacia';
import { darAlta, internar } from '../services/leitos';
import type { EntradaMedicamento } from '../schemas/farmacia';
import type { Paciente } from '../types';
import { disponivelDe } from '../utils/fefo';
import {
  agoraIso,
  esperarConsistente,
  leitoLivre,
  medicoClinico,
  MEDICO_INATIVO,
  pacienteLivre,
  prepararOperacoes,
} from './utils/operacoes';
import { ajustarRelogio, erroDe } from './utils/servicos';

prepararOperacoes('2026-11-10T10:30:00-03:00');
const HOJE = '2026-11-10';

const PARACETAMOL = 'med-paracetamol-750';
const AMOXICILINA = 'med-amoxicilina-500';
const MORFINA = 'med-morfina-10';

const disponivel = (id: string) =>
  disponivelDe(
    repoLotes.todos().filter((l) => l.medicamentoId === id),
    HOJE,
  );

async function internarPaciente(
  opcoes: Parameters<typeof pacienteLivre>[0] = {},
): Promise<Paciente> {
  const p = pacienteLivre(opcoes);
  await internar({
    pacienteId: p.id,
    origem: 'eletiva',
    precaucao: 'padrao',
    leitoId: leitoLivre('enfermaria', {
      isolamento: false,
      perfil: opcoes.menor ? 'pediatrico' : 'adulto',
    }).id,
    medicoResponsavelId: medicoClinico().id,
    motivo: 'Pneumonia',
    inicio: agoraIso(),
  });
  return p;
}

/** Confirmação de quantidade alta (R-F14) para pedidos grandes de paracetamol. */
const ALTA_PARACETAMOL = [{ tipo: 'quantidade_alta', medicamentoId: PARACETAMOL }] as never;

/** Paciente com a alergia e com destino (internado; se estiver livre, interna). */
async function comAlergiaEDestino(termo: string): Promise<Paciente> {
  const { repoInternacoes } = await import('../services/colecoes-operacoes');
  const { repoPacientes } = await import('../services/colecoes');
  const internado = repoInternacoes
    .todos()
    .filter((i) => i.status === 'ativa')
    .map((i) => repoPacientes.obter(i.pacienteId)!)
    .find((p) => (p.alergias ?? '').includes(termo));
  return internado ?? internarPaciente({ comAlergia: termo });
}

const pedido = (
  pacienteId: string,
  itens: { medicamentoId: string; quantidade: number }[],
  alertas = [],
) => ({
  pacienteId,
  medicoSolicitanteId: medicoClinico().id,
  itens,
  alertasConfirmados: alertas,
});

const medicamento = (extra: Partial<EntradaMedicamento> = {}): EntradaMedicamento => ({
  nome: 'Cefalexina',
  principioAtivo: 'Cefalexina',
  classe: 'Cefalosporinas',
  concentracao: '500 mg',
  forma: 'capsula',
  unidade: 'capsula',
  unidadesPorEmbalagem: 8,
  estoqueMinimo: 40,
  ...extra,
});

describe('F1 / F7 — catálogo', () => {
  it('cadastra; nome + concentração + forma é único (E-02)', async () => {
    const m = await criarMedicamento(medicamento());
    expect(m).toMatchObject({ ativo: true, versao: 1 });
    expect(await erroDe(criarMedicamento(medicamento({ nome: ' cefalexina ' })))).toMatchObject({
      codigo: 'medicamento_duplicado',
      campo: 'nome',
    });
  });

  it('unidade travada depois da primeira movimentação; E-05', async () => {
    const m = await criarMedicamento(medicamento());
    const editado = await editarMedicamento(
      m.id,
      medicamento({ unidade: 'comprimido', forma: 'comprimido' }),
      m.versao,
    );
    expect(editado.unidade).toBe('comprimido');
    await registrarEntrada({
      medicamentoId: m.id,
      numero: 'L1',
      validade: '2027-06-01',
      quantidade: 10,
    });
    expect(
      await erroDe(
        editarMedicamento(
          m.id,
          medicamento({ forma: 'comprimido', unidade: 'capsula' }),
          editado.versao,
        ),
      ),
    ).toBeInstanceOf(ErroValidacao);
    expect(await erroDe(editarMedicamento(m.id, medicamento(), 1))).toBeInstanceOf(
      ErroConcorrencia,
    );
  });

  it('R-F11: inativar exige saldo zero (E-17 com os lotes); reativar', async () => {
    const m = repoMedicamentos.obter(PARACETAMOL)!;
    expect(await erroDe(inativarMedicamento(m.id, m.versao))).toMatchObject({
      codigo: 'pendencias_modulos',
    });
    const novo = await criarMedicamento(medicamento());
    const inativo = await inativarMedicamento(novo.id, novo.versao, 'Fora de linha');
    expect(inativo.ativo).toBe(false);
    expect(
      await erroDe(
        registrarEntrada({
          medicamentoId: novo.id,
          numero: 'L1',
          validade: '2027-06-01',
          quantidade: 5,
        }),
      ),
    ).toMatchObject({
      codigo: 'medicamento_inativo',
    });
    expect((await reativarMedicamento(novo.id, inativo.versao)).ativo).toBe(true);
  });
});

describe('F2 — entrada de lote', () => {
  it('registra o lote, a movimentação e a atividade', async () => {
    const antes = disponivel(PARACETAMOL);
    const lote = await registrarEntrada({
      medicamentoId: PARACETAMOL,
      numero: 'l-900',
      validade: '2027-09-01',
      quantidade: 60,
    });
    expect(lote).toMatchObject({ numero: 'L-900', quantidadeAtual: 60, quantidadeInicial: 60 });
    expect(disponivel(PARACETAMOL)).toBe(antes + 60);
    expect(repoMovimentacoes.todos().filter((x) => x.loteId === lote.id)).toEqual([
      expect.objectContaining({ tipo: 'entrada', quantidade: 60, saldoLoteApos: 60 }),
    ]);
    expect(
      repoAtividades.todos().some((a) => a.tipo === 'lote_recebido' && a.referenciaId === lote.id),
    ).toBe(true);
    esperarConsistente();
  });

  it('por embalagem (M27): 3 × 20 = 60 comprimidos', async () => {
    const lote = await registrarEntrada({
      medicamentoId: PARACETAMOL,
      numero: 'L-901',
      validade: '2027-09-01',
      quantidade: 3,
      modo: 'embalagens',
    });
    expect(lote.quantidadeAtual).toBe(60);
  });

  it('vencido é E-13; validade curta pede confirmação (R-F2)', async () => {
    expect(
      await erroDe(
        registrarEntrada({
          medicamentoId: PARACETAMOL,
          numero: 'X',
          validade: '2026-11-09',
          quantidade: 5,
        }),
      ),
    ).toBeInstanceOf(ErroValidacao);
    expect(
      await erroDe(
        registrarEntrada({
          medicamentoId: PARACETAMOL,
          numero: 'X',
          validade: '2026-11-25',
          quantidade: 5,
        }),
      ),
    ).toBeInstanceOf(ErroValidacao);
    const l = await registrarEntrada({
      medicamentoId: PARACETAMOL,
      numero: 'X',
      validade: '2026-11-25',
      quantidade: 5,
      confirmarValidadeCurta: true,
    });
    expect(l.validade).toBe('2026-11-25');
  });

  it('lote repetido: mesma validade soma (com confirmação); outra validade é E-13', async () => {
    const l = await registrarEntrada({
      medicamentoId: PARACETAMOL,
      numero: 'L-777',
      validade: '2027-09-01',
      quantidade: 10,
    });
    expect(
      await erroDe(
        registrarEntrada({
          medicamentoId: PARACETAMOL,
          numero: 'l-777',
          validade: '2027-09-01',
          quantidade: 5,
        }),
      ),
    ).toBeInstanceOf(ErroValidacao);
    const somado = await registrarEntrada({
      medicamentoId: PARACETAMOL,
      numero: 'L-777',
      validade: '2027-09-01',
      quantidade: 5,
      somarAoExistente: true,
    });
    expect(somado).toMatchObject({ id: l.id, quantidadeAtual: 15, quantidadeInicial: 15 });
    const erro = await erroDe(
      registrarEntrada({
        medicamentoId: PARACETAMOL,
        numero: 'L-777',
        validade: '2027-10-01',
        quantidade: 5,
      }),
    );
    expect((erro as unknown as ErroValidacao).campos.numero).toMatch(/outra validade/);
    esperarConsistente();
  });
});

describe('F3 — dispensar', () => {
  it('FEFO em 2 lotes, uma movimentação por lote, destino internação', async () => {
    const p = await internarPaciente();
    const plano = await previaFefo(PARACETAMOL, 1);
    const primeiro = plano.lotes[0];
    const qtd = primeiro.quantidadeAtual + 2;
    const d = await dispensar(
      pedido(p.id, [{ medicamentoId: PARACETAMOL, quantidade: qtd }], ALTA_PARACETAMOL),
    );
    expect(d.destino.tipo).toBe('internacao');
    expect(d.itens[0].lotes).toHaveLength(2);
    expect(d.itens[0].lotes[0]).toEqual({
      loteId: primeiro.id,
      quantidade: primeiro.quantidadeAtual,
    });
    expect(repoMovimentacoes.todos().filter((x) => x.dispensacaoId === d.id)).toHaveLength(2);
    esperarConsistente();
  });

  it('lote bloqueado fica fora do FEFO (R-F13)', async () => {
    const p = await internarPaciente();
    const primeiro = (await previaFefo(PARACETAMOL, 1)).lotes[0];
    await bloquearLote(
      primeiro.id,
      { motivo: 'Recolhimento ANVISA', referencia: 'Alerta 123' },
      primeiro.versao,
    );
    const d = await dispensar(pedido(p.id, [{ medicamentoId: PARACETAMOL, quantidade: 2 }]));
    expect(d.itens[0].lotes.some((a) => a.loteId === primeiro.id)).toBe(false);
    const desb = await desbloquearLote(primeiro.id, repoLotes.obter(primeiro.id)!.versao);
    expect(desb.bloqueio).toBeUndefined();
  });

  it('R-F8: alergia sem justificativa é recusada; com justificativa, gravada', async () => {
    const p = await comAlergiaEDestino('Penicilina');
    expect(await verificarAlergia(p.id, AMOXICILINA)).toMatchObject({ termo: 'penicilina' });
    expect(
      await erroDe(dispensar(pedido(p.id, [{ medicamentoId: AMOXICILINA, quantidade: 2 }]))),
    ).toBeInstanceOf(ErroValidacao);
    const d = await dispensar(
      pedido(p.id, [{ medicamentoId: AMOXICILINA, quantidade: 2 }], [
        {
          tipo: 'alergia',
          medicamentoId: AMOXICILINA,
          justificativa: 'Prescrição confirmada pelo médico',
        },
      ] as never),
    );
    expect(d.alertasConfirmados).toEqual([
      {
        tipo: 'alergia',
        medicamentoId: AMOXICILINA,
        termo: 'penicilina',
        justificativa: 'Prescrição confirmada pelo médico',
      },
    ]);
  });

  it('R-F7 controlado e R-F14 quantidade alta exigem confirmação', async () => {
    const p = await internarPaciente();
    expect(
      await erroDe(dispensar(pedido(p.id, [{ medicamentoId: MORFINA, quantidade: 1 }]))),
    ).toBeInstanceOf(ErroValidacao);
    const d = await dispensar(
      pedido(p.id, [{ medicamentoId: MORFINA, quantidade: 1 }], [
        { tipo: 'controlado', medicamentoId: MORFINA },
      ] as never),
    );
    expect(d.alertasConfirmados[0].tipo).toBe('controlado');
    expect(
      await erroDe(dispensar(pedido(p.id, [{ medicamentoId: PARACETAMOL, quantidade: 61 }]))),
    ).toBeInstanceOf(ErroValidacao);
    await dispensar(
      pedido(p.id, [{ medicamentoId: PARACETAMOL, quantidade: 61 }], [
        { tipo: 'quantidade_alta', medicamentoId: PARACETAMOL },
      ] as never),
    );
    esperarConsistente();
  });

  it('estoque cruzando o mínimo gera a atividade; E-12 acima do disponível', async () => {
    const p = await internarPaciente();
    const m = repoMedicamentos.obter('med-loratadina-10')!;
    const atual = disponivel(m.id);
    const ate = atual - m.estoqueMinimo;
    const confirmar = ate > 60 ? ([{ tipo: 'quantidade_alta', medicamentoId: m.id }] as never) : [];
    await dispensar(pedido(p.id, [{ medicamentoId: m.id, quantidade: ate }], confirmar));
    expect(
      repoAtividades.todos().some((a) => a.tipo === 'estoque_baixo' && a.referenciaId === m.id),
    ).toBe(true);
    const erro = await erroDe(
      dispensar(pedido(p.id, [{ medicamentoId: m.id, quantidade: m.estoqueMinimo + 1 }])),
    );
    expect(erro).toMatchObject({
      codigo: 'estoque_insuficiente',
      campo: 'itens.0.quantidade',
      detalhes: { disponivel: m.estoqueMinimo },
    });
  });

  it('E-15: o paciente não está internado nem em atendimento; médico inativo (E-03); item repetido', async () => {
    const p = pacienteLivre();
    expect(
      await erroDe(dispensar(pedido(p.id, [{ medicamentoId: PARACETAMOL, quantidade: 1 }]))),
    ).toMatchObject({ codigo: 'destino_inativo' });
    const q = await internarPaciente({ pular: 1 });
    expect(
      await erroDe(
        dispensar({
          ...pedido(q.id, [{ medicamentoId: PARACETAMOL, quantidade: 1 }]),
          medicoSolicitanteId: MEDICO_INATIVO,
        }),
      ),
    ).toMatchObject({ codigo: 'medico_inativo' });
    expect(
      await erroDe(
        dispensar(
          pedido(q.id, [
            { medicamentoId: PARACETAMOL, quantidade: 1 },
            { medicamentoId: PARACETAMOL, quantidade: 2 },
          ]),
        ),
      ),
    ).toBeInstanceOf(ErroValidacao);
    expect(
      await erroDe(
        dispensar(
          pedido(
            q.id,
            Array.from({ length: 11 }, () => ({ medicamentoId: PARACETAMOL, quantidade: 1 })),
          ),
        ),
      ),
    ).toBeInstanceOf(ErroValidacao);
  });

  it('E-15 depois da alta', async () => {
    const p = await internarPaciente();
    const int = (await import('../services/colecoes-operacoes')).repoInternacoes
      .todos()
      .find((i) => i.pacienteId === p.id && i.status === 'ativa')!;
    await darAlta(int.id, { tipo: 'melhorada', em: agoraIso() }, int.versao);
    expect(
      await erroDe(dispensar(pedido(p.id, [{ medicamentoId: PARACETAMOL, quantidade: 1 }]))),
    ).toMatchObject({ codigo: 'destino_inativo' });
  });
});

describe('F4, F5, F6, F8, F9', () => {
  it('F4: devolve ao último lote usado; não passa do saldo do item', async () => {
    const p = await internarPaciente();
    const primeiro = (await previaFefo(PARACETAMOL, 1)).lotes[0];
    const d = await dispensar(
      pedido(
        p.id,
        [{ medicamentoId: PARACETAMOL, quantidade: primeiro.quantidadeAtual + 2 }],
        ALTA_PARACETAMOL,
      ),
    );
    const segundo = d.itens[0].lotes[1].loteId;
    const saldoSegundo = repoLotes.obter(segundo)!.quantidadeAtual;
    const r = await devolver(d.id, 0, { quantidade: 1, motivo: 'Não utilizado' }, d.versao);
    expect(r.itens[0].devolvido).toBe(1);
    expect(repoLotes.obter(segundo)!.quantidadeAtual).toBe(saldoSegundo + 1);
    expect(
      await erroDe(devolver(d.id, 0, { quantidade: 999, motivo: 'Não utilizado' }, r.versao)),
    ).toMatchObject({
      codigo: 'estoque_insuficiente',
    });
    esperarConsistente();
  });

  it('F4: devolução de lote que venceu vira descarte (R-F10)', async () => {
    const p = await internarPaciente();
    const lote = await registrarEntrada({
      medicamentoId: 'med-captopril-25',
      numero: 'CURTO',
      validade: '2026-11-11',
      quantidade: 5,
      confirmarValidadeCurta: true,
    });
    const d = await dispensar(pedido(p.id, [{ medicamentoId: 'med-captopril-25', quantidade: 2 }]));
    expect(d.itens[0].lotes[0].loteId).toBe(lote.id);
    ajustarRelogio('2026-11-12T09:00:00-03:00');
    await devolver(d.id, 0, { quantidade: 2, motivo: 'Alta' }, d.versao);
    const movs = repoMovimentacoes
      .todos()
      .filter((x) => x.loteId === lote.id)
      .map((x) => x.tipo);
    expect(movs).toEqual(['entrada', 'dispensacao', 'devolucao', 'descarte_vencido']);
    expect(repoLotes.obter(lote.id)!.quantidadeAtual).toBe(3);
    esperarConsistente();
  });

  it('F8: estorna em 24 h (tudo volta); depois é E-18; com devolução não estorna', async () => {
    const p = await internarPaciente();
    const antes = disponivel(PARACETAMOL);
    const d = await dispensar(pedido(p.id, [{ medicamentoId: PARACETAMOL, quantidade: 4 }]));
    expect((await obterDispensacao(d.id)).estornarAte).toBe('2026-11-11T13:30:00.000Z');
    const e = await estornar(d.id, 'Registro em paciente errado', d.versao);
    expect(e).toMatchObject({
      status: 'estornada',
      estorno: { motivo: 'Registro em paciente errado' },
    });
    expect(disponivel(PARACETAMOL)).toBe(antes);
    expect(repoAtividades.todos().some((a) => a.tipo === 'dispensacao_estornada')).toBe(true);
    esperarConsistente();

    const d2 = await dispensar(pedido(p.id, [{ medicamentoId: PARACETAMOL, quantidade: 4 }]));
    const dev = await devolver(d2.id, 0, { quantidade: 1, motivo: 'Não utilizado' }, d2.versao);
    expect(await erroDe(estornar(d2.id, 'Medicamento errado', dev.versao))).toMatchObject({
      codigo: 'transicao_invalida',
    });
    const d3 = await dispensar(pedido(p.id, [{ medicamentoId: PARACETAMOL, quantidade: 1 }]));
    ajustarRelogio('2026-11-11T11:00:00-03:00');
    expect(await erroDe(estornar(d3.id, 'Duplicidade', d3.versao))).toMatchObject({
      codigo: 'janela_correcao_expirada',
    });
  });

  it('F5: ajuste e perda; saldo nunca negativo; controlado exige motivo maior', async () => {
    const lote = (await previaFefo(PARACETAMOL, 1)).lotes[0];
    const r = await ajustar(
      lote.id,
      { tipo: 'ajuste_positivo', quantidade: 3, motivo: 'Inventário' },
      lote.versao,
    );
    expect(r.quantidadeAtual).toBe(lote.quantidadeAtual + 3);
    expect(
      await erroDe(
        ajustar(lote.id, { tipo: 'perda', quantidade: 99999, motivo: 'Avaria' }, r.versao),
      ),
    ).toMatchObject({
      codigo: 'estoque_insuficiente',
    });
    const loteMorfina = (await previaFefo(MORFINA, 1)).lotes[0];
    expect(
      await erroDe(
        ajustar(
          loteMorfina.id,
          { tipo: 'perda', quantidade: 1, motivo: 'Quebra' },
          loteMorfina.versao,
        ),
      ),
    ).toBeInstanceOf(ErroValidacao);
    await ajustar(
      loteMorfina.id,
      { tipo: 'perda', quantidade: 1, motivo: 'Ampola quebrada no transporte' },
      loteMorfina.versao,
    );
    esperarConsistente();
  });

  it('F6: descarta os vencidos; recusa lote válido', async () => {
    const vencidos = (await listarLotesVencimento()).filter((l) => l.vencido);
    expect(vencidos).toHaveLength(2);
    const r = await descartarVencidos({
      loteIds: vencidos.map((l) => l.id),
      motivo: 'Validade expirada',
    });
    expect(r.lotes).toBe(2);
    expect(vencidos.every((l) => repoLotes.obter(l.id)!.quantidadeAtual === 0)).toBe(true);
    const valido = (await previaFefo(PARACETAMOL, 1)).lotes[0];
    expect(
      await erroDe(descartarVencidos({ loteIds: [valido.id], motivo: 'Teste' })),
    ).toBeInstanceOf(ErroValidacao);
    esperarConsistente();
  });

  it('F9: bloquear duas vezes é E-16; atividade registrada', async () => {
    const lote = (await previaFefo(PARACETAMOL, 1)).lotes[0];
    const b = await bloquearLote(lote.id, { motivo: 'Quarentena' }, lote.versao);
    expect(await erroDe(bloquearLote(lote.id, { motivo: 'Quarentena' }, b.versao))).toMatchObject({
      codigo: 'transicao_invalida',
    });
    expect(
      repoAtividades.todos().some((a) => a.tipo === 'lote_bloqueado' && a.referenciaId === lote.id),
    ).toBe(true);
  });
});

describe('leituras', () => {
  it('estoque: 3 baixo, 1 zerado; filtros e busca por princípio ativo', async () => {
    const baixo = await listarEstoque({ situacao: 'baixo', porPagina: 100 });
    expect(baixo.total).toBe(3);
    expect((await listarEstoque({ situacao: 'zerado', porPagina: 100 })).total).toBe(1);
    expect((await listarEstoque({ soControlados: true, porPagina: 100 })).total).toBe(4);
    expect((await listarEstoque({ busca: 'novalgina' })).itens[0].medicamento.nome).toBe(
      'Dipirona sódica',
    );
    expect((await listarEstoque({ situacao: 'vencidos', porPagina: 100 })).total).toBe(2);
  });

  it('detalhe do medicamento com lotes e indicação de movimentação', async () => {
    const d = await obterMedicamento(PARACETAMOL);
    expect(d.lotes.length).toBeGreaterThanOrEqual(2);
    expect(d.temMovimentacao).toBe(true);
  });

  it('movimentações filtradas por paciente; livro de controlados fecha o saldo (M28)', async () => {
    const p = await internarPaciente();
    await dispensar(
      pedido(p.id, [{ medicamentoId: MORFINA, quantidade: 2 }], [
        { tipo: 'controlado', medicamentoId: MORFINA },
      ] as never),
    );
    const movs = await listarMovimentacoes({ pacienteId: p.id });
    expect(movs.itens.every((x) => x.pacienteId === p.id)).toBe(true);
    const livro = await livroControlados(MORFINA, '2026-10-01', HOJE);
    expect(livro.saldoFinal).toBe(livro.saldoInicial + livro.entradas - livro.saidas);
    expect(livro.saldoFinal).toBe(
      repoLotes
        .todos()
        .filter((l) => l.medicamentoId === MORFINA)
        .reduce((s, l) => s + l.quantidadeAtual, 0),
    );
  });

  it('dispensações de exemplo coerentes', () => {
    expect(repoDispensacoes.todos().length).toBeGreaterThan(100);
    esperarConsistente();
  });
});
