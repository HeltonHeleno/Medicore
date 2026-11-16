import { useId, type ReactNode } from 'react';
import { cn } from '../../../utils/cn';

interface SecaoFormularioProps {
  titulo: string;
  descricao?: ReactNode;
  /** Colunas da grade a partir de 640px (1 coluna no celular). */
  colunas?: 1 | 2 | 3;
  /** Conteúdo à direita do título (ex.: botão "Buscar CEP"). */
  extra?: ReactNode;
  className?: string;
  children: ReactNode;
}

const grades = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

/** Agrupa campos relacionados (ex.: "Dados pessoais", "Endereço") em um cartão com título. */
export function SecaoFormulario({
  titulo,
  descricao,
  colunas = 2,
  extra,
  className,
  children,
}: SecaoFormularioProps) {
  const idTitulo = useId();
  return (
    <section
      aria-labelledby={idTitulo}
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6',
        className,
      )}
    >
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={idTitulo} className="text-[16px] font-semibold">
            {titulo}
          </h2>
          {descricao && <p className="mt-0.5 text-[13px] text-text-muted">{descricao}</p>}
        </div>
        {extra}
      </header>
      <div className={cn('grid gap-x-5 gap-y-4', grades[colunas])}>{children}</div>
    </section>
  );
}
