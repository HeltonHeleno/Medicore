/**
 * Esquemas da Gestão de leitos (L1–L9). As regras que dependem do estado dos leitos e
 * dos pacientes (R-L1, R-L2, R-L5, R-L6, R-X1) ficam no serviço.
 */
import { z } from 'zod';
import { ELETIVA_MAX_DIAS, INTERNACAO_RETROATIVA_H } from '../config/limites';
import { t } from '../i18n/pt-BR';
import { tl } from '../i18n/pt-BR/leitos';
import { dataDoInstante, dataValida, hojeNoFuso, somarDias } from '../utils/datas';
import { agora } from '../utils/relogio';
import {
  dataIso,
  idSelecionado,
  instanteIso,
  justificativa,
  motivo,
  opcional,
  textoObrigatorio,
  textoOpcional,
} from './comuns';

const v = t.validacao;

export const PRECAUCOES = ['padrao', 'contato', 'goticulas', 'aerossois'] as const;
export const SETORES_INTERNACAO_IDS = ['uti', 'enfermaria', 'apartamento'] as const;
export const ORIGENS_INTERNACAO = ['eletiva', 'transferencia_externa', 'emergencia'] as const;
export const TIPOS_ALTA = ['melhorada', 'a_pedido', 'transferencia', 'obito'] as const;

const precaucao = z.enum(PRECAUCOES, { error: v.selecione });
const setor = z.enum(SETORES_INTERNACAO_IDS, { error: v.selecione });
const hospital = textoOpcional(120);
const justificativaOpcional = opcional(justificativa);

/** Tolerância para relógios de máquinas diferentes ("agora" digitado um pouco à frente). */
const TOLERANCIA_FUTURO_MS = 60_000;
const ehFuturo = (iso: string) =>
  new Date(iso).getTime() > agora().getTime() + TOLERANCIA_FUTURO_MS;
const instanteOk = (x: unknown): x is string =>
  typeof x === 'string' && !Number.isNaN(new Date(x).getTime());

/** L1 / L6 */
export const esquemaInternacao = z
  .object({
    pacienteId: idSelecionado,
    origem: z.enum(ORIGENS_INTERNACAO, { error: v.selecione }),
    hospitalOrigem: hospital,
    solicitacaoId: opcional(z.string()),
    precaucao,
    setorDesejado: opcional(setor),
    leitoId: idSelecionado,
    medicoResponsavelId: idSelecionado,
    motivo: textoObrigatorio(3, 300),
    inicio: instanteIso,
    previsaoAlta: opcional(dataIso),
    justificativa: justificativaOpcional,
  })
  .superRefine(
    (d, ctx) => {
      if (
        d.origem === 'transferencia_externa' &&
        (!d.hospitalOrigem || d.hospitalOrigem.length < 3)
      ) {
        ctx.addIssue({ code: 'custom', message: v.hospitalObrigatorio, path: ['hospitalOrigem'] });
      }
      if (d.origem === 'emergencia' && !d.solicitacaoId) {
        ctx.addIssue({ code: 'custom', message: v.selecione, path: ['origem'] });
      }
      if (instanteOk(d.inicio)) {
        if (ehFuturo(d.inicio)) {
          ctx.addIssue({ code: 'custom', message: tl.regras.inicioFuturo, path: ['inicio'] });
        } else if (
          new Date(d.inicio).getTime() <
          agora().getTime() - INTERNACAO_RETROATIVA_H * 3_600_000
        ) {
          ctx.addIssue({
            code: 'custom',
            message: tl.regras.inicioMuitoAntigo(INTERNACAO_RETROATIVA_H),
            path: ['inicio'],
          });
        }
        if (
          typeof d.previsaoAlta === 'string' &&
          dataValida(d.previsaoAlta) &&
          d.previsaoAlta < dataDoInstante(d.inicio)
        ) {
          ctx.addIssue({
            code: 'custom',
            message: tl.regras.previsaoAntesInicio,
            path: ['previsaoAlta'],
          });
        }
      }
    },
    { when: () => true },
  );

/** L2 */
export const esquemaTransferencia = z.object({
  leitoDestinoId: idSelecionado,
  motivo: textoObrigatorio(3, 200),
  justificativa: justificativaOpcional,
});

/** L3 */
export const esquemaAlta = z
  .object({
    tipo: z.enum(TIPOS_ALTA, { error: v.selecione }),
    em: instanteIso,
    hospitalDestino: hospital,
    observacao: textoOpcional(500),
  })
  .superRefine(
    (d, ctx) => {
      if (d.tipo === 'transferencia' && (!d.hospitalDestino || d.hospitalDestino.length < 3)) {
        ctx.addIssue({ code: 'custom', message: v.hospitalObrigatorio, path: ['hospitalDestino'] });
      }
      if (instanteOk(d.em) && ehFuturo(d.em)) {
        ctx.addIssue({ code: 'custom', message: tl.regras.altaFutura, path: ['em'] });
      }
    },
    { when: () => true },
  );

/** L7 */
export const esquemaEdicaoInternacao = z.object({
  medicoResponsavelId: idSelecionado,
  previsaoAlta: opcional(dataIso),
  precaucao,
  motivo: textoObrigatorio(3, 300),
  justificativa: justificativaOpcional,
});

/** L8, cancelamento de pedido de leito e outros registros que exigem só o motivo. */
export const esquemaMotivo = z.object({ motivo });

/** L5 */
export const esquemaBloqueioLeito = z.object({
  motivo,
  previsaoLiberacao: opcional(dataIso),
});

/** L9 */
export const esquemaSolicitacaoEletiva = z
  .object({
    pacienteId: idSelecionado,
    setorDesejado: setor,
    precaucao,
    dataPrevista: dataIso,
    motivo: textoObrigatorio(3, 300),
    prioridade: z.enum(['verde', 'amarelo']).default('verde'),
    justificativaPrioridade: justificativaOpcional,
  })
  .superRefine(
    (d, ctx) => {
      if (typeof d.dataPrevista === 'string' && dataValida(d.dataPrevista)) {
        const hoje = hojeNoFuso();
        if (d.dataPrevista < hoje || d.dataPrevista > somarDias(hoje, ELETIVA_MAX_DIAS)) {
          ctx.addIssue({
            code: 'custom',
            message: tl.regras.dataPrevistaInvalida(ELETIVA_MAX_DIAS),
            path: ['dataPrevista'],
          });
        }
      }
      if (d.prioridade === 'amarelo' && !d.justificativaPrioridade) {
        ctx.addIssue({
          code: 'custom',
          message: v.justificativaObrigatoria,
          path: ['justificativaPrioridade'],
        });
      }
    },
    { when: () => true },
  );

export type EntradaInternacao = z.input<typeof esquemaInternacao>;
export type DadosInternacao = z.output<typeof esquemaInternacao>;
export type EntradaTransferencia = z.input<typeof esquemaTransferencia>;
export type EntradaAlta = z.input<typeof esquemaAlta>;
export type EntradaEdicaoInternacao = z.input<typeof esquemaEdicaoInternacao>;
export type EntradaBloqueioLeito = z.input<typeof esquemaBloqueioLeito>;
export type EntradaSolicitacaoEletiva = z.input<typeof esquemaSolicitacaoEletiva>;
