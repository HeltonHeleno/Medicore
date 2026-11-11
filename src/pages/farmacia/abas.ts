import type { AbaModulo } from '../../components/ui/abas';
import { tf } from '../../i18n/pt-BR/farmacia';

/** Abas do módulo (19.1): Estoque · Movimentações · Vencimentos. */
export const abasFarmacia: AbaModulo[] = [
  { rotulo: tf.abas.estoque, para: '/farmacia' },
  { rotulo: tf.abas.movimentacoes, para: '/farmacia/movimentacoes' },
  { rotulo: tf.abas.vencimentos, para: '/farmacia/vencimentos' },
];
