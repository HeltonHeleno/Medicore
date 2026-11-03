/**
 * ~45 medicamentos de exemplo (fictícios quanto a estoque, reais quanto a nome genérico).
 * Inclui uma penicilina, a dipirona e AINEs (para demonstrar o alerta de alergia, A10)
 * e 4 controlados (Portaria 344/98, R-F7).
 */
import type { FormaFarmaceutica, ListaControlado, UnidadeDispensacao } from '../../types';

export interface ModeloMedicamento {
  id: string;
  nome: string;
  nomeComercial?: string;
  principioAtivo: string;
  classe?: string;
  concentracao: string;
  forma: FormaFarmaceutica;
  unidade: UnidadeDispensacao;
  controlado?: ListaControlado;
  unidadesPorEmbalagem?: number;
  estoqueMinimo: number;
  /** Papel nos dados de exemplo (R-F6). */
  papel?: 'baixo' | 'zerado';
}

type M = ModeloMedicamento;
const comp = (
  id: string,
  nome: string,
  concentracao: string,
  classe: string,
  estoqueMinimo: number,
  extra: Partial<M> = {},
): M => ({
  id: `med-${id}`,
  nome,
  principioAtivo: nome,
  classe,
  concentracao,
  forma: 'comprimido',
  unidade: 'comprimido',
  unidadesPorEmbalagem: 20,
  estoqueMinimo,
  ...extra,
});
const amp = (
  id: string,
  nome: string,
  concentracao: string,
  classe: string,
  estoqueMinimo: number,
  extra: Partial<M> = {},
): M => ({
  id: `med-${id}`,
  nome,
  principioAtivo: nome,
  classe,
  concentracao,
  forma: 'solucao_injetavel',
  unidade: 'ampola',
  unidadesPorEmbalagem: 10,
  estoqueMinimo,
  ...extra,
});

export const MODELOS_MEDICAMENTOS: M[] = [
  comp('dipirona-500', 'Dipirona sódica', '500 mg', 'Analgésicos', 300, {
    nomeComercial: 'Novalgina',
  }),
  amp('dipirona-1g', 'Dipirona sódica', '500 mg/mL', 'Analgésicos', 100),
  comp('paracetamol-750', 'Paracetamol', '750 mg', 'Analgésicos', 200),
  comp('ibuprofeno-600', 'Ibuprofeno', '600 mg', 'AINE', 120),
  amp('cetoprofeno-100', 'Cetoprofeno', '100 mg', 'AINE', 40, {
    forma: 'po_injetavel',
    unidade: 'frasco',
  }),
  comp('diclofenaco-50', 'Diclofenaco sódico', '50 mg', 'AINE', 80),
  {
    id: 'med-amoxicilina-500',
    nome: 'Amoxicilina',
    principioAtivo: 'Amoxicilina',
    classe: 'Penicilinas',
    concentracao: '500 mg',
    forma: 'capsula',
    unidade: 'capsula',
    unidadesPorEmbalagem: 21,
    estoqueMinimo: 150,
  },
  amp('ampicilina-1g', 'Ampicilina sódica', '1 g', 'Penicilinas', 30, {
    forma: 'po_injetavel',
    unidade: 'frasco',
  }),
  amp('ceftriaxona-1g', 'Ceftriaxona', '1 g', 'Cefalosporinas', 40, {
    forma: 'po_injetavel',
    unidade: 'frasco',
    papel: 'baixo',
  }),
  amp('cefazolina-1g', 'Cefazolina', '1 g', 'Cefalosporinas', 30, {
    forma: 'po_injetavel',
    unidade: 'frasco',
  }),
  comp('azitromicina-500', 'Azitromicina', '500 mg', 'Macrolídeos', 40),
  amp('vancomicina-500', 'Vancomicina', '500 mg', 'Glicopeptídeos', 20, {
    forma: 'po_injetavel',
    unidade: 'frasco',
  }),
  comp('ciprofloxacino-500', 'Ciprofloxacino', '500 mg', 'Quinolonas', 60),
  amp('meropenem-1g', 'Meropeném', '1 g', 'Carbapenêmicos', 20, {
    forma: 'po_injetavel',
    unidade: 'frasco',
  }),
  comp('omeprazol-20', 'Omeprazol', '20 mg', 'Inibidores da bomba de prótons', 200, {
    forma: 'capsula',
    unidade: 'capsula',
    unidadesPorEmbalagem: 28,
  }),
  amp('omeprazol-40', 'Omeprazol', '40 mg', 'Inibidores da bomba de prótons', 40, {
    forma: 'po_injetavel',
    unidade: 'frasco',
  }),
  amp('ondansetrona-8', 'Ondansetrona', '2 mg/mL', 'Antieméticos', 60),
  amp('metoclopramida-10', 'Metoclopramida', '5 mg/mL', 'Antieméticos', 60),
  comp('losartana-50', 'Losartana potássica', '50 mg', 'Anti-hipertensivos', 200, {
    unidadesPorEmbalagem: 30,
  }),
  comp('anlodipino-5', 'Anlodipino', '5 mg', 'Anti-hipertensivos', 150, {
    unidadesPorEmbalagem: 30,
  }),
  comp('captopril-25', 'Captopril', '25 mg', 'Anti-hipertensivos', 100, {
    unidadesPorEmbalagem: 30,
  }),
  amp('furosemida-20', 'Furosemida', '10 mg/mL', 'Diuréticos', 60),
  comp('hidroclorotiazida-25', 'Hidroclorotiazida', '25 mg', 'Diuréticos', 100, {
    unidadesPorEmbalagem: 30,
  }),
  comp('metformina-850', 'Metformina', '850 mg', 'Antidiabéticos', 200, {
    unidadesPorEmbalagem: 30,
  }),
  amp('insulina-nph', 'Insulina humana NPH', '100 UI/mL', 'Insulinas', 20, {
    unidade: 'frasco',
    unidadesPorEmbalagem: 1,
    papel: 'baixo',
  }),
  amp('insulina-regular', 'Insulina humana regular', '100 UI/mL', 'Insulinas', 20, {
    unidade: 'frasco',
    unidadesPorEmbalagem: 1,
  }),
  amp('heparina-5000', 'Heparina sódica', '5.000 UI/0,25 mL', 'Anticoagulantes', 80),
  amp('enoxaparina-40', 'Enoxaparina sódica', '40 mg/0,4 mL', 'Anticoagulantes', 60, {
    unidade: 'unidade',
    unidadesPorEmbalagem: 2,
  }),
  comp('aas-100', 'Ácido acetilsalicílico', '100 mg', 'Antiagregantes', 150, {
    unidadesPorEmbalagem: 30,
  }),
  comp('clopidogrel-75', 'Clopidogrel', '75 mg', 'Antiagregantes', 60, {
    unidadesPorEmbalagem: 28,
  }),
  comp('sinvastatina-20', 'Sinvastatina', '20 mg', 'Estatinas', 100, { unidadesPorEmbalagem: 30 }),
  amp('hidrocortisona-100', 'Hidrocortisona', '100 mg', 'Corticoides', 30, {
    forma: 'po_injetavel',
    unidade: 'frasco',
  }),
  comp('prednisona-20', 'Prednisona', '20 mg', 'Corticoides', 80, { unidadesPorEmbalagem: 10 }),
  amp('dexametasona-4', 'Dexametasona', '4 mg/mL', 'Corticoides', 50, { papel: 'zerado' }),
  amp('salbutamol', 'Salbutamol', '100 mcg/dose', 'Broncodilatadores', 20, {
    forma: 'outro',
    unidade: 'frasco',
    unidadesPorEmbalagem: 1,
  }),
  amp('soro-fisiologico', 'Cloreto de sódio', '0,9% 500 mL', 'Soluções', 200, {
    unidade: 'frasco',
    unidadesPorEmbalagem: 24,
  }),
  amp('soro-glicosado', 'Glicose', '5% 500 mL', 'Soluções', 100, {
    unidade: 'frasco',
    unidadesPorEmbalagem: 24,
  }),
  amp('ringer-lactato', 'Ringer com lactato', '500 mL', 'Soluções', 100, {
    unidade: 'frasco',
    unidadesPorEmbalagem: 24,
    papel: 'baixo',
  }),
  amp('cloreto-potassio', 'Cloreto de potássio', '19,1%', 'Eletrólitos', 40),
  {
    id: 'med-sulfadiazina-prata',
    nome: 'Sulfadiazina de prata',
    principioAtivo: 'Sulfadiazina de prata',
    classe: 'Antimicrobianos tópicos',
    concentracao: '1%',
    forma: 'pomada',
    unidade: 'bisnaga',
    unidadesPorEmbalagem: 1,
    estoqueMinimo: 15,
  },
  amp('morfina-10', 'Morfina', '10 mg/mL', 'Opioides', 20, { controlado: 'A1' }),
  amp('fentanil-50', 'Fentanila', '50 mcg/mL', 'Opioides', 20, {
    controlado: 'A1',
    unidade: 'frasco',
  }),
  amp('midazolam-5', 'Midazolam', '5 mg/mL', 'Benzodiazepínicos', 30, { controlado: 'B1' }),
  comp('diazepam-10', 'Diazepam', '10 mg', 'Benzodiazepínicos', 40, { controlado: 'B1' }),
  comp('loratadina-10', 'Loratadina', '10 mg', 'Anti-histamínicos', 40, {
    unidadesPorEmbalagem: 12,
  }),
];
