/**
 * Fase 27 — Modo API: no lugar de `services/colecoes-operacoes.ts`. Só os nomes das coleções que
 * cada tela assina (para recarregar depois de uma gravação e a cada 30 s, D26).
 */
import { NOMES_OPERACOES as N } from '../nomes-colecoes-operacoes';

export const COLECOES = {
  leitos: [N.leitos, N.internacoes, N.solicitacoes, N.atendimentos, 'pacientes'],
  emergencia: [N.atendimentos, N.solicitacoes, N.leitos, 'pacientes'],
  farmacia: [N.medicamentos, N.lotes, N.movimentacoes, N.dispensacoes],
} as const;
