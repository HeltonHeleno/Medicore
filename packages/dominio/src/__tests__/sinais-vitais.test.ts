import { avaliarSinais, faixaEtaria, pasMinima, pioraParaAlerta } from '../utils/sinais-vitais';

const campos = (sinais: Parameters<typeof avaliarSinais>[0], idade: number | null) =>
  avaliarSinais(sinais, idade).alertas.map((a) => a.campo);

describe('D18 — faixas etárias dos sinais vitais', () => {
  it('classifica a faixa pela idade', () => {
    expect(faixaEtaria(0)).toBe('menor_1');
    expect(faixaEtaria(0.9)).toBe('menor_1');
    expect(faixaEtaria(1)).toBe('de_1_a_5');
    expect(faixaEtaria(5)).toBe('de_1_a_5');
    expect(faixaEtaria(6)).toBe('de_6_a_11');
    expect(faixaEtaria(11)).toBe('de_6_a_11');
    expect(faixaEtaria(12)).toBe('adulto');
    expect(faixaEtaria(null)).toBe('adulto');
    expect(faixaEtaria(undefined)).toBe('adulto');
  });

  it('PAS mínima pediátrica = 70 + 2 × idade', () => {
    expect(pasMinima('de_1_a_5', 3)).toBe(76);
    expect(pasMinima('de_6_a_11', 10)).toBe(90);
    expect(pasMinima('menor_1', 0)).toBe(70);
    expect(pasMinima('adulto', 40)).toBe(90);
  });

  it('bebê de 11 meses: FC 100 e 180 nos limites não alertam; 99 e 181 alertam', () => {
    expect(campos({ fc: 100 }, 0)).toEqual([]);
    expect(campos({ fc: 180 }, 0)).toEqual([]);
    expect(campos({ fc: 99 }, 0)).toEqual(['fc']);
    expect(campos({ fc: 181 }, 0)).toEqual(['fc']);
    expect(campos({ fr: 60 }, 0)).toEqual([]);
    expect(campos({ fr: 61 }, 0)).toEqual(['fr']);
    expect(campos({ spo2: 92 }, 0)).toEqual([]);
    expect(campos({ spo2: 91 }, 0)).toEqual(['spo2']);
    expect(campos({ pas: 69 }, 0)).toEqual(['pas']);
  });

  it('criança de 5 e de 6 anos usam faixas diferentes', () => {
    // FC 150: normal aos 5 anos (até 160), alerta aos 6 (até 140).
    expect(campos({ fc: 150 }, 5)).toEqual([]);
    expect(campos({ fc: 150 }, 6)).toEqual(['fc']);
    // FR 35: normal aos 5 (até 40), alerta aos 6 (até 30).
    expect(campos({ fr: 35 }, 5)).toEqual([]);
    expect(campos({ fr: 35 }, 6)).toEqual(['fr']);
    // PAS mínima 80 aos 5 anos, 82 aos 6.
    expect(campos({ pas: 80 }, 5)).toEqual([]);
    expect(campos({ pas: 81 }, 6)).toEqual(['pas']);
  });

  it('adolescente de 12 anos usa a faixa de adulto (inclusive PAS alta e SpO₂ 90)', () => {
    expect(campos({ fc: 49 }, 12)).toEqual(['fc']);
    expect(campos({ fc: 131 }, 12)).toEqual(['fc']);
    expect(campos({ fr: 31 }, 12)).toEqual(['fr']);
    expect(campos({ pas: 89 }, 12)).toEqual(['pas']);
    expect(campos({ pas: 181 }, 40)).toEqual(['pas']);
    expect(campos({ spo2: 90 }, 40)).toEqual([]);
    expect(campos({ spo2: 89 }, 40)).toEqual(['spo2']);
  });

  it('temperatura para todas as idades: ≥ 39,5 e < 35', () => {
    expect(campos({ temperatura: 39.4 }, 30)).toEqual([]);
    expect(campos({ temperatura: 39.5 }, 30)).toEqual(['temperatura']);
    expect(campos({ temperatura: 35 }, 2)).toEqual([]);
    expect(campos({ temperatura: 34.9 }, 2)).toEqual(['temperatura']);
  });

  it('textos de alerta em PT-BR, com unidade', () => {
    const { alertas } = avaliarSinais({ spo2: 89, fc: 140, temperatura: 39.8 }, 40);
    expect(alertas.map((a) => a.texto)).toEqual([
      'Atenção: acima de 130 bpm',
      'Atenção: abaixo de 90%',
      'Atenção: 39,5 °C ou mais',
    ]);
  });

  it('provisório sem idade: faixa de adulto, com aviso', () => {
    expect(avaliarSinais({ fc: 150 }, null)).toMatchObject({ usandoFaixaAdulto: true });
    expect(avaliarSinais({ fc: 150 }, 30)).toMatchObject({ usandoFaixaAdulto: false });
  });

  it('E10: piora para a faixa de alerta', () => {
    expect(pioraParaAlerta({ spo2: 95 }, { spo2: 88 }, 40)).toBe(true);
    expect(pioraParaAlerta({ spo2: 88 }, { spo2: 87 }, 40)).toBe(false);
    expect(pioraParaAlerta(undefined, { fc: 80 }, 40)).toBe(false);
  });
});
