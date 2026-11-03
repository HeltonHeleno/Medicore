import type { Lote } from '../types';
import { devolucaoPorLote, disponivelDe, ordemFefo, planejarFefo } from '../utils/fefo';

const HOJE = '2026-11-10';
let n = 0;
const lote = (validade: string, quantidadeAtual: number, extra: Partial<Lote> = {}): Lote => ({
  id: `lote-${++n}`,
  medicamentoId: 'med-1',
  numero: `L${n}`,
  validade,
  quantidadeInicial: quantidadeAtual,
  quantidadeAtual,
  entradaEm: `2026-10-0${(n % 9) + 1}T10:00:00Z`,
  saldoArquivado: 0,
  criadoEm: '',
  atualizadoEm: '',
  versao: 1,
  ...extra,
});

describe('A9 — FEFO', () => {
  it('lote vencendo hoje entra; vencido ontem, bloqueado e zerado não', () => {
    const hoje = lote('2026-11-10', 5);
    const ontem = lote('2026-11-09', 50);
    const bloqueado = lote('2026-11-20', 50, {
      bloqueio: { motivo: 'Recolhimento', em: '', autor: '' },
    });
    const zerado = lote('2026-11-15', 0);
    const depois = lote('2026-12-01', 10);
    const todos = [depois, ontem, bloqueado, zerado, hoje];
    expect(ordemFefo(todos, HOJE).map((l) => l.id)).toEqual([hoje.id, depois.id]);
    expect(disponivelDe(todos, HOJE)).toBe(15);
  });

  it('divide entre 2 e 3 lotes, na ordem de validade', () => {
    const a = lote('2026-12-10', 2);
    const b = lote('2027-02-02', 3);
    const c = lote('2027-03-01', 10);
    expect(planejarFefo([c, b, a], 5, HOJE)).toEqual({
      alocacoes: [
        { loteId: a.id, quantidade: 2 },
        { loteId: b.id, quantidade: 3 },
      ],
      disponivel: 15,
      falta: 0,
    });
    expect(planejarFefo([c, b, a], 7, HOJE).alocacoes).toEqual([
      { loteId: a.id, quantidade: 2 },
      { loteId: b.id, quantidade: 3 },
      { loteId: c.id, quantidade: 2 },
    ]);
  });

  it('mesma validade: desempata pela entrada mais antiga', () => {
    const novo = lote('2026-12-10', 5, { entradaEm: '2026-10-09T10:00:00Z' });
    const antigo = lote('2026-12-10', 5, { entradaEm: '2026-10-01T10:00:00Z' });
    expect(planejarFefo([novo, antigo], 3, HOJE).alocacoes[0].loteId).toBe(antigo.id);
  });

  it('pedido maior que o disponível: informa o que falta', () => {
    const a = lote('2026-12-10', 4);
    expect(planejarFefo([a], 6, HOJE)).toMatchObject({ disponivel: 4, falta: 2 });
  });
});

describe('F4 — devolução na ordem inversa da saída', () => {
  const saida = [
    { loteId: 'A', quantidade: 2 },
    { loteId: 'B', quantidade: 3 },
  ];
  it('o último lote usado devolve primeiro', () => {
    expect(devolucaoPorLote(saida, 0, 1)).toEqual([{ loteId: 'B', quantidade: 1 }]);
    expect(devolucaoPorLote(saida, 0, 4)).toEqual([
      { loteId: 'B', quantidade: 3 },
      { loteId: 'A', quantidade: 1 },
    ]);
  });
  it('considera o que já foi devolvido', () => {
    expect(devolucaoPorLote(saida, 3, 2)).toEqual([{ loteId: 'A', quantidade: 2 }]);
    expect(devolucaoPorLote(saida, 1, 3)).toEqual([
      { loteId: 'B', quantidade: 2 },
      { loteId: 'A', quantidade: 1 },
    ]);
  });
});
