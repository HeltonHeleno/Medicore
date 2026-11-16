/**
 * Departamentos do hospital (Fase 25: no domínio, para a API resolver o nome nas listas e nas
 * atividades). Até o BL-30 (estrutura hospitalar editável), a lista é fixa.
 */
export interface DepartamentoBase {
  id: string;
  nome: string;
}

export const DEPARTAMENTOS: readonly DepartamentoBase[] = [
  { id: 'cardiologia', nome: 'Cardiologia' },
  { id: 'emergencia', nome: 'Emergência' },
  { id: 'neurologia', nome: 'Neurologia' },
  { id: 'clinica-geral', nome: 'Clínica Geral' },
  { id: 'ortopedia', nome: 'Ortopedia' },
  { id: 'pediatria', nome: 'Pediatria' },
];

export const nomeDepartamento = (id: string): string =>
  DEPARTAMENTOS.find((d) => d.id === id)?.nome ?? id;
