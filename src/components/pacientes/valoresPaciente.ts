import type { Paciente, Sexo } from '../../types';

/** Forma dos valores no formulário (tudo texto, para os campos serem controlados). */
export interface ValoresPaciente {
  nome: string;
  nomeSocial: string;
  cpf: string;
  dataNascimento: string;
  sexo: Sexo | '';
  telefone: string;
  email: string;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  convenio: {
    tipo: 'particular' | 'convenio';
    nome: string;
    carteirinha: string;
    validade: string;
  };
  responsavel: { nome: string; cpf: string; parentesco: string; telefone: string };
  tipoSanguineo: string;
  alergias: string;
  contatoEmergencia: { nome: string; telefone: string; parentesco: string };
  observacoes: string;
  consentimentoLgpd: boolean;
}

/** Converte um paciente gravado (ou nada, no cadastro) nos valores do formulário. */
export function valoresDoPaciente(pac?: Paciente): ValoresPaciente {
  const conv = pac?.convenio;
  return {
    nome: pac?.nome ?? '',
    nomeSocial: pac?.nomeSocial ?? '',
    cpf: pac?.cpf ?? '',
    dataNascimento: pac?.dataNascimento ?? '',
    sexo: pac?.sexo ?? '',
    telefone: pac?.telefone ?? '',
    email: pac?.email ?? '',
    endereco: {
      cep: pac?.endereco?.cep ?? '',
      logradouro: pac?.endereco?.logradouro ?? '',
      numero: pac?.endereco?.numero ?? '',
      complemento: pac?.endereco?.complemento ?? '',
      bairro: pac?.endereco?.bairro ?? '',
      cidade: pac?.endereco?.cidade ?? '',
      uf: pac?.endereco?.uf ?? '',
    },
    convenio:
      conv?.tipo === 'convenio'
        ? {
            tipo: 'convenio',
            nome: conv.nome,
            carteirinha: conv.carteirinha,
            validade: conv.validade ?? '',
          }
        : { tipo: 'particular', nome: '', carteirinha: '', validade: '' },
    responsavel: {
      nome: pac?.responsavel?.nome ?? '',
      cpf: pac?.responsavel?.cpf ?? '',
      parentesco: pac?.responsavel?.parentesco ?? '',
      telefone: pac?.responsavel?.telefone ?? '',
    },
    tipoSanguineo: pac?.tipoSanguineo ?? '',
    alergias: pac?.alergias ?? '',
    contatoEmergencia: {
      nome: pac?.contatoEmergencia?.nome ?? '',
      telefone: pac?.contatoEmergencia?.telefone ?? '',
      parentesco: pac?.contatoEmergencia?.parentesco ?? '',
    },
    observacoes: pac?.observacoes ?? '',
    consentimentoLgpd: Boolean(pac),
  };
}
