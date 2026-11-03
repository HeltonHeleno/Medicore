/**
 * Esquemas da Farmácia (F1–F9). O estoque, o FEFO e os alertas que dependem do paciente
 * e do medicamento (R-F4, R-F7, R-F8, R-F14) são conferidos de novo no serviço.
 */
import { z } from 'zod';
import { MAX_ITENS_DISPENSACAO } from '../config/limites';
import { t } from '../i18n/pt-BR';
import { dataValida, hojeNoFuso } from '../utils/datas';
import {
  dataIso,
  idSelecionado,
  inteiroNaoNegativo,
  inteiroPositivo,
  justificativa,
  motivo,
  opcional,
  textoObrigatorio,
  textoOpcional,
} from './comuns';

const v = t.validacao;

export const FORMAS = [
  'comprimido',
  'capsula',
  'solucao_oral',
  'solucao_injetavel',
  'po_injetavel',
  'pomada',
  'outro',
] as const;
export const UNIDADES = [
  'comprimido',
  'capsula',
  'ampola',
  'frasco',
  'bisnaga',
  'unidade',
] as const;
export const LISTAS_CONTROLADO = ['A1', 'A2', 'A3', 'B1', 'B2', 'C1', 'C5'] as const;

/** F1 */
export const esquemaMedicamento = z.object({
  nome: textoObrigatorio(3, 120),
  nomeComercial: textoOpcional(120),
  principioAtivo: textoObrigatorio(3, 120),
  classe: textoOpcional(80),
  concentracao: textoObrigatorio(1, 40),
  forma: z.enum(FORMAS, { error: v.selecione }),
  unidade: z.enum(UNIDADES, { error: v.selecione }),
  controlado: opcional(z.enum(LISTAS_CONTROLADO)),
  unidadesPorEmbalagem: opcional(inteiroPositivo),
  estoqueMinimo: inteiroNaoNegativo,
});

/** F2 */
export const esquemaEntrada = z
  .object({
    medicamentoId: idSelecionado,
    numero: textoObrigatorio(1, 30),
    validade: dataIso,
    modo: z.enum(['unidades', 'embalagens']).default('unidades'),
    quantidade: inteiroPositivo,
    fabricante: textoOpcional(80),
    notaFiscal: textoOpcional(40),
    /** R-F2: validade a menos de 30 dias foi confirmada na tela. */
    confirmarValidadeCurta: z.boolean().default(false),
    /** Lote com o mesmo número e a mesma validade: somar a ele. */
    somarAoExistente: z.boolean().default(false),
  })
  .superRefine(
    (d, ctx) => {
      if (typeof d.validade === 'string' && dataValida(d.validade) && d.validade < hojeNoFuso()) {
        ctx.addIssue({ code: 'custom', message: v.validadeVencida, path: ['validade'] });
      }
    },
    { when: () => true },
  );

const alertaConfirmado = z.object({
  tipo: z.enum(['alergia', 'controlado', 'quantidade_alta']),
  medicamentoId: z.string(),
  termo: textoOpcional(120),
  justificativa: opcional(justificativa),
});

/** F3 */
export const esquemaDispensacao = z
  .object({
    pacienteId: idSelecionado,
    medicoSolicitanteId: idSelecionado,
    itens: z
      .array(z.object({ medicamentoId: idSelecionado, quantidade: inteiroPositivo }))
      .min(1, v.itensMinimo)
      .max(MAX_ITENS_DISPENSACAO, v.itensMaximo(MAX_ITENS_DISPENSACAO)),
    alertasConfirmados: z.array(alertaConfirmado).default([]),
  })
  .superRefine(
    (d, ctx) => {
      (d.alertasConfirmados ?? []).forEach((a, i) => {
        if (a.tipo === 'alergia' && !a.justificativa) {
          ctx.addIssue({
            code: 'custom',
            message: v.justificativaObrigatoria,
            path: ['alertasConfirmados', i, 'justificativa'],
          });
        }
      });
    },
    { when: () => true },
  );

/** F4 */
export const esquemaDevolucao = z.object({
  quantidade: inteiroPositivo,
  motivo: textoObrigatorio(3, 200),
});

/** F5 (para controlados, o serviço exige 10 caracteres ou mais no motivo). */
export const esquemaAjuste = z.object({
  tipo: z.enum(['ajuste_positivo', 'ajuste_negativo', 'perda'], { error: v.selecione }),
  quantidade: inteiroPositivo,
  motivo: textoObrigatorio(3, 200),
});

/** F6 */
export const esquemaDescarte = z.object({
  loteIds: z.array(z.string()).min(1, v.selecione),
  motivo: textoObrigatorio(3, 200),
  termo: textoOpcional(60),
});

/** F8 */
export const esquemaEstorno = z.object({ motivo });

/** F9 */
export const esquemaBloqueioLote = z.object({
  motivo,
  referencia: textoOpcional(60),
});

export type EntradaMedicamento = z.input<typeof esquemaMedicamento>;
export type DadosMedicamento = z.output<typeof esquemaMedicamento>;
export type EntradaLote = z.input<typeof esquemaEntrada>;
export type EntradaDispensacao = z.input<typeof esquemaDispensacao>;
export type EntradaDevolucao = z.input<typeof esquemaDevolucao>;
export type EntradaAjuste = z.input<typeof esquemaAjuste>;
export type EntradaDescarte = z.input<typeof esquemaDescarte>;
export type EntradaBloqueioLote = z.input<typeof esquemaBloqueioLote>;
