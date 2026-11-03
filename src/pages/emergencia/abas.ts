import type { AbaModulo } from '../../components/ui/abas';
import { te } from '../../i18n/pt-BR/emergencia';

/** Abas do módulo (18.1): Fila · Alertas · Histórico. */
export const abasEmergencia = (alertas?: number): AbaModulo[] => [
  { rotulo: te.abas.fila, para: '/emergencia' },
  { rotulo: te.abas.alertas, para: '/emergencia?aba=alertas', contador: alertas },
  { rotulo: te.abas.historico, para: '/emergencia/historico' },
];
