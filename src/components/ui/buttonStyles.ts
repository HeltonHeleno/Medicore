import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type VarianteBotao = 'primario' | 'contorno' | 'suave';
export type TamanhoBotao = 'md' | 'sm';

export interface PropsVisuais {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  iconeEsquerda?: ReactNode;
  iconeDireita?: ReactNode;
  /** Ocupa toda a largura, com o ícone da direita encostado na borda. */
  largo?: boolean;
}

const base =
  'inline-flex items-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

const variantes: Record<VarianteBotao, string> = {
  primario: 'bg-primary text-on-primary hover:bg-primary/90',
  contorno: 'border border-border bg-card text-on-primary-light hover:bg-primary-light/40',
  suave: 'bg-primary-light/70 text-on-primary-light hover:bg-primary-light',
};

const tamanhos: Record<TamanhoBotao, string> = {
  md: 'px-5 py-3 text-[15px]',
  sm: 'px-3 py-1.5 text-[13px]',
};

/** Classes de botão, reaproveitáveis em qualquer elemento. */
export function classesBotao({
  variante = 'primario',
  tamanho = 'md',
  largo = false,
}: Pick<PropsVisuais, 'variante' | 'tamanho' | 'largo'> = {}) {
  return cn(base, variantes[variante], tamanhos[tamanho], largo && 'w-full justify-between');
}
