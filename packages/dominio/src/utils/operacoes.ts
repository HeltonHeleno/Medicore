/**
 * Fase 27 — Textos e regras puras dos módulos que as telas usam direto (sem chamar o serviço).
 * Vieram de `apps/web/src/services/emergencia.ts` e `farmacia.ts`, para valerem igual no modo
 * do navegador, no modo da API e no servidor.
 */
import { tf } from '../i18n/pt-BR/farmacia';
import type { Medicamento, StatusAtendimento, TipoDesfecho } from '../types';

/** Matriz de ações: em quais status cada desfecho direto vale (E5). */
export const DESFECHO_PERMITIDO: Record<
  Exclude<TipoDesfecho, 'internacao'>,
  readonly StatusAtendimento[]
> = {
  alta: ['em_atendimento', 'em_observacao', 'aguardando_leito'],
  transferencia: ['em_atendimento', 'em_observacao', 'aguardando_leito'],
  obito: ['aguardando_atendimento', 'em_atendimento', 'em_observacao', 'aguardando_leito'],
  evasao: ['aguardando_triagem', 'aguardando_atendimento'],
};

/** Desfechos que valem para o status (para a tela montar o diálogo). */
export const desfechosPermitidos = (status: StatusAtendimento) =>
  (Object.keys(DESFECHO_PERMITIDO) as (keyof typeof DESFECHO_PERMITIDO)[]).filter((d) =>
    DESFECHO_PERMITIDO[d].includes(status),
  );

/** "6 comprimidos" */
export const quantidadeComUnidade = (m: Pick<Medicamento, 'unidade'>, n: number) =>
  `${n.toLocaleString('pt-BR')} ${tf.unidades[m.unidade](n)}`;

/** "Dipirona sódica 500 mg" */
export const nomeMedicamento = (m: Pick<Medicamento, 'nome' | 'concentracao'>) =>
  `${m.nome} ${m.concentracao}`;
