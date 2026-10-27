import type { EntidadeBase, Inativavel, Ordem, StatusFiltro, UF } from './comuns';

export type Sexo = 'feminino' | 'masculino' | 'outro' | 'nao_informado';
export type TipoSanguineo = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface Endereco {
  /** 8 dígitos, sem máscara. */
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: UF;
}

export type Convenio =
  | { tipo: 'particular' }
  | {
      tipo: 'convenio';
      nome: string;
      carteirinha: string;
      /** AAAA-MM-DD; vencida gera aviso, não erro. */
      validade?: string;
    };

/** Obrigatório para menores de 18 anos (R-P5). */
export interface Responsavel {
  nome: string;
  /** 11 dígitos, diferente do CPF do paciente. */
  cpf: string;
  parentesco: string;
  telefone: string;
}

export interface ContatoEmergencia {
  nome: string;
  telefone: string;
  parentesco: string;
}

export interface Paciente extends EntidadeBase, Inativavel {
  nome: string;
  /** Exibido no lugar do nome quando preenchido (R-P6). */
  nomeSocial?: string;
  /** 11 dígitos, sem máscara; único (R-P1). */
  cpf: string;
  /** AAAA-MM-DD (sem hora). */
  dataNascimento: string;
  sexo: Sexo;
  /** 10 ou 11 dígitos, sem máscara. */
  telefone: string;
  email?: string;
  endereco?: Endereco;
  convenio: Convenio;
  responsavel?: Responsavel;
  tipoSanguineo?: TipoSanguineo;
  alergias?: string;
  contatoEmergencia?: ContatoEmergencia;
  observacoes?: string;
  consentimentoLgpd: { aceito: true; em: string };
}

/** Linha da lista de pacientes. */
export interface PacienteResumo {
  id: string;
  nomeExibicao: string;
  cpfMascarado: string;
  idade: number;
  telefone: string;
  convenioNome: string;
  temAlergias: boolean;
  /** ISO da próxima consulta agendada, se houver. */
  proximaConsulta?: string;
  ativo: boolean;
}

export type OrdenacaoPacientes = 'nome' | 'idade' | 'proximaConsulta';

export interface FiltrosPacientes {
  busca?: string;
  status?: StatusFiltro;
  ordenarPor?: OrdenacaoPacientes;
  ordem?: Ordem;
  pagina?: number;
  porPagina?: number;
}
