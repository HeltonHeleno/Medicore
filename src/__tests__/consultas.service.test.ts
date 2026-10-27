import { repoAtividades, repoConsultas } from '../services/colecoes';
import {
  agendarConsulta,
  cancelarConsulta,
  concluirConsulta,
  horariosLivres,
  listarConsultas,
  marcarFalta,
  obterConsulta,
  proximoDiaDisponivel,
  reagendarConsulta,
  registrarEmLote,
} from '../services/consultas';
import { ErroConcorrencia, ErroConflito, ErroValidacao } from '../services/erros';
import type { EntradaAgendamento } from '../schemas/consulta';
import { ajustarRelogio, erroDe, prepararServicos } from './utils/servicos';

// Dados de exemplo ocupam 02/11 a 16/11; os testes usam a semana de 23/11 (segunda).
prepararServicos('2026-11-09T08:00:00-03:00');

const PAULO = 'med-paulo-mendes'; // cardiologia, seg–sex 08–17, pausa 12–13, grade de 30
const RAFAEL = 'med-rafael-costa'; // cardiologia, ter–qui 13–19
const FERNANDA = 'med-fernanda-lima'; // neurologia, seg–qui 09–18

const entrada = (extra: Partial<EntradaAgendamento> = {}): EntradaAgendamento => ({
  pacienteId: 'pac-ana-silva',
  medicoId: PAULO,
  data: '2026-11-23',
  hora: '09:00',
  duracaoMin: 30,
  tipo: 'primeira_vez',
  motivo: 'Dor no peito',
  ...extra,
});

const codigo = async (p: Promise<unknown>) => {
  const e = await erroDe(p);
  expect(e).toBeInstanceOf(ErroConflito);
  return (e as unknown as ErroConflito).codigo;
};

describe('P9 — agendar (R-C1 a R-C9)', () => {
  it('grava detalhada, com departamento do médico, evento e atividade', async () => {
    const c = await agendarConsulta(entrada());
    expect(c).toMatchObject({
      status: 'agendada',
      departamentoId: 'cardiologia',
      departamentoNome: 'Cardiologia',
      pacienteNome: 'Ana Paula Silva',
      pacienteAlergias: 'Penicilina; látex',
      medicoNome: 'Dr. Paulo Mendes',
      inicio: '2026-11-23T12:00:00.000Z',
      fim: '2026-11-23T12:30:00.000Z',
      atrasada: false,
      versao: 1,
    });
    expect(c.eventos).toEqual([{ tipo: 'agendada', em: expect.any(String) }]);
    expect(repoAtividades.todos().at(-1)).toMatchObject({
      tipo: 'consulta_agendada',
      descricao: 'Consulta agendada: Ana Paula Silva com Dr. Paulo Mendes',
    });
  });

  it('R-C3: conflito do médico; horários que só se tocam são permitidos', async () => {
    await agendarConsulta(entrada());
    expect(await codigo(agendarConsulta(entrada({ pacienteId: 'pac-lucas-ferreira' })))).toBe(
      'medico_ocupado',
    );
    await expect(
      agendarConsulta(entrada({ pacienteId: 'pac-lucas-ferreira', hora: '09:30' })),
    ).resolves.toBeTruthy();
  });

  it('R-C4: conflito do paciente, mesmo com outro médico', async () => {
    await agendarConsulta(entrada({ data: '2026-11-24', hora: '14:00' }));
    const e = await erroDe(
      agendarConsulta(entrada({ medicoId: RAFAEL, data: '2026-11-24', hora: '14:00' })),
    );
    expect(e).toMatchObject({ codigo: 'paciente_ocupado', campo: 'hora' });
  });

  it('R-C1: passado, com tolerância de 5 minutos', async () => {
    ajustarRelogio('2026-11-23T09:04:00-03:00');
    await expect(agendarConsulta(entrada())).resolves.toBeTruthy();
    ajustarRelogio('2026-11-23T10:06:00-03:00');
    expect(await codigo(agendarConsulta(entrada({ hora: '10:00' })))).toBe('horario_passado');
  });

  it('R-C2 / R-M4: fora do expediente, dia sem atendimento e pausa', async () => {
    expect(await codigo(agendarConsulta(entrada({ hora: '17:00' })))).toBe('fora_expediente');
    expect(await codigo(agendarConsulta(entrada({ hora: '16:45' })))).toBe('fora_expediente');
    expect(await codigo(agendarConsulta(entrada({ data: '2026-11-28' })))).toBe('fora_expediente');
    const pausa = await erroDe(agendarConsulta(entrada({ hora: '11:45' })));
    expect(pausa).toMatchObject({
      codigo: 'fora_expediente',
      message: 'Este horário cruza a pausa do médico',
    });
  });

  it('R-C8: no máximo 180 dias à frente', async () => {
    // 09/11/2026 + 180 dias = 08/05/2027 (sábado); 10/05 é segunda.
    expect(await codigo(agendarConsulta(entrada({ data: '2027-05-10' })))).toBe(
      'antecedencia_maxima',
    );
    await expect(agendarConsulta(entrada({ data: '2027-05-07' }))).resolves.toBeTruthy();
  });

  it('R-C9: duração de 5 a 120, múltipla de 5', async () => {
    for (const duracaoMin of [0, 7, 125]) {
      const e = await erroDe(agendarConsulta(entrada({ duracaoMin })));
      expect(e).toBeInstanceOf(ErroValidacao);
      expect((e as unknown as ErroValidacao).campos).toHaveProperty('duracaoMin');
    }
  });

  it('médico e paciente inativos', async () => {
    expect(await codigo(agendarConsulta(entrada({ medicoId: 'med-sergio-tavares' })))).toBe(
      'medico_inativo',
    );
    expect(await codigo(agendarConsulta(entrada({ pacienteId: 'pac-luiza-monteiro' })))).toBe(
      'paciente_inativo',
    );
  });
});

describe('R-C5 — horários livres e próximo dia', () => {
  it('a grade já exclui ocupados e a pausa', async () => {
    await agendarConsulta(entrada());
    const grade = await horariosLivres(PAULO, '2026-11-23', 30, 'pac-lucas-ferreira');
    const porHora = Object.fromEntries(grade.map((h) => [h.hora, h]));
    expect(porHora['09:00']).toMatchObject({ livre: false, motivo: 'medico_ocupado' });
    expect(porHora['12:00']).toMatchObject({ livre: false, motivo: 'pausa' });
    expect(porHora['09:30'].livre).toBe(true);
    // Reagendando a própria consulta, o horário dela aparece livre.
    const c = repoConsultas
      .todos()
      .find((x) => x.pacienteId === 'pac-ana-silva' && x.inicio.startsWith('2026-11-23'))!;
    const reag = await horariosLivres(PAULO, '2026-11-23', 30, 'pac-ana-silva', c.id);
    expect(reag.find((h) => h.hora === '09:00')?.livre).toBe(true);
  });

  it('A5: próximo dia com horário (Fernanda não atende sexta nem fim de semana)', async () => {
    expect(await proximoDiaDisponivel(FERNANDA, '2026-11-26', 30)).toBe('2026-11-30');
  });
});

describe('P10 — reagendar (R-C6)', () => {
  it('gera evento com de/para, ignora a própria consulta e troca o médico', async () => {
    const c = await agendarConsulta(entrada());
    const mais = await reagendarConsulta(c.id, entrada({ duracaoMin: 60 }), 1); // sobrepõe a si mesma
    expect(mais.eventos).toHaveLength(1); // mesmo início e médico: não é reagendamento
    const r = await reagendarConsulta(
      c.id,
      entrada({ medicoId: RAFAEL, data: '2026-11-24', hora: '15:00' }),
      2,
    );
    expect(r).toMatchObject({ medicoId: RAFAEL, inicio: '2026-11-24T18:00:00.000Z', versao: 3 });
    expect(r.eventos.at(-1)).toMatchObject({
      tipo: 'reagendada',
      de: '2026-11-23T12:00:00.000Z',
      para: '2026-11-24T18:00:00.000Z',
    });
    expect(repoAtividades.todos().at(-1)?.tipo).toBe('consulta_reagendada');
  });

  it('R-G1 e R-S1', async () => {
    const c = await agendarConsulta(entrada());
    expect(await erroDe(reagendarConsulta(c.id, entrada({ hora: '10:00' }), 9))).toBeInstanceOf(
      ErroConcorrencia,
    );
    await cancelarConsulta(c.id, 'Paciente pediu', 1);
    expect(await codigo(reagendarConsulta(c.id, entrada({ hora: '10:00' }), 2))).toBe(
      'transicao_invalida',
    );
  });
});

describe('P11/P12 — cancelar, concluir, falta (R-S1–R-S3)', () => {
  it('cancelar exige motivo e versão atual', async () => {
    const c = await agendarConsulta(entrada());
    const semMotivo = await erroDe(cancelarConsulta(c.id, '  ', 1));
    expect((semMotivo as unknown as ErroValidacao).campos).toHaveProperty('motivo');
    expect(await erroDe(cancelarConsulta(c.id, 'Remarcar', 5))).toBeInstanceOf(ErroConcorrencia);
    const cancelada = await cancelarConsulta(c.id, 'Remarcar', 1);
    expect(cancelada).toMatchObject({ status: 'cancelada', motivoCancelamento: 'Remarcar' });
    expect(cancelada.eventos.at(-1)).toMatchObject({ tipo: 'cancelada', detalhe: 'Remarcar' });
  });

  it('concluir/falta só a partir do início; status finais não mudam', async () => {
    const c = await agendarConsulta(entrada());
    const outra = await agendarConsulta(entrada({ hora: '10:00' }));
    const e = await erroDe(concluirConsulta(c.id));
    expect(e).toMatchObject({
      codigo: 'transicao_invalida',
      message: 'Só é possível registrar a partir do horário de início',
    });

    ajustarRelogio('2026-11-23T09:00:00-03:00');
    expect((await concluirConsulta(c.id)).status).toBe('concluida');
    expect(await codigo(cancelarConsulta(c.id, 'Tarde demais', 2))).toBe('transicao_invalida');
    expect(await codigo(marcarFalta(c.id))).toBe('transicao_invalida');

    ajustarRelogio('2026-11-23T10:00:00-03:00');
    const falta = await marcarFalta(outra.id);
    expect(falta.status).toBe('faltou');
    expect(repoAtividades.todos().at(-1)?.descricao).toBe('Ana Paula Silva faltou à consulta');
  });

  it('R-C7: atrasada quando o fim passou sem registro', async () => {
    const c = await agendarConsulta(entrada());
    ajustarRelogio('2026-11-23T09:31:00-03:00');
    expect((await obterConsulta(c.id)).atrasada).toBe(true);
    const pendentes = await listarConsultas({ pendentes: true });
    expect(pendentes.map((x) => x.id)).toContain(c.id);
    expect(pendentes.every((x) => x.atrasada)).toBe(true);
  });
});

describe('P13 — registro em lote', () => {
  it('tudo ou nada', async () => {
    const a = await agendarConsulta(entrada());
    const b = await agendarConsulta(entrada({ hora: '15:00' }));
    ajustarRelogio('2026-11-23T10:00:00-03:00'); // b ainda não começou
    expect(await codigo(registrarEmLote([a.id, b.id], 'concluida'))).toBe('transicao_invalida');
    expect(repoConsultas.obter(a.id)?.status).toBe('agendada');

    ajustarRelogio('2026-11-23T16:00:00-03:00');
    expect(await registrarEmLote([a.id, b.id], 'concluida')).toBe(2);
    expect(repoConsultas.obter(b.id)?.status).toBe('concluida');
  });
});

describe('listarConsultas', () => {
  it('filtra por dia e médico, em ordem de início', async () => {
    const tarde = await agendarConsulta(entrada({ hora: '14:00' }));
    const manha = await agendarConsulta(
      entrada({ hora: '08:00', pacienteId: 'pac-lucas-ferreira' }),
    );
    await agendarConsulta(
      entrada({ medicoId: FERNANDA, hora: '10:00', pacienteId: 'pac-camila-souza' }),
    );
    const lista = await listarConsultas({ data: '2026-11-23', medicoId: PAULO });
    expect(lista.map((c) => c.id)).toEqual([manha.id, tarde.id]);
    expect(
      (await listarConsultas({ data: '2026-11-23', departamentoId: 'neurologia' })).length,
    ).toBe(1);
    expect(
      (await listarConsultas({ de: '2026-11-23', ate: '2026-11-23', status: 'cancelada' })).length,
    ).toBe(0);
  });
});
