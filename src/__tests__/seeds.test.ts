import { PREFIXO_FIXAS, semearConsultas } from '../data/seeds/consultas';
import { criarAleatorio, gerarCpfValido } from '../data/seeds/gerador';
import { semearMedicos } from '../data/seeds/medicos';
import { semearPacientes } from '../data/seeds/pacientes';
import { esquemaMedico } from '../schemas/medico';
import { esquemaPaciente } from '../schemas/paciente';
import type { Consulta } from '../types';
import { estaAtrasada, intervaloDe, motivoForaDaDisponibilidade, sobrepoe } from '../utils/agenda';
import { cpfValido, crmValido } from '../utils/validacao';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-27T11:20:00-03:00')); // terça-feira
});
afterEach(() => vi.useRealTimers());

const semConflito = (lista: Consulta[], chave: 'medicoId' | 'pacienteId') => {
  const ativas = lista.filter((c) => c.status === 'agendada');
  for (const a of ativas)
    for (const b of ativas)
      if (a.id < b.id && a[chave] === b[chave])
        expect(
          sobrepoe(intervaloDe(a.inicio, a.duracaoMin), intervaloDe(b.inicio, b.duracaoMin)),
          `${a.id} × ${b.id}`,
        ).toBe(false);
};

describe('dados de exemplo (D6)', () => {
  it('gerador de CPF produz CPFs válidos', () => {
    const rand = criarAleatorio(1);
    for (let i = 0; i < 200; i++) expect(cpfValido(gerarCpfValido(rand))).toBe(true);
  });

  it('são determinísticos', () => {
    expect(semearPacientes().map((p) => p.cpf)).toEqual(semearPacientes().map((p) => p.cpf));
    expect(semearConsultas()).toEqual(semearConsultas());
  });

  it('médicos passam no esquema, com CRM e e-mail únicos', () => {
    const medicos = semearMedicos();
    expect(medicos).toHaveLength(8);
    for (const m of medicos) {
      const r = esquemaMedico.safeParse(m);
      expect(r.success, `${m.nome}: ${JSON.stringify(r.error?.issues)}`).toBe(true);
      expect(crmValido(m.crm.numero, m.crm.uf)).toBe(true);
    }
    expect(new Set(medicos.map((m) => `${m.crm.uf}${m.crm.numero}`)).size).toBe(8);
    expect(new Set(medicos.map((m) => m.email)).size).toBe(8);
    expect(new Set(medicos.map((m) => m.departamentoId)).size).toBe(6);
    expect(medicos.filter((m) => !m.ativo)).toHaveLength(1);
    expect(medicos.some((m) => m.disponibilidade.pausa)).toBe(true);
    expect(medicos.some((m) => !m.disponibilidade.diasSemana.includes(5))).toBe(true);
  });

  it('pacientes passam no esquema, com CPFs únicos e os casos especiais', () => {
    const pacientes = semearPacientes();
    expect(pacientes.length).toBeGreaterThanOrEqual(30);
    for (const p of pacientes) {
      const r = esquemaPaciente.safeParse({ ...p, consentimentoLgpd: true });
      expect(r.success, `${p.nome}: ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
    expect(new Set(pacientes.map((p) => p.cpf)).size).toBe(pacientes.length);
    expect(pacientes.filter((p) => p.responsavel)).toHaveLength(2);
    expect(pacientes.filter((p) => p.alergias)).toHaveLength(3);
    expect(pacientes.filter((p) => p.nomeSocial)).toHaveLength(2);
    expect(pacientes.filter((p) => !p.ativo)).toHaveLength(3);
    const nomes = pacientes.map((p) => p.nome);
    for (const n of ['João Pereira', 'Mariana Alves', 'Carlos Santos', 'Daniel Oliveira'])
      expect(nomes).toContain(n);
  });

  it('consultas: referências válidas, agenda respeitada e sem conflitos', () => {
    const medicos = new Map(semearMedicos().map((m) => [m.id, m]));
    const pacientes = new Set(semearPacientes().map((p) => p.id));
    const consultas = semearConsultas();
    expect(consultas.length).toBeGreaterThanOrEqual(38);

    for (const c of consultas) {
      const medico = medicos.get(c.medicoId);
      expect(medico?.ativo).toBe(true);
      expect(pacientes.has(c.pacienteId)).toBe(true);
      expect(c.departamentoId).toBe(medico!.departamentoId);
      expect(c.eventos[0].tipo).toBe('agendada');
      if (!c.id.startsWith(PREFIXO_FIXAS)) {
        expect(
          motivoForaDaDisponibilidade(medico!.disponibilidade, c.inicio, c.duracaoMin),
        ).toBeNull();
      }
    }
    semConflito(consultas, 'medicoId');
    semConflito(consultas, 'pacienteId');
  });

  it('cobrem todos os status, os 4 horários do Painel e 2 atrasadas', () => {
    const consultas = semearConsultas();
    const status = new Set(consultas.map((c) => c.status));
    expect([...status].sort()).toEqual(['agendada', 'cancelada', 'concluida', 'faltou']);

    const fixas = consultas.filter((c) => c.id.startsWith(PREFIXO_FIXAS));
    expect(fixas.map((c) => c.inicio)).toEqual([
      '2026-10-27T12:00:00.000Z',
      '2026-10-27T13:30:00.000Z',
      '2026-10-27T15:00:00.000Z',
      '2026-10-27T19:00:00.000Z',
    ]);
    expect(fixas.map((c) => c.status)).toEqual(['concluida', 'agendada', 'agendada', 'cancelada']);

    const agora = new Date();
    const atrasadas = consultas.filter((c) =>
      estaAtrasada(
        c.status,
        new Date(intervaloDe(c.inicio, c.duracaoMin).fim).toISOString(),
        agora,
      ),
    );
    // As 2 pendentes sorteadas + a das 10:30 de hoje, que já terminou às 11:00.
    expect(atrasadas.length).toBe(3);
  });
});
