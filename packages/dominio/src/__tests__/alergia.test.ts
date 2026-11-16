import { alergiasNaoInformadas, correspondenciaAlergia, termos } from '../utils/alergia';

const amoxicilina = { nome: 'Amoxicilina', principioAtivo: 'Amoxicilina', classe: 'Penicilinas' };
const dipirona = {
  nome: 'Dipirona sódica',
  principioAtivo: 'Dipirona sódica',
  classe: 'Analgésicos',
};
const ibuprofeno = { nome: 'Ibuprofeno', principioAtivo: 'Ibuprofeno', classe: 'AINE' };
const paracetamol = { nome: 'Paracetamol', principioAtivo: 'Paracetamol', classe: 'Analgésicos' };

describe('A10 — correspondência de alergia', () => {
  it('separa por ; , / e " e ", sem acentos, ignorando palavras com menos de 4 letras', () => {
    expect(termos('Penicilina; látex')).toEqual(['penicilina', 'latex']);
    expect(termos('Dipirona, AAS / iodo e AINEs')).toEqual(['dipirona', 'iodo', 'aines']);
    expect(termos('')).toEqual([]);
    expect(termos(undefined)).toEqual([]);
  });

  it('"Penicilina" × classe "Penicilinas" (plural)', () => {
    expect(correspondenciaAlergia('Penicilina; látex', amoxicilina)).toEqual({
      termo: 'penicilina',
      campo: 'classe',
      candidato: 'penicilinas',
    });
  });

  it('"dipirona" × "Dipirona sódica" (acento e palavra extra)', () => {
    expect(correspondenciaAlergia('DIPIRONA', dipirona)).toMatchObject({
      termo: 'dipirona',
      campo: 'principioAtivo',
    });
    expect(
      correspondenciaAlergia('dipirona sodica', { ...dipirona, principioAtivo: 'Dipirona' }),
    ).toMatchObject({ campo: 'principioAtivo' });
  });

  it('"AINEs" × classe "AINE"', () => {
    expect(correspondenciaAlergia('AINEs', ibuprofeno)).toMatchObject({ campo: 'classe' });
  });

  it('sem correspondência e sem alergias informadas', () => {
    expect(correspondenciaAlergia('Penicilina', paracetamol)).toBeNull();
    expect(correspondenciaAlergia(undefined, amoxicilina)).toBeNull();
    expect(correspondenciaAlergia('   ', amoxicilina)).toBeNull();
    expect(correspondenciaAlergia('AAS', paracetamol)).toBeNull(); // < 4 letras: ignorado
  });

  it('R-F15: vazio é "não informado"', () => {
    expect(alergiasNaoInformadas(undefined)).toBe(true);
    expect(alergiasNaoInformadas('  ')).toBe(true);
    expect(alergiasNaoInformadas('Iodo')).toBe(false);
  });
});
