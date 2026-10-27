import {
  cepValido,
  cpfValido,
  crmValido,
  emailValido,
  telefoneValido,
  ufValida,
} from '../utils/validacao';

describe('cpfValido', () => {
  it.each(['529.982.247-25', '52998224725', '111.444.777-35', '390.533.447-05', '153.509.460-56'])(
    'aceita %s',
    (cpf) => expect(cpfValido(cpf)).toBe(true),
  );
  it.each([
    ['dígito verificador errado', '529.982.247-24'],
    ['segundo dígito errado', '111.444.777-36'],
    ['sequência repetida', '111.111.111-11'],
    ['zeros', '00000000000'],
    ['curto', '5299822472'],
    ['longo', '529982247251'],
    ['vazio', ''],
  ])('recusa: %s', (_, cpf) => expect(cpfValido(cpf)).toBe(false));
});

describe('telefoneValido', () => {
  it.each(['(11) 98765-4321', '11987654321', '(21) 3456-7890', '4733334444', '99912345678'])(
    'aceita %s',
    (tel) => expect(telefoneValido(tel)).toBe(true),
  );
  it.each([
    ['DDD menor que 11', '(10) 98765-4321'],
    ['celular sem 9', '(11) 88765-4321'],
    ['fixo começando com 9', '(11) 9876-5432'],
    ['fixo começando com 6', '(11) 6876-5432'],
    ['curto', '119876543'],
    ['longo', '119876543210'],
  ])('recusa: %s', (_, tel) => expect(telefoneValido(tel)).toBe(false));
});

describe('outros documentos', () => {
  it('CEP com e sem máscara', () => {
    expect(cepValido('01310-100')).toBe(true);
    expect(cepValido('01310100')).toBe(true);
    expect(cepValido('0131010')).toBe(false);
  });
  it('e-mail', () => {
    expect(emailValido(' ana@exemplo.com.br ')).toBe(true);
    expect(emailValido('ana@exemplo')).toBe(false);
    expect(emailValido('ana exemplo@x.com')).toBe(false);
  });
  it('CRM de 4 a 7 dígitos com UF válida', () => {
    expect(crmValido('1234', 'SP')).toBe(true);
    expect(crmValido('1234567', 'RJ')).toBe(true);
    expect(crmValido('123', 'SP')).toBe(false);
    expect(crmValido('12345678', 'SP')).toBe(false);
    expect(crmValido('12.345', 'SP')).toBe(false);
    expect(crmValido('123456', 'XX')).toBe(false);
  });
  it('UF', () => {
    expect(ufValida('DF')).toBe(true);
    expect(ufValida('sp')).toBe(false);
  });
});
