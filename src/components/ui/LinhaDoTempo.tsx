import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { formatarDataHora } from '../../utils/datas';

export interface ItemLinhaDoTempo {
  /** Instante (ISO). */
  em: string;
  titulo: ReactNode;
  detalhe?: ReactNode;
  /** Quem fez (R-X9). */
  autor?: string;
  /** Classe de cor do marcador (ex.: `bg-primary`). Decorativa: o título diz o que houve. */
  cor?: string;
  /** Ícone no lugar do marcador redondo. */
  icone?: ReactNode;
}

/**
 * Histórico imutável, do mais antigo ao mais recente (consulta, internação, atendimento,
 * lote). Cada item tem título, detalhe opcional, data e hora e, quando houver, o autor.
 */
export function LinhaDoTempo({
  itens,
  className,
}: {
  itens: readonly ItemLinhaDoTempo[];
  className?: string;
}) {
  return (
    <ol className={cn('relative space-y-4 border-l border-border pl-5', className)}>
      {itens.map((item, i) => (
        <li key={`${item.em}-${i}`} className="relative">
          {item.icone ? (
            <span
              aria-hidden
              className="absolute top-0 -left-[31px] flex size-[22px] items-center justify-center rounded-full bg-card text-text-muted ring-4 ring-card"
            >
              {item.icone}
            </span>
          ) : (
            <span
              aria-hidden
              className={cn(
                'absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-card',
                item.cor ?? 'bg-primary',
              )}
            />
          )}
          <p className="text-[14px] font-medium">{item.titulo}</p>
          {item.detalhe && <p className="text-[13.5px]">{item.detalhe}</p>}
          <p className="text-[12.5px] text-text-muted tabular-nums">
            <time dateTime={item.em}>{formatarDataHora(item.em)}</time>
            {item.autor && <span> · {item.autor}</span>}
          </p>
        </li>
      ))}
    </ol>
  );
}
