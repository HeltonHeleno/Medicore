import { z } from 'zod';
import { t } from '../i18n/pt-BR';
import { hojeNoFuso, idade } from '../utils/datas';
import {
  cep,
  cpf,
  dataIso,
  emailOpcional,
  opcional,
  telefone,
  textoObrigatorio,
  textoOpcional,
  uf,
} from './comuns';

const v = t.validacao;

export const SEXOS = ['feminino', 'masculino', 'outro', 'nao_informado'] as const;
export const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const endereco = z.object({
  cep,
  logradouro: textoObrigatorio(2, 120),
  numero: textoObrigatorio(1, 10),
  complemento: textoOpcional(60),
  bairro: textoObrigatorio(2, 80),
  cidade: textoObrigatorio(2, 80),
  uf,
});

const convenio = z.discriminatedUnion(
  'tipo',
  [
    z.object({ tipo: z.literal('particular') }),
    z.object({
      tipo: z.literal('convenio'),
      nome: textoObrigatorio(2, 80),
      carteirinha: textoObrigatorio(3, 30),
      validade: opcional(dataIso),
    }),
  ],
  { error: v.selecione },
);

const responsavel = z.object({
  nome: textoObrigatorio(3, 120),
  cpf,
  parentesco: textoObrigatorio(2, 40),
  telefone,
});

const contatoEmergencia = z.object({
  nome: textoObrigatorio(3, 120),
  telefone,
  parentesco: textoObrigatorio(2, 40),
});

/**
 * Esquema do formulário de paciente (cadastro e edição).
 * Regras condicionais: responsável se menor de 18 (R-P5); CPF do responsável ≠ do paciente.
 */
export const esquemaPaciente = z
  .object({
    nome: textoObrigatorio(3, 120).refine((n) => n.split(' ').length >= 2, v.nomeCompleto),
    nomeSocial: textoOpcional(120),
    cpf,
    dataNascimento: dataIso,
    sexo: z.enum(SEXOS, { error: v.selecione }),
    telefone,
    email: emailOpcional,
    endereco: opcional(endereco),
    convenio,
    responsavel: opcional(responsavel),
    tipoSanguineo: opcional(z.enum(TIPOS_SANGUINEOS)),
    alergias: textoOpcional(500),
    contatoEmergencia: opcional(contatoEmergencia),
    observacoes: textoOpcional(1000),
    consentimentoLgpd: z.literal(true, { error: v.consentimento }),
  })
  .superRefine((d, ctx) => {
    if (d.dataNascimento) {
      const hoje = hojeNoFuso();
      if (d.dataNascimento > hoje) {
        ctx.addIssue({ code: 'custom', message: v.dataFutura, path: ['dataNascimento'] });
        return;
      }
      if (idade(d.dataNascimento, hoje) > 130) {
        ctx.addIssue({ code: 'custom', message: v.idadeMaxima, path: ['dataNascimento'] });
      }
      if (idade(d.dataNascimento, hoje) < 18 && !d.responsavel) {
        ctx.addIssue({ code: 'custom', message: v.responsavelObrigatorio, path: ['responsavel'] });
      }
    }
    if (d.responsavel && d.cpf && d.responsavel.cpf === d.cpf) {
      ctx.addIssue({
        code: 'custom',
        message: v.responsavelCpfIgual,
        path: ['responsavel', 'cpf'],
      });
    }
  });

/** O que a tela envia (valores crus do formulário). */
export type EntradaPaciente = z.input<typeof esquemaPaciente>;
/** O que sai da validação (normalizado). */
export type DadosPaciente = z.output<typeof esquemaPaciente>;

/** Paciente é menor de idade na data de hoje? Usado pelo formulário para mostrar a seção. */
export const ehMenor = (dataNascimento: string) => idade(dataNascimento) < 18;
