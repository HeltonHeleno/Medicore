import type { Disponibilidade } from '../types';
import {
  consultasForaDaDisponibilidade,
  estaAtrasada,
  gerarHorarios,
  intervaloDe,
  motivoForaDaDisponibilidade,
  podeTransitar,
  proximoDiaLivre,
  sobrepoe,
} from '../utils/agenda';
import { instanteNoFuso } from '../utils/datas';

// Segunda a sexta, 08:00–12:00, pausa 10:00–10:30, consultas de 30 min.
const disp: Disponibilidade = {
  diasSemana: [1, 2, 3, 4, 5],
  inicio: '08:00',
  fim: '12:00',
  pausa: { inicio: '10:00', fim: '10:30' },
  duracaoPadraoMin: 30,
};
const SEGUNDA = '2026-11-02';
const iso = (data: string, hora: string) => instanteNoFuso(data, hora).toISOString();
const antes = new Date('2026-11-01T12:00:00-03:00'); // domingo, dia anterior

describe('A2 — sobreposição', () => {
  it('intervalos que apenas se tocam não conflitam', () => {
    const a = intervaloDe(iso(SEGUNDA, '10:00'), 30);
    const b = intervaloDe(iso(SEGUNDA, '10:30'), 30);
    expect(sobrepoe(a, b)).toBe(false);
    expect(sobrepoe(a, intervaloDe(iso(SEGUNDA, '10:29'), 30))).toBe(true);
    expect(sobrepoe(intervaloDe(iso(SEGUNDA, '09:00'), 120), a)).toBe(true); // um contém o outro
  });
});

describe('A1 — horários do dia', () => {
  const horarios = (extra: Partial<Parameters<typeof gerarHorarios>[0]> = {}) =>
    gerarHorarios({
      disponibilidade: disp,
      data: SEGUNDA,
      duracaoMin: 30,
      ocupacoesMedico: [],
      agora: antes,
      ...extra,
    });

  it('gera a grade do expediente marcando a pausa', () => {
    const h = horarios();
    expect(h.map((x) => x.hora)).toEqual([
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
    ]);
    expect(h.find((x) => x.hora === '10:00')).toMatchObject({ livre: false, motivo: 'pausa' });
    expect(h.filter((x) => x.livre)).toHaveLength(7);
    expect(h[0].inicio).toBe('2026-11-02T11:00:00.000Z');
  });

  it('consulta mais longa que a grade: não pode cruzar a pausa nem passar do fim', () => {
    const h = horarios({ duracaoMin: 60 });
    expect(h.find((x) => x.hora === '09:30')?.motivo).toBe('pausa');
    expect(h.find((x) => x.hora === '11:30')?.motivo).toBe('fora_expediente');
    expect(h.find((x) => x.hora === '11:00')?.livre).toBe(true);
  });

  it('dia sem atendimento não tem horários', () => {
    expect(horarios({ data: '2026-11-01' })).toEqual([]); // domingo
  });

  it('horário passado, com tolerância de 5 minutos (R-C1)', () => {
    const h = horarios({ agora: new Date(iso(SEGUNDA, '09:04')) });
    expect(h.find((x) => x.hora === '09:00')?.livre).toBe(true); // 4 min atrás: ainda dá
    expect(h.find((x) => x.hora === '08:30')?.motivo).toBe('passado');
  });

  it('médico e paciente ocupados (R-C3, R-C4)', () => {
    const h = horarios({
      ocupacoesMedico: [intervaloDe(iso(SEGUNDA, '08:30'), 30)],
      ocupacoesPaciente: [intervaloDe(iso(SEGUNDA, '11:00'), 45)],
    });
    expect(h.find((x) => x.hora === '08:30')?.motivo).toBe('medico_ocupado');
    expect(h.find((x) => x.hora === '09:00')?.livre).toBe(true);
    expect(h.find((x) => x.hora === '11:00')?.motivo).toBe('paciente_ocupado');
    expect(h.find((x) => x.hora === '11:30')?.motivo).toBe('paciente_ocupado');
  });
});

describe('R-C2 e A3 — disponibilidade', () => {
  it('identifica o motivo de não caber', () => {
    expect(motivoForaDaDisponibilidade(disp, iso(SEGUNDA, '08:00'), 30)).toBeNull();
    expect(motivoForaDaDisponibilidade(disp, iso(SEGUNDA, '07:30'), 30)).toBe('fora_expediente');
    expect(motivoForaDaDisponibilidade(disp, iso(SEGUNDA, '11:45'), 30)).toBe('fora_expediente');
    expect(motivoForaDaDisponibilidade(disp, iso(SEGUNDA, '09:45'), 30)).toBe('pausa');
    expect(motivoForaDaDisponibilidade(disp, iso('2026-11-07', '09:00'), 30)).toBe(
      'fora_expediente',
    ); // sábado
  });

  it('lista as consultas que ficariam fora de uma nova disponibilidade', () => {
    const consultas = [
      { id: '1', inicio: iso(SEGUNDA, '08:00'), duracaoMin: 30 },
      { id: '2', inicio: iso('2026-11-06', '09:00'), duracaoMin: 30 }, // sexta
    ];
    const novaDisp = { ...disp, diasSemana: [1, 2, 3, 4] as Disponibilidade['diasSemana'] };
    expect(consultasForaDaDisponibilidade(novaDisp, consultas).map((c) => c.id)).toEqual(['2']);
  });
});

describe('A5 — próximo dia livre', () => {
  it('procura a partir do dia seguinte', () => {
    expect(proximoDiaLivre(SEGUNDA, (d) => d === '2026-11-04')).toBe('2026-11-04');
  });
  it('devolve null quando não acha no limite', () => {
    expect(proximoDiaLivre(SEGUNDA, () => false, 10)).toBeNull();
  });
});

describe('R-S1–R-S3 — transições', () => {
  const inicio = iso(SEGUNDA, '10:30');
  const antesDoInicio = new Date(iso(SEGUNDA, '10:29'));
  const depois = new Date(iso(SEGUNDA, '10:30'));

  it('cancelar é permitido a qualquer momento enquanto agendada', () => {
    expect(podeTransitar('agendada', 'cancelada', antesDoInicio, inicio)).toBe(true);
  });
  it('concluir e falta só a partir do início', () => {
    expect(podeTransitar('agendada', 'concluida', antesDoInicio, inicio)).toBe(false);
    expect(podeTransitar('agendada', 'concluida', depois, inicio)).toBe(true);
    expect(podeTransitar('agendada', 'faltou', depois, inicio)).toBe(true);
  });
  it('status finais não mudam', () => {
    for (const final of ['concluida', 'cancelada', 'faltou'] as const) {
      expect(podeTransitar(final, 'cancelada', depois, inicio)).toBe(false);
    }
  });
  it('atrasada = agendada cujo fim já passou (R-C7)', () => {
    const fim = iso(SEGUNDA, '11:00');
    expect(estaAtrasada('agendada', fim, new Date(iso(SEGUNDA, '11:01')))).toBe(true);
    expect(estaAtrasada('agendada', fim, new Date(iso(SEGUNDA, '10:59')))).toBe(false);
    expect(estaAtrasada('concluida', fim, new Date(iso(SEGUNDA, '12:00')))).toBe(false);
  });
});

describe('horariosPorDia (prévia do médico)', () => {
  it('conta os horários com e sem pausa', async () => {
    const { horariosPorDia } = await import('../utils/agenda');
    expect(horariosPorDia(disp)).toBe(7); // 08–12, pausa 10–10:30, 30 min
    expect(horariosPorDia({ ...disp, pausa: undefined })).toBe(8);
    expect(horariosPorDia({ ...disp, duracaoPadraoMin: 60, pausa: undefined })).toBe(4);
    expect(horariosPorDia({ ...disp, diasSemana: [] })).toBe(0);
  });
});
