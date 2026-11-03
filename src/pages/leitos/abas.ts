import type { AbaModulo } from '../../components/ui/abas';
import { tl } from '../../i18n/pt-BR/leitos';

/** Abas do módulo (17.1): Mapa · Internações. */
export const abasLeitos: AbaModulo[] = [
  { rotulo: tl.abas.mapa, para: '/leitos' },
  { rotulo: tl.abas.internacoes, para: '/leitos/internacoes' },
];
