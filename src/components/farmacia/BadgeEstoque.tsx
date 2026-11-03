import {
  CalendarX,
  CircleCheck,
  CircleX,
  Hourglass,
  Lock,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react';
import { tf } from '../../i18n/pt-BR/farmacia';
import type { SituacaoEstoque } from '../../types';
import { cn } from '../../utils/cn';

/** Situação do medicamento (R-F6) ou do lote (vencendo, vencido, bloqueado). */
export type SituacaoSelo = SituacaoEstoque | 'vencendo' | 'vencido' | 'bloqueado';

const SELO: Record<SituacaoSelo, { texto: string; icone: LucideIcon; classe: string }> = {
  ok: {
    texto: tf.situacoes.ok,
    icone: CircleCheck,
    classe: 'border-transparent bg-primary-light text-on-primary-light',
  },
  baixo: {
    texto: tf.situacoes.baixo,
    icone: TrendingDown,
    classe: 'border-warning/60 bg-card text-warning',
  },
  zerado: {
    texto: tf.situacoes.zerado,
    icone: CircleX,
    classe: 'border-danger/40 bg-danger-bg text-danger',
  },
  vencendo: {
    texto: tf.vencendo,
    icone: Hourglass,
    classe: 'border-on-leito-higienizacao bg-leito-higienizacao text-on-leito-higienizacao',
  },
  vencido: {
    texto: tf.vencido,
    icone: CalendarX,
    classe: 'border-danger bg-danger text-on-danger',
  },
  bloqueado: {
    texto: tf.bloqueado,
    icone: Lock,
    classe: 'border-on-leito-bloqueado bg-leito-bloqueado text-on-leito-bloqueado',
  },
};

/** Selo de estoque com texto + ícone (a cor só reforça). */
export function BadgeEstoque({
  situacao,
  className,
}: {
  situacao: SituacaoSelo;
  className?: string;
}) {
  const { texto, icone: Icone, classe } = SELO[situacao];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[12px] leading-none font-semibold whitespace-nowrap',
        classe,
        className,
      )}
    >
      <Icone size={13} aria-hidden className="shrink-0" />
      {texto}
    </span>
  );
}
