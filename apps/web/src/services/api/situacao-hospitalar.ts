/**
 * Fase 27 (BL-01.7) — Modo API: toma o lugar de `services/situacao-hospitalar.ts` quando o app é construído com
 * `VITE_API_URL` (ver `vite.config.ts`). Mesmas funções e assinaturas; os dados vêm da API.
 */

import type * as L from '../situacao-hospitalar';
import { to } from '@medicore/dominio/i18n/pt-BR/operacoes';
import { operacoes as c } from './cliente';

export const situacaoHospitalar: typeof L.situacaoHospitalar = c.situacaoHospitalar;
export const situacoesHospitalares: typeof L.situacoesHospitalares = c.situacoesHospitalares;
export const etiquetasHospitalares: typeof L.etiquetasHospitalares = c.etiquetasHospitalares;
export const historicoHospitalar: typeof L.historicoHospitalar = c.historicoHospitalar;
export const vinculosDoMedico: typeof L.vinculosDoMedico = c.vinculosDoMedico;

export const DIAS_HISTORICO_ATENDIMENTOS: typeof L.DIAS_HISTORICO_ATENDIMENTOS = 7;
export const DIAS_HISTORICO_DISPENSACOES: typeof L.DIAS_HISTORICO_DISPENSACOES = 30;

export const etiquetaSituacao: typeof L.etiquetaSituacao = (s) => {
  if (s.internacao) return to.etiquetaInternado(s.internacao.leitoCodigo);
  if (s.atendimento) return to.etiquetaEmergencia(s.atendimento.numero);
  return undefined;
};
