import {
  Ban,
  BedDouble,
  CalendarClock,
  CircleCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { StatusLeito } from '../../types';

/** Fundo suave e texto/borda/ícone no par de contraste AA de cada situação. */
export const ESTILO_LEITO: Record<StatusLeito, string> = {
  livre: 'bg-leito-livre text-on-leito-livre border-on-leito-livre',
  ocupado: 'bg-leito-ocupado text-on-leito-ocupado border-on-leito-ocupado',
  reservado: 'bg-leito-reservado text-on-leito-reservado border-on-leito-reservado',
  higienizacao: 'bg-leito-higienizacao text-on-leito-higienizacao border-on-leito-higienizacao',
  bloqueado: 'bg-leito-bloqueado text-on-leito-bloqueado border-on-leito-bloqueado',
};

/** Cor só da borda (cartão do leito). */
export const BORDA_LEITO: Record<StatusLeito, string> = {
  livre: 'border-l-on-leito-livre',
  ocupado: 'border-l-on-leito-ocupado',
  reservado: 'border-l-on-leito-reservado',
  higienizacao: 'border-l-on-leito-higienizacao',
  bloqueado: 'border-l-on-leito-bloqueado',
};

export const ICONE_LEITO: Record<StatusLeito, LucideIcon> = {
  livre: CircleCheck,
  ocupado: BedDouble,
  reservado: CalendarClock,
  higienizacao: Sparkles,
  bloqueado: Ban,
};
