/**
 * Setores fixos do hospital (D10, D17). A estrutura não é editável pelas telas:
 * cadastro de setores, quartos e leitos fica no backlog.
 */
import type { Setor, SetorId, SetorInternacaoId } from '../types';

export const SETORES: readonly Setor[] = [
  { id: 'uti', nome: 'UTI', tipo: 'internacao', ordem: 1 },
  { id: 'enfermaria', nome: 'Enfermaria', tipo: 'internacao', ordem: 2 },
  { id: 'apartamento', nome: 'Apartamento', tipo: 'internacao', ordem: 3 },
  { id: 'observacao', nome: 'Observação (Emergência)', tipo: 'observacao', ordem: 4 },
];

export const SETORES_INTERNACAO: readonly SetorInternacaoId[] = [
  'uti',
  'enfermaria',
  'apartamento',
];

export const nomeSetor = (id: SetorId | string): string =>
  SETORES.find((s) => s.id === id)?.nome ?? id;

export const ehSetorInternacao = (id: SetorId | string): id is SetorInternacaoId =>
  SETORES.some((s) => s.id === id && s.tipo === 'internacao');

/** Departamento cujos médicos aparecem primeiro na escolha do responsável (L1 passo 6). */
export const DEPARTAMENTO_DO_SETOR: Record<SetorInternacaoId, string> = {
  uti: 'clinica-geral',
  enfermaria: 'clinica-geral',
  apartamento: 'clinica-geral',
};

/** R-E7: departamento da Emergência. */
export const DEPARTAMENTO_EMERGENCIA = 'emergencia';
