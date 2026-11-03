import {
  acimaDoPrazo,
  calcularPrazo,
  maisGrave,
  numeroAtendimento,
  ordenarFila,
  pesoRisco,
} from '../utils/fila';

const em = (hora: string) => `2026-11-10T${hora}:00.000Z`;

describe('A7 — prazo (R-E3, M20)', () => {
  it('primeira triagem: momento + tempo-alvo da cor', () => {
    expect(calcularPrazo({}, { risco: 'laranja', em: em('13:18') })).toBe(em('13:28'));
    expect(calcularPrazo({}, { risco: 'amarelo', em: em('13:00') })).toBe(em('14:00'));
    expect(calcularPrazo({}, { risco: 'vermelho', em: em('13:00') })).toBe(em('13:00'));
  });

  it('retriagem mais grave adianta o prazo (o menor dos dois)', () => {
    const atual = { risco: 'amarelo' as const, prazo: em('14:00') };
    expect(calcularPrazo(atual, { risco: 'laranja', em: em('13:30') })).toBe(em('13:40'));
    // Laranja às 13:55 daria 14:05, depois do prazo amarelo: fica 14:00.
    expect(calcularPrazo(atual, { risco: 'laranja', em: em('13:55') })).toBe(em('14:00'));
    expect(calcularPrazo(atual, { risco: 'vermelho', em: em('13:30') })).toBe(em('13:30'));
  });

  it('retriagem igual ou menos grave não adia o prazo', () => {
    const atual = { risco: 'vermelho' as const, prazo: em('13:00') };
    expect(calcularPrazo(atual, { risco: 'amarelo', em: em('13:10') })).toBe(em('13:00'));
    expect(calcularPrazo(atual, { risco: 'vermelho', em: em('13:10') })).toBe(em('13:00'));
  });

  it('pesos e gravidade', () => {
    expect(pesoRisco('vermelho')).toBe(0);
    expect(pesoRisco('azul')).toBe(4);
    expect(maisGrave('laranja', 'amarelo')).toBe(true);
    expect(maisGrave('verde', 'amarelo')).toBe(false);
  });

  it('acima do prazo só depois do prazo', () => {
    expect(acimaDoPrazo(em('13:28'), new Date(em('13:28')))).toBe(false);
    expect(acimaDoPrazo(em('13:28'), new Date(em('13:29')))).toBe(true);
    expect(acimaDoPrazo(undefined, new Date())).toBe(false);
  });
});

describe('A7 — ordem da fila (R-E4)', () => {
  const item = (
    numero: string,
    risco: 'vermelho' | 'laranja' | 'amarelo',
    prazo: string,
    chegada: string,
  ) => ({
    numero,
    risco,
    prazo: em(prazo),
    chegadaEm: em(chegada),
  });

  it('cor, depois prazo, depois chegada, depois número', () => {
    const fila = ordenarFila([
      item('E-0004', 'amarelo', '14:00', '13:00'),
      item('E-0003', 'laranja', '13:40', '13:30'),
      item('E-0002', 'laranja', '13:28', '13:18'),
      item('E-0005', 'vermelho', '13:50', '13:50'),
      item('E-0007', 'amarelo', '14:00', '12:58'),
      item('E-0006', 'amarelo', '14:00', '12:58'),
    ]);
    expect(fila.map((f) => f.numero)).toEqual([
      'E-0005',
      'E-0002',
      'E-0003',
      'E-0006',
      'E-0007',
      'E-0004',
    ]);
  });
});

describe('A8 — número do atendimento (R-E1)', () => {
  it('sequencial por dia no fuso do hospital, com 4 dígitos', () => {
    const existentes = [
      { numero: 'E-0001', chegadaEm: '2026-11-10T10:00:00-03:00' },
      { numero: 'E-0002', chegadaEm: '2026-11-10T23:59:00-03:00' },
      { numero: 'E-0042', chegadaEm: '2026-11-09T22:00:00-03:00' },
    ];
    expect(numeroAtendimento(existentes, '2026-11-10T23:59:30-03:00')).toBe('E-0003');
    // 00:00 em Brasília (03:00 UTC): novo dia, começa em 1 (o teste roda em UTC).
    expect(numeroAtendimento(existentes, '2026-11-11T00:00:00-03:00')).toBe('E-0001');
    expect(numeroAtendimento([], '2026-11-11T00:00:00-03:00')).toBe('E-0001');
  });

  it('chegada retroativa das 23:30 registrada depois da meia-noite entra no dia anterior', () => {
    const existentes = [{ numero: 'E-0042', chegadaEm: '2026-11-09T22:00:00-03:00' }];
    expect(numeroAtendimento(existentes, '2026-11-09T23:30:00-03:00')).toBe('E-0043');
  });

  it('usa o maior número do dia (nunca repete, mesmo com lacunas)', () => {
    const existentes = [
      { numero: 'E-0001', chegadaEm: '2026-11-10T08:00:00-03:00' },
      { numero: 'E-0005', chegadaEm: '2026-11-10T09:00:00-03:00' },
    ];
    expect(numeroAtendimento(existentes, '2026-11-10T09:30:00-03:00')).toBe('E-0006');
  });
});
