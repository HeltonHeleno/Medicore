import { calcularIndicadores } from '../utils/indicadores';

describe('calcularIndicadores', () => {
  it('taxa de faltas = faltou ÷ (concluída + faltou); canceladas não contam como consulta', () => {
    const status = [
      'concluida',
      'concluida',
      'concluida',
      'faltou',
      'cancelada',
      'agendada',
    ] as const;
    expect(calcularIndicadores(status.map((s) => ({ status: s })))).toEqual({
      consultas: 5,
      taxaFaltas: 0.25,
      cancelamentos: 1,
    });
  });
  it('sem concluídas nem faltas, a taxa fica indefinida', () => {
    expect(calcularIndicadores([{ status: 'agendada' }]).taxaFaltas).toBeNull();
    expect(calcularIndicadores([])).toEqual({ consultas: 0, taxaFaltas: null, cancelamentos: 0 });
  });
});
