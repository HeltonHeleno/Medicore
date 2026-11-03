/**
 * Esquemas da Emergência (E1–E10). As transições de status e as regras que dependem
 * de outros registros (R-E9, R-E10, R-X1) ficam no serviço.
 */
import { z } from 'zod';
import { CHEGADA_RETROATIVA_H } from '../config/limites';
import { FAIXA_PESO, FAIXAS_VALIDAS } from '../config/sinais-vitais';
import { t } from '../i18n/pt-BR';
import { te } from '../i18n/pt-BR/emergencia';
import type { CampoSinal, CorRisco } from '../types';
import { CORES_RISCO } from '../types/emergencia';
import { agora } from '../utils/relogio';
import { pesoRisco } from '../utils/fila';
import {
  idSelecionado,
  instanteIso,
  justificativa,
  motivo,
  numeroOpcional,
  opcional,
  textoObrigatorio,
  textoOpcional,
} from './comuns';
import { PRECAUCOES, SETORES_INTERNACAO_IDS } from './internacao';
import { SEXOS } from './paciente';

const v = t.validacao;

export const MODOS_CHEGADA = [
  'meios_proprios',
  'ambulancia',
  'samu',
  'bombeiros',
  'policia',
] as const;
export const DESFECHOS_DIRETOS = ['alta', 'transferencia', 'obito', 'evasao'] as const;

const cor = z.enum(CORES_RISCO as [CorRisco, ...CorRisco[]], { error: v.selecione });

const sinal = (campo: CampoSinal) => {
  const f = FAIXAS_VALIDAS[campo];
  return numeroOpcional(f.min, f.max, v.foraDaFaixa(f.min, f.max, f.unidade));
};

/** R-E5: faixas válidas e PAS > PAD. */
export const esquemaSinais = z
  .object({
    pas: sinal('pas'),
    pad: sinal('pad'),
    fc: sinal('fc'),
    fr: sinal('fr'),
    temperatura: sinal('temperatura'),
    spo2: sinal('spo2'),
    dor: sinal('dor'),
    glicemia: sinal('glicemia'),
  })
  .superRefine((s, ctx) => {
    if (s.pas !== undefined && s.pad !== undefined && s.pas <= s.pad) {
      ctx.addIssue({ code: 'custom', message: v.pasMenorQuePad, path: ['pas'] });
    }
  });

const instanteOk = (x: unknown): x is string =>
  typeof x === 'string' && !Number.isNaN(new Date(x).getTime());

/** E1 */
export const esquemaChegada = z
  .object({
    pacienteId: opcional(z.string()),
    provisorio: opcional(
      z.object({
        descricao: textoObrigatorio(5, 200),
        sexo: z.enum(SEXOS, { error: v.selecione }),
        idadeAproximada: numeroOpcional(0, 120, v.idadeAproximada),
      }),
    ),
    modoChegada: z.enum(MODOS_CHEGADA, { error: v.selecione }),
    queixa: textoObrigatorio(3, 300),
    chegadaEm: instanteIso,
    emergenciaImediata: z.boolean().default(false),
  })
  .superRefine(
    (d, ctx) => {
      if (!d.pacienteId && !d.provisorio) {
        ctx.addIssue({ code: 'custom', message: te.regras.semIdentificacao, path: ['pacienteId'] });
      }
      if (instanteOk(d.chegadaEm)) {
        const ms = new Date(d.chegadaEm).getTime();
        if (ms > agora().getTime() + 60_000) {
          ctx.addIssue({ code: 'custom', message: te.regras.chegadaFutura, path: ['chegadaEm'] });
        } else if (ms < agora().getTime() - CHEGADA_RETROATIVA_H * 3_600_000) {
          ctx.addIssue({
            code: 'custom',
            message: te.regras.chegadaAntiga(CHEGADA_RETROATIVA_H),
            path: ['chegadaEm'],
          });
        }
      }
    },
    { when: () => true },
  );

/**
 * E2. Na retriagem, `corAnterior` é a cor atual do atendimento: mudar para uma cor
 * menos grave exige justificativa (R-E3).
 */
export const esquemaTriagem = (corAnterior?: CorRisco) =>
  z
    .object({
      risco: cor,
      profissional: textoObrigatorio(3, 120),
      sinais: esquemaSinais,
      pesoKg: numeroOpcional(
        FAIXA_PESO.min,
        FAIXA_PESO.max,
        v.foraDaFaixa(FAIXA_PESO.min, FAIXA_PESO.max, 'kg'),
      ),
      observacao: textoOpcional(500),
      justificativa: opcional(justificativa),
    })
    .superRefine(
      (d, ctx) => {
        if (
          corAnterior &&
          d.risco &&
          pesoRisco(d.risco) > pesoRisco(corAnterior) &&
          !d.justificativa
        ) {
          ctx.addIssue({
            code: 'custom',
            message: te.regras.justificativaRetriagem,
            path: ['justificativa'],
          });
        }
      },
      { when: () => true },
    );

/** E10 */
export const esquemaReavaliacao = z.object({
  sinais: esquemaSinais,
  observacao: textoOpcional(500),
});

/** E3 */
export const esquemaChamar = z.object({ medicoId: idSelecionado });

/** E5 (o desfecho "internação" passa pelo pedido de leito, E6). */
export const esquemaDesfecho = z
  .object({
    tipo: z.enum(DESFECHOS_DIRETOS, { error: v.selecione }),
    em: instanteIso,
    hospitalDestino: textoOpcional(120),
    observacao: textoOpcional(500),
  })
  .superRefine(
    (d, ctx) => {
      if (d.tipo === 'transferencia' && (!d.hospitalDestino || d.hospitalDestino.length < 3)) {
        ctx.addIssue({ code: 'custom', message: v.hospitalObrigatorio, path: ['hospitalDestino'] });
      }
      if (instanteOk(d.em) && new Date(d.em).getTime() > agora().getTime() + 60_000) {
        ctx.addIssue({ code: 'custom', message: te.regras.chegadaFutura, path: ['em'] });
      }
    },
    { when: () => true },
  );

/** E6 */
export const esquemaPedirLeito = z.object({
  setorDesejado: z.enum(SETORES_INTERNACAO_IDS, { error: v.selecione }),
  precaucao: z.enum(PRECAUCOES, { error: v.selecione }),
  motivo: textoObrigatorio(3, 300),
});

/** E9 */
export const esquemaReabrir = z.object({ motivo });

export type EntradaChegada = z.input<typeof esquemaChegada>;
export type EntradaTriagem = z.input<ReturnType<typeof esquemaTriagem>>;
export type DadosTriagem = z.output<ReturnType<typeof esquemaTriagem>>;
export type EntradaSinais = z.input<typeof esquemaSinais>;
export type EntradaReavaliacao = z.input<typeof esquemaReavaliacao>;
export type EntradaDesfecho = z.input<typeof esquemaDesfecho>;
export type EntradaPedirLeito = z.input<typeof esquemaPedirLeito>;
