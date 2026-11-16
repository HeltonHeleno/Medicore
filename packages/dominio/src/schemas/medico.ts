import { z } from 'zod';
import { DURACOES_PADRAO } from '../config/limites';
import { t } from '../i18n/pt-BR';
import { minutosDaHora } from '../utils/datas';
import { somenteDigitos } from '../utils/validacao';
import { email, horaHHmm, idSelecionado, opcional, telefone, textoObrigatorio, uf } from './comuns';

const v = t.validacao;

const disponibilidade = z
  .object({
    diasSemana: z
      .array(z.number().int().min(0).max(6))
      .min(1, v.diasObrigatorio)
      .transform((dias) => [...new Set(dias)].sort((a, b) => a - b)),
    inicio: horaHHmm,
    fim: horaHHmm,
    pausa: opcional(z.object({ inicio: horaHHmm, fim: horaHHmm })),
    duracaoPadraoMin: z
      .number({ error: v.selecione })
      .refine((n) => (DURACOES_PADRAO as readonly number[]).includes(n), v.selecione),
  })
  .superRefine((d, ctx) => {
    const ini = minutosDaHora(d.inicio);
    const fim = minutosDaHora(d.fim);
    if (fim <= ini) {
      ctx.addIssue({ code: 'custom', message: v.fimAntesInicio, path: ['fim'] });
      return;
    }
    if (fim - ini < d.duracaoPadraoMin) {
      ctx.addIssue({ code: 'custom', message: v.expedienteCurto, path: ['fim'] });
    }
    if (d.pausa) {
      const pIni = minutosDaHora(d.pausa.inicio);
      const pFim = minutosDaHora(d.pausa.fim);
      if (pFim <= pIni) {
        ctx.addIssue({ code: 'custom', message: v.pausaInvalida, path: ['pausa', 'fim'] });
      } else if (pIni <= ini || pFim >= fim) {
        ctx.addIssue({ code: 'custom', message: v.pausaForaExpediente, path: ['pausa', 'inicio'] });
      }
    }
  });

/** Esquema do formulário de médico (R-M4: pausa dentro do expediente). */
export const esquemaMedico = z.object({
  nome: textoObrigatorio(3, 120),
  tratamento: z.enum(['Dr.', 'Dra.'], { error: v.selecione }),
  crm: z.object({
    numero: z
      .string({ error: v.obrigatorio })
      .transform(somenteDigitos)
      .pipe(
        z
          .string()
          .min(1, v.obrigatorio)
          .regex(/^\d{4,7}$/, v.crmInvalido),
      ),
    uf,
  }),
  departamentoId: idSelecionado,
  telefone,
  email,
  disponibilidade,
});

export type EntradaMedico = z.input<typeof esquemaMedico>;
export type DadosMedico = z.output<typeof esquemaMedico>;

// Reexporta para quem só precisa validar a disponibilidade (prévia do formulário).
export const esquemaDisponibilidade = disponibilidade;
export const esquemaDisponibilidadeOpcional = opcional(disponibilidade);
