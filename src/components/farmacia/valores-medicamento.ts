import type {
  FormaFarmaceutica,
  ListaControlado,
  Medicamento,
  UnidadeDispensacao,
} from '../../types';

/** Valores como estão na tela (números como texto). */
export interface ValoresMedicamento {
  nome: string;
  nomeComercial: string;
  principioAtivo: string;
  classe: string;
  concentracao: string;
  forma: FormaFarmaceutica | '';
  unidade: UnidadeDispensacao | '';
  controlado: ListaControlado | '';
  unidadesPorEmbalagem: string;
  estoqueMinimo: string;
}

export const valoresDoMedicamento = (m?: Medicamento): ValoresMedicamento => ({
  nome: m?.nome ?? '',
  nomeComercial: m?.nomeComercial ?? '',
  principioAtivo: m?.principioAtivo ?? '',
  classe: m?.classe ?? '',
  concentracao: m?.concentracao ?? '',
  forma: m?.forma ?? '',
  unidade: m?.unidade ?? '',
  controlado: m?.controlado?.lista ?? '',
  unidadesPorEmbalagem: m?.unidadesPorEmbalagem ? String(m.unidadesPorEmbalagem) : '',
  estoqueMinimo: m ? String(m.estoqueMinimo) : '',
});
