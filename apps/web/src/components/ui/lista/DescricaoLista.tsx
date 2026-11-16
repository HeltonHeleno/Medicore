import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export interface ItemDescricao {
  termo: string;
  descricao: ReactNode;
  /** Ocupa a linha inteira (textos longos). */
  largo?: boolean;
}

/** Pares rótulo/valor em grade (`<dl>`), para as telas de detalhe. Valores vazios mostram "—". */
export function DescricaoLista({
  itens,
  colunas = 2,
  className,
}: {
  itens: ItemDescricao[];
  colunas?: 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        'grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2',
        colunas === 3 && 'lg:grid-cols-3',
        className,
      )}
    >
      {itens.map((item) => (
        <div key={item.termo} className={cn('min-w-0', item.largo && 'sm:col-span-full')}>
          <dt className="text-[12.5px] text-text-muted">{item.termo}</dt>
          <dd className="mt-0.5 text-[14px] break-words text-text">
            {item.descricao === undefined || item.descricao === null || item.descricao === ''
              ? '—'
              : item.descricao}
          </dd>
        </div>
      ))}
    </dl>
  );
}
