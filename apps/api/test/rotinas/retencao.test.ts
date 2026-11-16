/**
 * Fase 26 (26.2.1, 26.2.2, 26.2.3) — Retenção, rotina do dia e agendador contra o banco.
 * Porte de `apps/web/src/__tests__/retencao.test.ts`, com as diferenças do servidor:
 * sem teto por coleção (D15) e movimentações que nunca saem (R-F9).
 */
import { sql } from 'drizzle-orm';
import { vi } from 'vitest';
import { rotinas } from '../../src/banco/esquema';
import { executarRotinasDoDia } from '../../src/rotinas/agendador';
import type { ResultadoRetencao } from '../../src/servicos/operacoes/retencao';
import { ajustarRelogio } from '../apoio/cliente';
import { usarOperacoes } from '../apoio/operacoes';

const {
  api,
  repoAtendimentos,
  repoAtividades,
  repoDispensacoes,
  repoInternacoes,
  repoLotes,
  repoMovimentacoes,
  repoResumos,
  esperarConsistente,
  gravarPendentes,
  reler,
} = usarOperacoes('2026-11-10T10:30:00-03:00');

const registrarErro = vi.fn((_erro: unknown, _contexto?: unknown) => 'evento');

/** Uma volta do agendador; devolve o resultado da retenção (ou `null` se já rodou hoje). */
async function rodar(): Promise<ResultadoRetencao | null> {
  await gravarPendentes();
  const r = await executarRotinasDoDia(api().banco.app, registrarErro);
  await reler();
  return r.retencao === 'ja_executada' || !r.retencao ? null : r.retencao;
}

const ultimoDia = async (nome: string) =>
  (
    await api().banco.dono.execute<{ dia: string | null }>(
      sql`select to_char(ultimo_dia, 'YYYY-MM-DD') as dia from ${rotinas} where nome = ${nome}`,
    )
  ).rows[0]?.dia ?? null;

const somaResumos = (campo: 'internacoes' | 'dispensacoes') =>
  repoResumos.todos().reduce((s, r) => s + r[campo], 0);

beforeEach(() => registrarErro.mockClear());

describe('A15 — retenção no servidor', () => {
  it('roda uma vez por dia e de novo no dia seguinte (26.2.1)', async () => {
    expect(await rodar()).not.toBeNull();
    expect(await ultimoDia('retencao')).toBe('2026-11-10');
    expect(await ultimoDia('invariantes')).toBe('2026-11-10');
    expect(await rodar()).toBeNull();
    ajustarRelogio('2026-11-11T08:00:00-03:00');
    expect(await rodar()).not.toBeNull();
    esperarConsistente();
    expect(registrarErro).not.toHaveBeenCalled();
  });

  it('duas instâncias ao mesmo tempo: só uma roda (trava no banco)', async () => {
    const [a, b] = await Promise.all([
      executarRotinasDoDia(api().banco.app, registrarErro),
      executarRotinasDoDia(api().banco.app, registrarErro),
    ]);
    const rodaram = [a, b].filter((r) => r.retencao !== 'ja_executada');
    expect(rodaram).toHaveLength(1);
    expect([a, b].filter((r) => r.invariantes !== 'ja_executada')).toHaveLength(1);
  });

  it('soma nos resumos antes de remover (nada se perde nos totais)', async () => {
    ajustarRelogio('2026-11-25T08:00:00-03:00');
    const internacoesAntes =
      repoInternacoes.todos().filter((i) => !i.arquivado).length + somaResumos('internacoes');
    const dispensacoesAntes =
      repoDispensacoes.todos().filter((d) => !d.arquivado).length + somaResumos('dispensacoes');
    const r = (await rodar())!;
    expect(r.removidos.atendimentos + r.arquivados.atendimentos).toBeGreaterThan(0);
    const internacoesDepois =
      repoInternacoes.todos().filter((i) => !i.arquivado).length + somaResumos('internacoes');
    const dispensacoesDepois =
      repoDispensacoes.todos().filter((d) => !d.arquivado).length + somaResumos('dispensacoes');
    expect(internacoesDepois).toBe(internacoesAntes);
    expect(dispensacoesDepois).toBe(dispensacoesAntes);
    esperarConsistente();
  });

  it('nunca quebra referência: atendimento de internação ainda retida vira registro arquivado (M30)', async () => {
    const daEmergencia = repoInternacoes
      .todos()
      .find((i) => i.status === 'ativa' && i.atendimentoId)!;
    ajustarRelogio('2026-11-25T08:00:00-03:00');
    await rodar();
    expect(repoAtendimentos.obter(daEmergencia.atendimentoId!)).toMatchObject({
      arquivado: true,
      desfecho: { tipo: 'internacao', internacaoId: daEmergencia.id },
      triagens: [],
    });
    esperarConsistente();
  });

  it('R-F9: movimentações nunca saem; a dispensação que elas apontam é arquivada', async () => {
    ajustarRelogio('2027-01-20T08:00:00-03:00'); // +71 dias
    const antes = repoMovimentacoes.todos().length;
    const saldos = () => repoLotes.todos().map((l) => [l.id, l.saldoArquivado]);
    const saldosAntes = saldos();
    const r = (await rodar())!;
    expect(r.removidos).not.toHaveProperty('movimentacoes');
    expect(repoMovimentacoes.todos()).toHaveLength(antes);
    // Os lotes ficam (toda entrada é uma movimentação) e o saldo arquivado não muda.
    expect(saldos()).toEqual(saldosAntes);
    // Toda dispensação que uma movimentação aponta continua lá (arquivada, se antiga).
    expect(r.arquivados.dispensacoes).toBeGreaterThan(0);
    for (const m of repoMovimentacoes.todos()) {
      if (m.dispensacaoId) expect(repoDispensacoes.obter(m.dispensacaoId)).toBeDefined();
    }
    esperarConsistente();
  });

  it('D15: sem teto por coleção no servidor (só a idade conta)', async () => {
    const modelo = repoAtendimentos
      .todos()
      .find((a) => a.status === 'encerrado' && !a.desfecho?.internacaoId)!;
    const extras = Array.from({ length: 400 }, (_, i) => {
      const em = new Date(Date.now() - (i + 1) * 60_000).toISOString();
      return {
        ...modelo,
        id: `extra-${i}`,
        numero: `E-9${String(i).padStart(3, '0')}`,
        chegadaEm: em,
        desfecho: { ...modelo.desfecho!, em, registradoEm: em },
      };
    });
    repoAtendimentos.substituirTodos([...repoAtendimentos.todos(), ...extras]);
    await rodar();
    expect(repoAtendimentos.todos().filter((a) => a.id.startsWith('extra-'))).toHaveLength(400);
    esperarConsistente();
  });

  it('é uma transação: se falhar, nada muda e o dia é devolvido para a próxima volta', async () => {
    ajustarRelogio('2026-11-25T08:00:00-03:00');
    const antes = repoInternacoes.todos().length;
    const dono = api().banco.dono;
    await dono.execute(sql`revoke insert, update, delete on resumos from medicore_app`);
    try {
      expect(await rodar()).toBeNull();
    } finally {
      await dono.execute(sql`grant insert, update, delete on resumos to medicore_app`);
    }
    expect(repoInternacoes.todos()).toHaveLength(antes);
    expect(await ultimoDia('retencao')).toBeNull();
    expect(registrarErro).toHaveBeenCalledWith(expect.anything(), {
      tags: { rotina: 'retencao' },
    });
    // A invariantes rodou mesmo assim (uma rotina não impede a outra).
    expect(await ultimoDia('invariantes')).toBe('2026-11-25');
    expect(await rodar()).not.toBeNull();
  });

  it('rotina do dia: lote vencido gera a atividade uma vez (26.2.3)', async () => {
    await rodar(); // dia 10
    ajustarRelogio('2026-11-21T08:00:00-03:00');
    const vencendo = repoLotes.todos().find((l) => l.validade === '2026-11-20');
    await rodar();
    const atividades = repoAtividades.todos().filter((a) => a.tipo === 'lote_vencido');
    if (vencendo) expect(atividades.some((a) => a.referenciaId === vencendo.id)).toBe(true);
    else expect(atividades.length).toBeGreaterThan(0);
    ajustarRelogio('2026-11-22T08:00:00-03:00');
    const quantas = atividades.length;
    await rodar();
    expect(repoAtividades.todos().filter((a) => a.tipo === 'lote_vencido').length).toBe(quantas);
  });
});

describe('A17 — invariantes toda madrugada (26.2.4, BL-05.4)', () => {
  it('dados coerentes: nenhum evento', async () => {
    const r = await executarRotinasDoDia(api().banco.app, registrarErro);
    expect(r.invariantes).toEqual({ violacoes: 0 });
    expect(registrarErro).not.toHaveBeenCalled();
  });

  it('violação vira evento de erro com a invariante e os ids; nada é corrigido', async () => {
    const ocupado = (
      await api().banco.dono.execute<{ id: string; internacao_id: string }>(
        sql`select id, internacao_id from leitos where status = 'ocupado' and internacao_id is not null limit 1`,
      )
    ).rows[0]!;
    await api().banco.dono.execute(
      sql`update leitos set status = 'livre', internacao_id = null where id = ${ocupado.id}`,
    );
    const r = await executarRotinasDoDia(api().banco.app, registrarErro);
    expect(r.invariantes).toMatchObject({ violacoes: expect.any(Number) });
    const chamadas = registrarErro.mock.calls.filter(([, c]) => {
      const tags = (c as { tags?: Record<string, string> } | undefined)?.tags;
      return tags?.rotina === 'invariantes';
    });
    expect(chamadas.length).toBeGreaterThan(0);
    const [erro, contexto] = chamadas[0]!;
    expect(erro).toMatchObject({ name: 'ErroInvariante' });
    expect(String((erro as Error).message)).toMatch(/^Invariante INV-\d+ violada/);
    const ids = chamadas.flatMap(
      ([, c]) => (c as { contextos: { invariante: { ids: string[] } } }).contextos.invariante.ids,
    );
    expect(ids).toEqual(expect.arrayContaining([ocupado.id]));
    expect(contexto).toMatchObject({ tags: { invariante: expect.stringMatching(/^INV-/) } });
    // Nada é corrigido sozinho.
    const depois = (
      await api().banco.dono.execute<{ status: string }>(
        sql`select status from leitos where id = ${ocupado.id}`,
      )
    ).rows[0]!;
    expect(depois.status).toBe('livre');
  });
});
