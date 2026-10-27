import { z } from 'zod';
import { DURACAO_MAX, DURACAO_MIN } from '../config/limites';
import { t } from '../i18n/pt-BR';
import { dataIso, horaHHmm, idSelecionado, textoObrigatorio, textoOpcional } from './comuns';

const v = t.validacao;

export const TIPOS_CONSULTA = ['primeira_vez', 'retorno', 'exame', 'teleconsulta'] as const;

/** R-C9: duração de 5 a 120 minutos, múltipla de 5. */
export const duracao = z
  .number({ error: v.duracaoInvalida })
  .int(v.duracaoInvalida)
  .min(DURACAO_MIN, v.duracaoInvalida)
  .max(DURACAO_MAX, v.duracaoInvalida)
  .refine((n) => n % 5 === 0, v.duracaoInvalida);

/** Agendar ou reagendar (as regras de agenda R-C1…R-C8 ficam no serviço). */
export const esquemaAgendamento = z.object({
  pacienteId: idSelecionado,
  medicoId: idSelecionado,
  data: dataIso,
  hora: z.string({ error: v.horarioObrigatorio }).min(1, v.horarioObrigatorio).pipe(horaHHmm),
  duracaoMin: duracao,
  tipo: z.enum(TIPOS_CONSULTA, { error: v.selecione }),
  motivo: textoOpcional(500),
});

/** Cancelamento: motivo obrigatório de 5 a 300 caracteres (P11). */
export const esquemaCancelamento = z.object({
  motivo: textoObrigatorio(5, 300),
});

export type EntradaAgendamento = z.input<typeof esquemaAgendamento>;
export type DadosAgendamento = z.output<typeof esquemaAgendamento>;
