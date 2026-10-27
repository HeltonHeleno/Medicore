import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import { Breadcrumb } from './Breadcrumb';

interface CabecalhoPaginaProps {
  titulo: string;
  descricao?: ReactNode;
  /** Botões à direita (ex.: "Novo paciente"). */
  acoes?: ReactNode;
  /** Texto do último item do breadcrumb, quando ele é dinâmico (nome do registro). */
  breadcrumbFinal?: string;
  /** Conteúdo ao lado do título (ex.: badge "Inativo"). */
  aoLadoDoTitulo?: ReactNode;
  className?: string;
}

/** Topo das páginas internas: breadcrumb, `<h1>` focável (M11) e ações. */
export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
  breadcrumbFinal,
  aoLadoDoTitulo,
  className,
}: CabecalhoPaginaProps) {
  return (
    <header className={cn('mb-5 space-y-2', className)}>
      <Breadcrumb final={breadcrumbFinal} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 tabIndex={-1} className="text-2xl font-bold outline-none">
              {titulo}
            </h1>
            {aoLadoDoTitulo}
          </div>
          {descricao && <p className="mt-1 text-text-muted">{descricao}</p>}
        </div>
        {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </div>
    </header>
  );
}
