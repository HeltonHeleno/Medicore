/**
 * As coleções persistidas do sistema. Cada uma é semeada com os dados de exemplo
 * na primeira leitura (ou depois de "Restaurar dados de exemplo").
 */
import { semearConsultas } from '../data/seeds/consultas';
import { semearMedicos } from '../data/seeds/medicos';
import { semearPacientes } from '../data/seeds/pacientes';
import type { Atividade, Consulta, Medico, Paciente } from '../types';
import { criarRepositorio } from './repositorio';

export const repoPacientes = criarRepositorio<Paciente>('pacientes', semearPacientes);
export const repoMedicos = criarRepositorio<Medico>('medicos', semearMedicos);
export const repoConsultas = criarRepositorio<Consulta>('consultas', semearConsultas);
export const repoAtividades = criarRepositorio<Atividade>('atividades', () => []);
