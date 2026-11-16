/**
 * Fase 26 (26.T.3, R-API3) — Concorrência real: várias gravações ao mesmo tempo, cada uma na sua
 * transação. Cada cenário roda 3 vezes.
 */
import { ErroConflito } from '@medicore/dominio/erros';
import { gravar, estatisticas } from '../../src/servicos/operacoes/unidade';
import { repoLeitos } from '../../src/servicos/operacoes/repos';
import { erroDe } from '../apoio/cliente';
import { usarOperacoes } from '../apoio/operacoes';

const {
  api,
  cliente,
  repoAtendimentos,
  repoInternacoes,
  repoLotes,
  repoPacientes,
  esperarConsistente,
  leitoLivre,
  pacienteLivre,
  medicoClinico,
  agoraIso,
} = usarOperacoes('2026-11-10T10:30:00-03:00');

const RODADAS = [1, 2, 3];

/** Separa sucessos e erros de várias promessas. */
async function todas<T>(promessas: Promise<T>[]) {
  const r = await Promise.allSettled(promessas);
  return {
    ok: r
      .filter((x): x is PromiseFulfilledResult<Awaited<T>> => x.status === 'fulfilled')
      .map((x) => x.value),
    erros: r
      .filter((x): x is PromiseRejectedResult => x.status === 'rejected')
      .map((x) => x.reason as ErroConflito),
  };
}

const internacao = (pacienteId: string, leitoId: string) => ({
  pacienteId,
  origem: 'eletiva' as const,
  precaucao: 'padrao' as const,
  leitoId,
  medicoResponsavelId: medicoClinico().id,
  motivo: 'Pneumonia comunitária',
  inicio: agoraIso(),
});

describe.each(RODADAS)('rodada %i', () => {
  it('E-11: cinco internações no mesmo leito ao mesmo tempo — uma entra, as outras recebem E-11', async () => {
    const leito = leitoLivre('enfermaria', { isolamento: false });
    const pacientes = [0, 1, 2, 3, 4].map((pular) => pacienteLivre({ pular }).id);
    const { ok, erros } = await todas(
      pacientes.map((p) => cliente.internar(internacao(p, leito.id))),
    );
    expect(ok).toHaveLength(1);
    expect(erros).toHaveLength(4);
    for (const e of erros) expect(e).toMatchObject({ codigo: 'leito_indisponivel' });
    expect(
      repoInternacoes.todos().filter((i) => i.leitoId === leito.id && i.status === 'ativa'),
    ).toHaveLength(1);
    esperarConsistente();
  });

  it('E-14: o mesmo paciente em dois leitos ao mesmo tempo — só uma internação', async () => {
    const p = pacienteLivre().id;
    const leitos = [0, 1, 2].map((pular) => leitoLivre('enfermaria', { isolamento: false, pular }));
    const { ok, erros } = await todas(leitos.map((l) => cliente.internar(internacao(p, l.id))));
    expect(ok).toHaveLength(1);
    for (const e of erros) expect(e).toMatchObject({ codigo: 'paciente_internado' });
    esperarConsistente();
  });

  it('E-12: duas dispensações do último estoque — uma sai, a outra recebe E-12 e nada fica negativo', async () => {
    const [p1, p2] = [0, 1].map((pular) => pacienteLivre({ pular }));
    const leitos = [0, 1].map((pular) => leitoLivre('enfermaria', { isolamento: false, pular }));
    await cliente.internar(internacao(p1!.id, leitos[0]!.id));
    await cliente.internar(internacao(p2!.id, leitos[1]!.id));
    const id = 'med-loratadina-10';
    const disponivel = (await cliente.obterMedicamento(id)).estoque.disponivel;
    expect(disponivel).toBeGreaterThan(0);
    const confirmar =
      disponivel > 60 ? [{ tipo: 'quantidade_alta' as const, medicamentoId: id }] : [];
    const pedido = (pacienteId: string) =>
      cliente.dispensar({
        pacienteId,
        medicoSolicitanteId: medicoClinico().id,
        itens: [{ medicamentoId: id, quantidade: disponivel }],
        alertasConfirmados: confirmar,
      } as never);
    const { ok, erros } = await todas([pedido(p1!.id), pedido(p2!.id)]);
    expect(ok).toHaveLength(1);
    expect(erros).toHaveLength(1);
    expect(erros[0]).toMatchObject({ codigo: 'estoque_insuficiente', detalhes: { disponivel: 0 } });
    expect((await cliente.obterMedicamento(id)).estoque.disponivel).toBe(0);
    expect(repoLotes.todos().every((l) => l.quantidadeAtual >= 0)).toBe(true);
    esperarConsistente();
  });

  it('A8: oito chegadas ao mesmo tempo recebem números diferentes e seguidos', async () => {
    const pacientes = [0, 1, 2, 3, 4, 5, 6, 7].map((pular) => pacienteLivre({ pular }).id);
    const { ok, erros } = await todas(
      pacientes.map((pacienteId) =>
        cliente.registrarChegada({
          pacienteId,
          modoChegada: 'meios_proprios',
          queixa: 'Dor abdominal',
          chegadaEm: agoraIso(),
        }),
      ),
    );
    expect(erros).toEqual([]);
    const numeros = ok.map((a) => Number(a.numero.slice(2))).sort((a, b) => a - b);
    expect(new Set(numeros).size).toBe(8);
    expect(numeros.at(-1)! - numeros[0]!).toBe(7);
    esperarConsistente();
  });

  it('R-X2 entre módulos: inativar o paciente enquanto ele é internado nunca deixa internação de inativo', async () => {
    const p = pacienteLivre();
    const leito = leitoLivre('enfermaria', { isolamento: false });
    await todas<unknown>([
      cliente.internar(internacao(p.id, leito.id)),
      cliente.inativarPaciente(p.id, 'Mudou de cidade'),
    ]);
    const paciente = repoPacientes.obter(p.id)!;
    const ativa = repoInternacoes
      .todos()
      .find((i) => i.pacienteId === p.id && i.status === 'ativa');
    // Ou a internação entrou e a inativação recusou (pendência), ou o contrário.
    expect(Boolean(ativa) && !paciente.ativo).toBe(false);
    expect(Boolean(ativa) || !paciente.ativo).toBe(true);
    esperarConsistente();
  });

  it('chamar o mesmo atendimento por dois médicos ao mesmo tempo: um chama, o outro recebe E-16', async () => {
    const a = repoAtendimentos.todos().find((x) => x.status === 'aguardando_atendimento')!;
    const { ok, erros } = await todas([
      cliente.chamar(a.id, medicoClinico().id, a.versao),
      cliente.chamar(a.id, 'med-marcos-ribeiro', a.versao),
    ]);
    expect(ok).toHaveLength(1);
    // Como uma depois da outra: a segunda vê o atendimento já chamado (a situação vem antes da versão).
    expect(erros[0]).toMatchObject({ codigo: 'transicao_invalida' });
  });
});

describe('R-API3: nova tentativa em conflito de serialização', () => {
  const conflito = () => Object.assign(new Error('could not serialize access'), { code: '40001' });

  it('tenta de novo e conclui (o que foi feito na tentativa que falhou não fica)', async () => {
    const antes = estatisticas.novasTentativas;
    // A operação também roda de novo quando falta ler algo do banco; só os conflitos contam aqui.
    let conflitos = 0;
    const leito = leitoLivre('enfermaria');
    const r = await gravar(api().banco.app, 'internacao', () => {
      repoLeitos.atualizar(leito.id, { quarto: `Q${conflitos}` });
      if (conflitos < 2) {
        conflitos++;
        throw conflito();
      }
      return repoLeitos.obter(leito.id)!.quarto;
    });
    expect(r).toBe('Q2');
    expect(estatisticas.novasTentativas - antes).toBe(2);
    const lido = await cliente.obterLeito(leito.id);
    expect(lido).toMatchObject({ quarto: 'Q2', versao: leito.versao + 1 });
  });

  it('depois de 3 novas tentativas, E-16 (a situação mudou) e nada é gravado', async () => {
    const leito = leitoLivre('enfermaria');
    let conflitos = 0;
    const erro = await erroDe(
      gravar(api().banco.app, 'internacao', () => {
        repoLeitos.atualizar(leito.id, { quarto: 'X' });
        conflitos++;
        throw conflito();
      }),
    );
    expect(conflitos).toBe(4);
    expect(erro).toBeInstanceOf(ErroConflito);
    expect(erro).toMatchObject({ codigo: 'transicao_invalida' });
    expect((await cliente.obterLeito(leito.id)).versao).toBe(leito.versao);
  });

  it('um erro de regra não é repetido', async () => {
    let vezes = 0;
    await erroDe(
      gravar(api().banco.app, 'internacao', () => {
        vezes++;
        throw new ErroConflito('transicao_invalida', 'não');
      }),
    );
    expect(vezes).toBe(1);
  });
});
