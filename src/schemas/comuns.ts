/**
 * Blocos de validação reutilizados pelos esquemas de paciente, médico e consulta.
 * Os mesmos esquemas validam o formulário (D1) e são revalidados no serviço.
 */
import { z } from 'zod';
import { t } from '../i18n/pt-BR';
import { UFS, type UF } from '../types';
import { dataValida } from '../utils/datas';
import {
  cepValido,
  cpfValido,
  emailValido,
  somenteDigitos,
  telefoneValido,
} from '../utils/validacao';

const v = t.validacao;

/** Remove espaços nas pontas e espaços repetidos no meio (R-G2). */
export const limparEspacos = (s: string) => s.trim().replace(/\s+/g, ' ');

/** Considera vazio: undefined, null, '' ou objeto cujos valores são todos vazios. */
export function vazio(valor: unknown): boolean {
  if (valor === undefined || valor === null) return true;
  if (typeof valor === 'string') return valor.trim() === '';
  if (typeof valor === 'object' && !Array.isArray(valor)) {
    return Object.values(valor as Record<string, unknown>).every(vazio);
  }
  return false;
}

/** Torna um esquema opcional, tratando '' e objetos vazios como "não informado". */
export const opcional = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((valor) => (vazio(valor) ? undefined : valor), esquema.optional());

export const textoObrigatorio = (min: number, max: number) =>
  z
    .string({ error: v.obrigatorio })
    .transform(limparEspacos)
    .pipe(z.string().min(1, v.obrigatorio).min(min, v.minimo(min)).max(max, v.maximo(max)));

export const textoOpcional = (max: number) =>
  opcional(
    z
      .string()
      .transform(limparEspacos)
      .pipe(z.string().max(max, v.maximo(max))),
  );

/** CPF: aceita com máscara, guarda só os 11 dígitos. */
export const cpf = z
  .string({ error: v.obrigatorio })
  .transform(somenteDigitos)
  .pipe(z.string().min(1, v.obrigatorio).refine(cpfValido, v.cpfInvalido));

export const telefone = z
  .string({ error: v.obrigatorio })
  .transform(somenteDigitos)
  .pipe(z.string().min(1, v.obrigatorio).refine(telefoneValido, v.telefoneInvalido));

export const cep = z
  .string({ error: v.obrigatorio })
  .transform(somenteDigitos)
  .pipe(z.string().min(1, v.obrigatorio).refine(cepValido, v.cepInvalido));

export const email = z
  .string({ error: v.obrigatorio })
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.string().min(1, v.obrigatorio).refine(emailValido, v.emailInvalido));

export const emailOpcional = opcional(email);

export const uf = z.enum(UFS as [UF, ...UF[]], { error: v.ufInvalida });

/** Data sem hora `AAAA-MM-DD`. */
export const dataIso = z
  .string({ error: v.obrigatorio })
  .min(1, v.obrigatorio)
  .refine(dataValida, v.dataInvalida);

/** Hora `HH:mm` em múltiplos de 5 minutos. */
export const horaHHmm = z
  .string({ error: v.obrigatorio })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, v.horaInvalida)
  .refine((h) => Number(h.slice(3)) % 5 === 0, v.horaMultipla5);

/** Identificador obrigatório de uma seleção (paciente, médico, departamento). */
export const idSelecionado = z.string({ error: v.selecione }).min(1, v.selecione);
