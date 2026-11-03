import { EVASAO_MIN } from '../../config/limites';
import type { AtendimentoDetalhado, StatusAtendimento } from '../../types';
import { minutosDesde } from '../../utils/tempos';

/** Ações do atendimento (matriz de ações por estado, esp. "Atendimento"). */
export type AcaoAtendimento =
  | 'triar'
  | 'chamar'
  | 'observacao'
  | 'retomar'
  | 'pedirLeito'
  | 'encerrar'
  | 'identificar'
  | 'sinais'
  | 'reabrir';

const ABERTOS: readonly StatusAtendimento[] = [
  'aguardando_triagem',
  'aguardando_atendimento',
  'em_atendimento',
  'em_observacao',
  'aguardando_leito',
];

const MATRIZ: Record<AcaoAtendimento, readonly StatusAtendimento[]> = {
  chamar: ['aguardando_atendimento'],
  triar: ABERTOS,
  observacao: ['em_atendimento'],
  retomar: ['em_observacao'],
  pedirLeito: ['em_atendimento', 'em_observacao'],
  encerrar: ABERTOS,
  identificar: ['aguardando_triagem', 'aguardando_atendimento', 'em_atendimento', 'em_observacao'],
  sinais: ABERTOS,
  reabrir: ['encerrado'],
};

/** Ações na ordem em que aparecem no detalhe (a principal primeiro). */
export function acoesDoAtendimento(a: AtendimentoDetalhado): AcaoAtendimento[] {
  const ordem: AcaoAtendimento[] = [
    a.status === 'aguardando_triagem' ? 'triar' : 'chamar',
    'retomar',
    'observacao',
    'pedirLeito',
    'sinais',
    ...(a.status === 'aguardando_triagem' ? [] : (['triar'] as const)),
    'identificar',
    'encerrar',
    'reabrir',
  ];
  return ordem.filter((x, i) => {
    if (ordem.indexOf(x) !== i || !MATRIZ[x].includes(a.status)) return false;
    if (x === 'identificar') return !a.pacienteId;
    if (x === 'reabrir') return !!a.reabrirAte;
    return true;
  });
}

/** A evasão só vale depois de 30 min da chegada (R-E11). */
export const evasaoLiberada = (chegadaEm: string, momento?: Date) =>
  minutosDesde(chegadaEm, momento) >= EVASAO_MIN;
