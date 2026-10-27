import {
  formatarCrm,
  mascararCep,
  mascararCpf,
  mascararTelefone,
  ocultarCpf,
  posicaoAposDigitos,
} from '../utils/mascaras';

describe('máscaras de exibição', () => {
  it('CPF completo, parcial e com sujeira', () => {
    expect(mascararCpf('52998224725')).toBe('529.982.247-25');
    expect(mascararCpf('529.982.247-25')).toBe('529.982.247-25');
    expect(mascararCpf('5299')).toBe('529.9');
    expect(mascararCpf('5299822')).toBe('529.982.2');
    expect(mascararCpf('529982247')).toBe('529.982.247');
  });

  it('R-P4: CPF oculto nas listas', () => {
    expect(ocultarCpf('52998224725')).toBe('***.982.247-**');
    expect(ocultarCpf('123')).toBe('***.***.***-**');
  });

  it('telefone celular, fixo e parcial', () => {
    expect(mascararTelefone('11987654321')).toBe('(11) 98765-4321');
    expect(mascararTelefone('1134567890')).toBe('(11) 3456-7890');
    expect(mascararTelefone('113')).toBe('(11) 3');
    expect(mascararTelefone('1')).toBe('1');
  });

  it('CEP e CRM', () => {
    expect(mascararCep('01310100')).toBe('01310-100');
    expect(mascararCep('013')).toBe('013');
    expect(formatarCrm({ numero: '123456', uf: 'SP' })).toBe('123456/SP');
  });
});

describe('máscaras durante a digitação', () => {
  it('formata cada etapa da digitação do CPF', () => {
    const etapas = '52998224725'
      .split('')
      .map((_, i, a) => mascararCpf(a.slice(0, i + 1).join('')));
    expect(etapas).toEqual([
      '5',
      '52',
      '529',
      '529.9',
      '529.98',
      '529.982',
      '529.982.2',
      '529.982.24',
      '529.982.247',
      '529.982.247-2',
      '529.982.247-25',
    ]);
  });
  it('colar com ou sem máscara dá o mesmo resultado', () => {
    expect(mascararTelefone('(11) 98765-4321')).toBe(mascararTelefone('11987654321'));
    expect(mascararCep('01310-100')).toBe('01310-100');
    expect(mascararCpf('529.982.247-25999')).toBe('529.982.247-25');
  });
  it('telefone fixo vira celular ao ganhar o 11º dígito', () => {
    expect(mascararTelefone('1198765432')).toBe('(11) 9876-5432');
    expect(mascararTelefone('11987654321')).toBe('(11) 98765-4321');
  });
  it('posicaoAposDigitos', () => {
    expect(posicaoAposDigitos('529.982.247-25', 0)).toBe(0);
    expect(posicaoAposDigitos('529.982.247-25', 3)).toBe(3);
    expect(posicaoAposDigitos('529.982.247-25', 4)).toBe(5);
    expect(posicaoAposDigitos('529.982.247-25', 11)).toBe(14);
    expect(posicaoAposDigitos('529', 9)).toBe(3);
  });
});
