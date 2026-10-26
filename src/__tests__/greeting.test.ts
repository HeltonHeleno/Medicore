import { saudacaoPorHora } from '../hooks/useGreeting';

describe('saudacaoPorHora', () => {
  it.each([
    [0, 'Boa noite'],
    [4, 'Boa noite'],
    [5, 'Bom dia'],
    [11, 'Bom dia'],
    [12, 'Boa tarde'],
    [17, 'Boa tarde'],
    [18, 'Boa noite'],
    [23, 'Boa noite'],
  ])('às %ih diz "%s"', (hora, esperado) => {
    expect(saudacaoPorHora(hora)).toBe(esperado);
  });
});
