import { vi } from 'vitest';
import { esquemaAgendamento, esquemaCancelamento } from '../schemas/consulta';
import { esquemaMedico } from '../schemas/medico';
import { esquemaPaciente, type EntradaPaciente } from '../schemas/paciente';

const erros = (r: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));

const pacienteValido = (): EntradaPaciente => ({
  nome: '  Mariana   Alves ',
  cpf: '529.982.247-25',
  dataNascimento: '1992-05-10',
  sexo: 'feminino',
  telefone: '(11) 98765-4321',
  email: ' MARIANA@Exemplo.com ',
  convenio: { tipo: 'particular' },
  consentimentoLgpd: true,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-27T12:00:00-03:00'));
});
afterEach(() => vi.useRealTimers());

describe('esquemaPaciente', () => {
  it('normaliza nome, CPF, telefone e e-mail (R-G2)', () => {
    const r = esquemaPaciente.safeParse(pacienteValido());
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({
      nome: 'Mariana Alves',
      cpf: '52998224725',
      telefone: '11987654321',
      email: 'mariana@exemplo.com',
    });
  });

  it('trata campos vazios do formulário como não informados', () => {
    const r = esquemaPaciente.safeParse({
      ...pacienteValido(),
      email: '',
      nomeSocial: '   ',
      endereco: { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' },
    });
    expect(r.success).toBe(true);
    expect(r.data?.email).toBeUndefined();
    expect(r.data?.endereco).toBeUndefined();
  });

  it('exige nome e sobrenome, CPF válido e consentimento, com mensagens em PT-BR', () => {
    const r = esquemaPaciente.safeParse({
      ...pacienteValido(),
      nome: 'Mariana',
      cpf: '111.111.111-11',
      consentimentoLgpd: false,
    });
    expect(erros(r)).toMatchObject({
      nome: 'Informe nome e sobrenome',
      cpf: 'Informe um CPF válido',
      consentimentoLgpd: 'É preciso autorizar o uso dos dados para salvar',
    });
  });

  it('rejeita data de nascimento no futuro', () => {
    const r = esquemaPaciente.safeParse({ ...pacienteValido(), dataNascimento: '2026-10-28' });
    expect(erros(r).dataNascimento).toBe('A data não pode estar no futuro');
  });

  it('exige responsável para menores de 18 anos (R-P5), considerando a data de hoje', () => {
    const menor = { ...pacienteValido(), dataNascimento: '2008-10-28' }; // faz 18 amanhã
    expect(erros(esquemaPaciente.safeParse(menor)).responsavel).toBe(
      'Paciente menor de 18 anos: informe o responsável legal',
    );
    const maior = { ...pacienteValido(), dataNascimento: '2008-10-27' }; // faz 18 hoje
    expect(esquemaPaciente.safeParse(maior).success).toBe(true);
  });

  it('não aceita o mesmo CPF para paciente e responsável', () => {
    const r = esquemaPaciente.safeParse({
      ...pacienteValido(),
      dataNascimento: '2015-01-01',
      responsavel: {
        nome: 'José Alves',
        cpf: '529.982.247-25',
        parentesco: 'Pai',
        telefone: '11912345678',
      },
    });
    expect(erros(r)['responsavel.cpf']).toBe(
      'O CPF do responsável deve ser diferente do CPF do paciente',
    );
  });

  it('exige nome e carteirinha quando o convênio é selecionado', () => {
    const r = esquemaPaciente.safeParse({ ...pacienteValido(), convenio: { tipo: 'convenio' } });
    expect(erros(r)).toMatchObject({
      'convenio.nome': 'Campo obrigatório',
      'convenio.carteirinha': 'Campo obrigatório',
    });
  });

  it('endereço parcialmente preenchido exige os campos obrigatórios', () => {
    const r = esquemaPaciente.safeParse({
      ...pacienteValido(),
      endereco: {
        cep: '01310-100',
        logradouro: 'Av. Paulista',
        numero: '',
        bairro: '',
        cidade: '',
        uf: 'SP',
      },
    });
    expect(Object.keys(erros(r))).toEqual(
      expect.arrayContaining(['endereco.numero', 'endereco.bairro', 'endereco.cidade']),
    );
  });
});

describe('esquemaMedico', () => {
  const medico = () => ({
    nome: 'Paulo Mendes',
    tratamento: 'Dr.' as const,
    crm: { numero: '123456', uf: 'SP' },
    departamentoId: 'cardiologia',
    telefone: '(11) 3456-7890',
    email: 'paulo@medicore.com.br',
    disponibilidade: {
      diasSemana: [5, 1, 3, 1],
      inicio: '08:00',
      fim: '17:00',
      pausa: { inicio: '12:00', fim: '13:00' },
      duracaoPadraoMin: 30,
    },
  });

  it('aceita um médico válido e ordena/deduplica os dias', () => {
    const r = esquemaMedico.safeParse(medico());
    expect(r.success).toBe(true);
    expect(r.data?.disponibilidade.diasSemana).toEqual([1, 3, 5]);
  });

  it('valida CRM, dias, expediente e pausa (R-M4)', () => {
    const base = medico();
    expect(
      erros(esquemaMedico.safeParse({ ...base, crm: { numero: '12', uf: 'SP' } }))['crm.numero'],
    ).toBe('Informe um CRM com 4 a 7 dígitos');
    const disp = base.disponibilidade;
    const comDisp = (d: object) =>
      erros(esquemaMedico.safeParse({ ...base, disponibilidade: { ...disp, ...d } }));
    expect(comDisp({ diasSemana: [] })['disponibilidade.diasSemana']).toBe(
      'Selecione pelo menos um dia de atendimento',
    );
    expect(comDisp({ fim: '07:00' })['disponibilidade.fim']).toBe(
      'O fim do expediente deve ser depois do início',
    );
    expect(
      comDisp({ pausa: { inicio: '07:00', fim: '08:30' } })['disponibilidade.pausa.inicio'],
    ).toBe('A pausa deve estar dentro do expediente');
    expect(comDisp({ inicio: '08:03' })['disponibilidade.inicio']).toBe(
      'Use horários em intervalos de 5 minutos',
    );
    expect(comDisp({ pausa: { inicio: '', fim: '' } })).toEqual({});
  });
});

describe('esquemas de consulta', () => {
  const base = {
    pacienteId: 'p1',
    medicoId: 'm1',
    data: '2026-10-28',
    hora: '10:30',
    duracaoMin: 30,
    tipo: 'primeira_vez' as const,
  };

  it('valida duração de 5 a 120 em múltiplos de 5 (R-C9)', () => {
    expect(esquemaAgendamento.safeParse(base).success).toBe(true);
    for (const d of [0, 7, 125]) {
      expect(erros(esquemaAgendamento.safeParse({ ...base, duracaoMin: d })).duracaoMin).toBe(
        'A duração deve ser de 5 a 120 minutos, em múltiplos de 5',
      );
    }
  });

  it('exige paciente e médico selecionados', () => {
    expect(erros(esquemaAgendamento.safeParse({ ...base, pacienteId: '' })).pacienteId).toBe(
      'Selecione uma opção',
    );
  });

  it('exige motivo de cancelamento com 5 a 300 caracteres', () => {
    expect(esquemaCancelamento.safeParse({ motivo: 'ok' }).success).toBe(false);
    expect(esquemaCancelamento.safeParse({ motivo: 'Paciente desmarcou' }).success).toBe(true);
  });
});
