/** Fase 25 — Textos dos cadastros e o contrato das respostas, sobre os dados de exemplo. */
import { describe, expect, it } from 'vitest';
import { consulta, medico, paciente } from '../contrato/cadastros';
import { nomeDepartamento } from '../config/departamentos';
import { semearConsultas } from '../seeds/consultas';
import { semearMedicos } from '../seeds/medicos';
import { semearPacientes } from '../seeds/pacientes';
import {
  nomeExibicaoMedico,
  nomeExibicaoPaciente,
  resumirDisponibilidade,
} from '../utils/cadastros';

describe('textos dos cadastros', () => {
  it('nome exibido: nome social primeiro (R-P6); médico com o tratamento', () => {
    expect(nomeExibicaoPaciente({ nome: 'Rafael Martins', nomeSocial: 'Rafaela Martins' })).toBe(
      'Rafaela Martins',
    );
    expect(nomeExibicaoPaciente({ nome: 'Ana Silva' })).toBe('Ana Silva');
    expect(nomeExibicaoMedico({ tratamento: 'Dra.', nome: 'Clara Antunes' })).toBe(
      'Dra. Clara Antunes',
    );
  });

  it('resumo da disponibilidade: dias seguidos com "a", soltos com vírgula', () => {
    const base = { inicio: '08:00', fim: '12:00', duracaoPadraoMin: 30 as const };
    expect(resumirDisponibilidade({ ...base, diasSemana: [5, 1, 2, 3, 4] })).toBe(
      'Seg a Sex · 08:00–12:00',
    );
    expect(resumirDisponibilidade({ ...base, diasSemana: [1, 3, 5] })).toBe(
      'Seg, Qua, Sex · 08:00–12:00',
    );
    expect(resumirDisponibilidade({ ...base, diasSemana: [2, 3] })).toBe('Ter, Qua · 08:00–12:00');
  });

  it('departamento: nome pelo id; id desconhecido volta como veio', () => {
    expect(nomeDepartamento('clinica-geral')).toBe('Clínica Geral');
    expect(nomeDepartamento('xyz')).toBe('xyz');
  });
});

describe('contrato das respostas aceita os dados de exemplo', () => {
  it('pacientes, médicos e consultas', () => {
    for (const p of semearPacientes()) expect(paciente.safeParse(p).success, p.id).toBe(true);
    for (const m of semearMedicos()) expect(medico.safeParse(m).success, m.id).toBe(true);
    for (const c of semearConsultas()) expect(consulta.safeParse(c).success, c.id).toBe(true);
  });
});
