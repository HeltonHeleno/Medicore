import { setoresLeitos } from '../data/mock';
import {
  leitosDisponiveis,
  leitosOcupados,
  percentualOcupacao,
  resumoLeitos,
  totalLeitos,
} from '../utils/leitos';

describe('cálculos de leitos (dados mockados)', () => {
  it('soma 120 leitos no total', () => {
    expect(totalLeitos(setoresLeitos)).toBe(120);
  });

  it('soma 86 leitos ocupados', () => {
    expect(leitosOcupados(setoresLeitos)).toBe(86);
  });

  it('calcula 34 leitos disponíveis', () => {
    expect(leitosDisponiveis(setoresLeitos)).toBe(34);
  });

  it('calcula 72% de ocupação', () => {
    expect(percentualOcupacao(setoresLeitos)).toBe(72);
  });

  it('monta o resumo completo', () => {
    expect(resumoLeitos(setoresLeitos)).toEqual({
      total: 120,
      ocupados: 86,
      disponiveis: 34,
      percentual: 72,
    });
  });
});

describe('cálculos de leitos (casos limite)', () => {
  it('retorna zero sem setores, sem dividir por zero', () => {
    expect(resumoLeitos([])).toEqual({ total: 0, ocupados: 0, disponiveis: 0, percentual: 0 });
  });
});
