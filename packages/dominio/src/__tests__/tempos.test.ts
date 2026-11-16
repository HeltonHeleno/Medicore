import {
  dentroDaJanela,
  diaDeInternacao,
  diasParaVencer,
  estaVencido,
  excessoMin,
  formatarDuracao,
  formatarEspera,
  formatarPrazo,
  limiteDaJanela,
  minutosDesde,
  permanencia,
  textoValidade,
} from '../utils/tempos';

describe('utils/tempos (roda em TZ=UTC; o fuso do hospital é America/Sao_Paulo)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T10:30:00-03:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('formata espera e duração', () => {
    expect(formatarDuracao(0)).toBe('0 min');
    expect(formatarDuracao(12)).toBe('12 min');
    expect(formatarDuracao(65)).toBe('1 h 05 min');
    expect(formatarDuracao(47 * 60 + 59)).toBe('47 h 59 min');
    expect(formatarDuracao(3 * 24 * 60)).toBe('3 dias');
    expect(formatarEspera(12)).toBe('há 12 min');
    expect(formatarEspera(65)).toBe('há 1 h 05 min');
  });

  it('minutos desde um instante (nunca negativo) e excesso sobre o prazo', () => {
    expect(minutosDesde('2026-11-10T10:18:00-03:00')).toBe(12);
    expect(minutosDesde('2026-11-10T10:40:00-03:00')).toBe(0);
    expect(excessoMin('2026-11-10T10:28:00-03:00')).toBe(2);
    expect(excessoMin('2026-11-10T10:31:00-03:00')).toBe(0);
  });

  it('prazo na hora do hospital', () => {
    expect(formatarPrazo('2026-11-10T13:28:00Z')).toBe('até 10:28');
  });

  it('dia de internação: o dia da entrada é o dia 1, contado no fuso do hospital', () => {
    // 23:50 em Brasília = 02:50 UTC do dia seguinte.
    const inicio = '2026-11-09T23:50:00-03:00';
    expect(diaDeInternacao(inicio, '2026-11-09T23:59:00-03:00')).toBe(1);
    expect(diaDeInternacao(inicio, '2026-11-10T00:10:00-03:00')).toBe(2);
    expect(diaDeInternacao(inicio)).toBe(2);
    expect(permanencia('2026-11-04T08:00:00-03:00', '2026-11-09T15:00:00-03:00')).toBe(6);
  });

  it('validade: vence no fim do dia; textos', () => {
    expect(estaVencido('2026-11-10')).toBe(false);
    expect(estaVencido('2026-11-09')).toBe(true);
    expect(diasParaVencer('2026-11-22')).toBe(12);
    expect(textoValidade('2026-11-10')).toBe('Vence hoje');
    expect(textoValidade('2026-11-11')).toBe('Vence amanhã');
    expect(textoValidade('2026-11-22')).toBe('Vence em 12 dias');
    expect(textoValidade('2026-11-09')).toBe('Venceu ontem');
    expect(textoValidade('2026-11-07')).toBe('Venceu há 3 dias');
  });

  it('janela de correção: exatamente no limite ainda vale', () => {
    const registro = '2026-11-10T04:30:00-03:00';
    expect(limiteDaJanela(registro, 6)).toBe('2026-11-10T13:30:00.000Z');
    expect(dentroDaJanela(registro, 6)).toBe(true);
    expect(dentroDaJanela(registro, 6, '2026-11-10T10:30:01-03:00')).toBe(false);
  });
});
