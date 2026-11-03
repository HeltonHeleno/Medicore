import {
  CircleAlert,
  CircleDot,
  CircleMinus,
  Siren,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { TEMPO_ALVO_MIN } from '../../config/limites';
import { te } from '../../i18n/pt-BR/emergencia';
import type { CorRisco } from '../../types';
import { cn } from '../../utils/cn';

/** Classes estáticas (o Tailwind só gera as que aparecem por extenso no código). */
const ESTILO: Record<CorRisco, string> = {
  vermelho: 'bg-risco-vermelho text-on-risco-vermelho border-borda-risco-vermelho',
  laranja: 'bg-risco-laranja text-on-risco-laranja border-borda-risco-laranja',
  amarelo: 'bg-risco-amarelo text-on-risco-amarelo border-borda-risco-amarelo',
  verde: 'bg-risco-verde text-on-risco-verde border-borda-risco-verde',
  azul: 'bg-risco-azul text-on-risco-azul border-borda-risco-azul',
};

/** Uma forma por cor: em escala de cinza, o ícone e o nome continuam distinguindo. */
const ICONE: Record<CorRisco, LucideIcon> = {
  vermelho: Siren,
  laranja: TriangleAlert,
  amarelo: CircleAlert,
  verde: CircleDot,
  azul: CircleMinus,
};

interface BadgeRiscoProps {
  risco: CorRisco;
  /**
   * - `curto`: só o nome da cor ("Laranja");
   * - `extenso` (padrão): "Laranja — muito urgente";
   * - `tempoAlvo`: "Laranja — até 10 min".
   */
  variante?: 'curto' | 'extenso' | 'tempoAlvo';
  className?: string;
}

/** Classificação de risco: cor + ícone + nome por extenso, nunca só a cor. */
export function BadgeRisco({ risco, variante = 'extenso', className }: BadgeRiscoProps) {
  const Icone = ICONE[risco];
  const texto =
    variante === 'curto'
      ? te.cores[risco]
      : variante === 'tempoAlvo'
        ? te.comTempoAlvo(te.cores[risco], TEMPO_ALVO_MIN[risco])
        : te.corPorExtenso(risco);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[12.5px] leading-none font-semibold whitespace-nowrap',
        ESTILO[risco],
        className,
      )}
    >
      <Icone size={14} aria-hidden className="shrink-0" />
      {texto}
    </span>
  );
}
