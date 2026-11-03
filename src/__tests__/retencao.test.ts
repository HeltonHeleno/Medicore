import { repoAtividades } from '../services/colecoes';
import {
  repoAtendimentos,
  repoDispensacoes,
  repoInternacoes,
  repoLotes,
  repoMovimentacoes,
  repoResumos,
} from '../services/colecoes-operacoes';
import { lerMeta } from '../services/repositorio';
import { executarRetencao } from '../services/retencao';
import { esperarConsistente, prepararOperacoes } from './utils/operacoes';
import { ajustarRelogio } from './utils/servicos';

prepararOperacoes('2026-11-10T10:30:00-03:00');

const somaResumos = (campo: 'internacoes' | 'dispensacoes') =>
  repoResumos.todos().reduce((s, r) => s + r[campo], 0);

describe('A15 — retenção', () => {
  it('roda uma vez por dia e de novo no dia seguinte', () => {
    expect(executarRetencao()).not.toBeNull();
    expect(lerMeta('retencaoEm')).toBe('2026-11-10');
    expect(executarRetencao()).toBeNull();
    ajustarRelogio('2026-11-11T08:00:00-03:00');
    expect(executarRetencao()).not.toBeNull();
    esperarConsistente();
  });

  it('soma nos resumos antes de remover (nada se perde nos totais)', () => {
    ajustarRelogio('2026-11-25T08:00:00-03:00'); // +15 dias: atendimentos e parte das internações passam da retenção
    const internacoesAntes =
      repoInternacoes.todos().filter((i) => !i.arquivado).length + somaResumos('internacoes');
    const dispensacoesAntes =
      repoDispensacoes.todos().filter((d) => !d.arquivado).length + somaResumos('dispensacoes');
    const r = executarRetencao()!;
    expect(r.removidos.atendimentos + r.arquivados.atendimentos).toBeGreaterThan(0);
    const internacoesDepois =
      repoInternacoes.todos().filter((i) => !i.arquivado).length + somaResumos('internacoes');
    const dispensacoesDepois =
      repoDispensacoes.todos().filter((d) => !d.arquivado).length + somaResumos('dispensacoes');
    expect(internacoesDepois).toBe(internacoesAntes);
    expect(dispensacoesDepois).toBe(dispensacoesAntes);
    esperarConsistente();
  });

  it('nunca quebra referência: atendimento de internação ainda retida vira registro arquivado (M30)', () => {
    const daEmergencia = repoInternacoes
      .todos()
      .find((i) => i.status === 'ativa' && i.atendimentoId)!;
    ajustarRelogio('2026-11-25T08:00:00-03:00');
    executarRetencao();
    const a = repoAtendimentos.obter(daEmergencia.atendimentoId!);
    expect(a).toMatchObject({
      arquivado: true,
      desfecho: { tipo: 'internacao', internacaoId: daEmergencia.id },
      triagens: [],
    });
    esperarConsistente();
  });

  it('movimentações antigas vão para o saldo arquivado do lote (INV-7)', () => {
    ajustarRelogio('2027-01-20T08:00:00-03:00'); // +71 dias
    const antes = repoMovimentacoes.todos().length;
    const r = executarRetencao()!;
    expect(r.removidos.movimentacoes).toBeGreaterThan(0);
    expect(repoMovimentacoes.todos().length).toBe(antes - r.removidos.movimentacoes);
    expect(repoLotes.todos().some((l) => l.saldoArquivado > 0)).toBe(true);
    esperarConsistente();
  });

  it('respeita o teto da coleção (mais antigos saem primeiro)', () => {
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
    executarRetencao({ forcar: true });
    // Os ainda referenciados ficam como registros arquivados (nunca quebra referência).
    expect(repoAtendimentos.todos().filter((a) => !a.arquivado).length).toBeLessThanOrEqual(400);
    expect(repoAtendimentos.todos().some((a) => a.id === 'extra-399')).toBe(false); // o mais antigo saiu
    esperarConsistente();
  });

  it('é uma transação: se falhar, nada muda', () => {
    ajustarRelogio('2026-11-25T08:00:00-03:00');
    const antes = repoInternacoes.todos().length;
    const original = repoResumos.substituirTodos;
    repoResumos.substituirTodos = () => {
      throw new Error('falha simulada');
    };
    try {
      expect(() => executarRetencao()).toThrow('falha simulada');
    } finally {
      repoResumos.substituirTodos = original;
    }
    expect(repoInternacoes.todos().length).toBe(antes);
    expect(lerMeta('retencaoEm')).toBeUndefined();
  });

  it('rotina do dia: lote vencido gera a atividade uma vez', () => {
    executarRetencao(); // dia 10
    ajustarRelogio('2026-11-21T08:00:00-03:00');
    const vencendo = repoLotes.todos().find((l) => l.validade === '2026-11-20');
    executarRetencao();
    const atividades = repoAtividades.todos().filter((a) => a.tipo === 'lote_vencido');
    if (vencendo) expect(atividades.some((a) => a.referenciaId === vencendo.id)).toBe(true);
    else expect(atividades.length).toBeGreaterThan(0);
    ajustarRelogio('2026-11-22T08:00:00-03:00');
    const quantas = atividades.length;
    executarRetencao();
    expect(repoAtividades.todos().filter((a) => a.tipo === 'lote_vencido').length).toBe(quantas);
  });
});
