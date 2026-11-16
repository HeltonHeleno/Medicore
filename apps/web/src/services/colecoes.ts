/**
 * As coleções persistidas do sistema. Cada uma é semeada com os dados de exemplo
 * na primeira leitura (ou depois de "Restaurar dados de exemplo").
 */
import { semearAtividades } from '@medicore/dominio/seeds/atividades';
import { semearConsultas } from '@medicore/dominio/seeds/consultas';
import { semearMedicos } from '@medicore/dominio/seeds/medicos';
import { semearPacientes } from '@medicore/dominio/seeds/pacientes';
import type { Atividade, Consulta, Medico, Paciente } from '@medicore/dominio/types';
import { criarRepositorio } from './repositorio';

export const repoPacientes = criarRepositorio<Paciente>('pacientes', semearPacientes);
export const repoMedicos = criarRepositorio<Medico>('medicos', semearMedicos);
export const repoConsultas = criarRepositorio<Consulta>('consultas', semearConsultas);
export const repoAtividades = criarRepositorio<Atividade>('atividades', semearAtividades);
