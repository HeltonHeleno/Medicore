import { useRelogio } from '../../hooks/useRelogio';
import { t } from '../../i18n/pt-BR';
import { cn } from '../../utils/cn';
import { excessoMin, formatarEspera, formatarPrazo, minutosDesde } from '../../utils/tempos';

type TempoDecorridoProps =
  | { desde: string; prazo?: never; className?: string }
  | { prazo: string; desde?: never; className?: string };

/**
 * "há 12 min" (desde um instante) ou "até 10:28" (prazo), recalculado a cada tique do
 * `useRelogio` a partir do instante gravado (nunca de um contador, RS-14).
 * Fica de propósito **fora** de `aria-live`: o leitor de tela não fala a cada minuto.
 * No prazo vencido, mostra o excesso em destaque ("até 10:28 +15 min").
 */
export function TempoDecorrido(props: TempoDecorridoProps) {
  const { agora } = useRelogio();
  if (props.desde !== undefined) {
    return (
      <time dateTime={props.desde} className={cn('tabular-nums', props.className)}>
        {formatarEspera(minutosDesde(props.desde, agora))}
      </time>
    );
  }
  const prazo = formatarPrazo(props.prazo);
  const excesso = excessoMin(props.prazo, agora);
  return (
    <time
      dateTime={props.prazo}
      className={cn('tabular-nums', excesso > 0 && 'font-semibold text-danger', props.className)}
      aria-label={excesso > 0 ? t.tempo.prazoPassou(prazo, excesso) : undefined}
    >
      {prazo}
      {excesso > 0 && <span className="ml-1">{t.tempo.passou(excesso)}</span>}
    </time>
  );
}
