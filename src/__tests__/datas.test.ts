import { vi } from 'vitest';
import {
  dataDoInstante,
  dataValida,
  deDataBr,
  diaDaSemana,
  diferencaDias,
  formatarData,
  formatarDataCurta,
  formatarDataExtenso,
  hojeNoFuso,
  horaDoInstante,
  horaDosMinutos,
  idade,
  instanteNoFuso,
  minutosDaHora,
  somarDias,
} from '../utils/datas';

afterEach(() => vi.useRealTimers());

describe('ambiente de teste', () => {
  it('roda em UTC (para provar que o código não depende do fuso do computador)', () => {
    expect(new Date(0).getTimezoneOffset()).toBe(0);
  });
});

describe('dia no fuso do hospital', () => {
  it('00:30 de Brasília ainda é o dia de Brasília, mesmo já sendo 03:30 em UTC', () => {
    expect(dataDoInstante('2026-10-27T03:30:00Z')).toBe('2026-10-27');
    expect(dataDoInstante('2026-10-27T02:30:00Z')).toBe('2026-10-26');
    expect(horaDoInstante('2026-10-27T02:30:00Z')).toBe('23:30');
  });

  it('hojeNoFuso usa o relógio da aplicação', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T01:00:00Z')); // 22:00 do dia 26 em Brasília
    expect(hojeNoFuso()).toBe('2026-10-26');
  });
});

describe('instanteNoFuso', () => {
  it('monta o instante UTC de uma data + hora de Brasília', () => {
    expect(instanteNoFuso('2026-10-26', '10:30').toISOString()).toBe('2026-10-26T13:30:00.000Z');
    expect(instanteNoFuso('2026-10-26', '23:00').toISOString()).toBe('2026-10-27T02:00:00.000Z');
  });

  it('ida e volta preserva data e hora', () => {
    const i = instanteNoFuso('2027-02-15', '08:05');
    expect(dataDoInstante(i)).toBe('2027-02-15');
    expect(horaDoInstante(i)).toBe('08:05');
  });

  it('respeita o horário de verão histórico (2018: -02:00)', () => {
    expect(instanteNoFuso('2018-12-10', '10:00').toISOString()).toBe('2018-12-10T12:00:00.000Z');
  });
});

describe('idade', () => {
  it('na véspera do aniversário ainda não completou', () => {
    expect(idade('1990-10-27', '2026-10-26')).toBe(35);
    expect(idade('1990-10-27', '2026-10-27')).toBe(36);
  });

  it('nascido em 29/02 completa em 28/02 nos anos não bissextos', () => {
    expect(idade('2008-02-29', '2026-02-27')).toBe(17);
    expect(idade('2008-02-29', '2026-02-28')).toBe(18);
    expect(idade('2008-02-29', '2028-02-28')).toBe(19);
    expect(idade('2008-02-29', '2028-02-29')).toBe(20);
  });
});

describe('calendário', () => {
  it('dia da semana não depende de fuso', () => {
    expect(diaDaSemana('2026-10-26')).toBe(1); // segunda
    expect(diaDaSemana('2026-11-01')).toBe(0); // domingo
  });

  it('soma e diferença de dias atravessando meses e anos', () => {
    expect(somarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(diferencaDias('2026-10-26', '2027-04-24')).toBe(180);
  });

  it('valida datas reais', () => {
    expect(dataValida('2026-02-31')).toBe(false);
    expect(dataValida('2028-02-29')).toBe(true);
    expect(dataValida('26/10/2026')).toBe(false);
  });
});

describe('formatação', () => {
  it('formata datas sem passar por fuso', () => {
    expect(formatarData('2026-01-01')).toBe('01/01/2026');
    expect(formatarDataExtenso('2026-10-26')).toBe('segunda-feira, 26 de outubro');
    expect(formatarDataCurta('2026-10-29')).toMatch(/^qui\.?, 29\/10$/);
  });

  it('converte dd/mm/aaaa e horas', () => {
    expect(deDataBr('26/10/2026')).toBe('2026-10-26');
    expect(deDataBr('31/02/2026')).toBeNull();
    expect(minutosDaHora('12:30')).toBe(750);
    expect(horaDosMinutos(750)).toBe('12:30');
  });
});
