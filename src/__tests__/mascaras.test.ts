import {
  formatarCrm,
  mascararCep,
  mascararCpf,
  mascararTelefone,
  ocultarCpf,
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
    expect(formatarCrm({ numero: '123456', uf: 'SP' })).toBe('CRM/SP 123456');
  });
});
