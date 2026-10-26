import { formatHora, formatNumero, formatPercentual, formatVariacao } from '../utils/format';

describe('formatNumero', () => {
  it('usa ponto como separador de milhar', () => {
    expect(formatNumero(1248)).toBe('1.248');
    expect(formatNumero(1234567)).toBe('1.234.567');
    expect(formatNumero(42)).toBe('42');
  });
});

describe('formatPercentual', () => {
  it('formata sem espaço antes do %', () => {
    expect(formatPercentual(72)).toBe('72%');
  });

  it('usa vírgula como separador decimal', () => {
    expect(formatPercentual(71.67, 1)).toBe('71,7%');
  });
});

describe('formatHora', () => {
  it('formata em 24h no fuso local', () => {
    expect(formatHora(new Date(2026, 9, 26, 16, 0).toISOString())).toBe('16:00');
    expect(formatHora(new Date(2026, 9, 26, 9, 5).toISOString())).toBe('09:05');
  });
});

describe('formatVariacao', () => {
  it('mostra seta para cima quando positiva', () => {
    expect(formatVariacao(12)).toBe('↑ 12%');
  });

  it('mostra seta para baixo e valor absoluto quando negativa', () => {
    expect(formatVariacao(-5)).toBe('↓ 5%');
  });

  it('não mostra seta quando zero', () => {
    expect(formatVariacao(0)).toBe('0%');
  });
});
