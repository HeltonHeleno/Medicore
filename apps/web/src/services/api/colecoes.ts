/**
 * Fase 27 — Modo API: no lugar de `services/colecoes.ts`. As telas só usam o nome de cada coleção
 * (para saber quando recarregar); os dados ficam no servidor.
 */
export const repoPacientes = { nome: 'pacientes' } as const;
export const repoMedicos = { nome: 'medicos' } as const;
export const repoConsultas = { nome: 'consultas' } as const;
export const repoAtividades = { nome: 'atividades' } as const;
