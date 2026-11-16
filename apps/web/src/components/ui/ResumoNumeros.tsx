import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { formatNumero } from '../../utils/format';

export interface ItemResumo {
  rotulo: string;
  valor: number;
  /** Complemento depois do número (ex.: "/30 (73%)"). */
  complemento?: string;
  /** Link para a lista já filtrada (ex.: `/farmacia?situacao=baixo`). */
  para?: string;
  /** Chama atenção quando o valor importa (ex.: zerados, acima do prazo). */
  destaque?: 'perigo';
}

/**
 * Linha de números com rótulo ("Baixo 3 · Zerado 1"), no estilo do `StatCard` em tamanho
 * menor. É uma lista: o leitor de tela anuncia "Baixo, 3" item a item.
 */
export function ResumoNumeros({
  rotulo,
  itens,
  className,
}: {
  /** Nome acessível do resumo (ex.: "Resumo do estoque"). */
  rotulo: string;
  itens: readonly ItemResumo[];
  className?: string;
}) {
  return (
    <ul aria-label={rotulo} className={cn('flex flex-wrap gap-2 sm:gap-3', className)}>
      {itens.map((item) => {
        const conteudo = (
          <>
            <span className="text-[12.5px] font-medium text-text-muted">{item.rotulo}</span>
            <span
              className={cn(
                'text-[20px] leading-tight font-bold tabular-nums',
                item.destaque === 'perigo' && item.valor > 0 ? 'text-danger' : 'text-text',
              )}
            >
              {formatNumero(item.valor)}
              {item.complemento && (
                <span className="ml-1 text-[13px] font-medium text-text-muted">
                  {item.complemento}
                </span>
              )}
            </span>
          </>
        );
        const classe =
          'flex min-w-[7.5rem] flex-col rounded-lg border border-border bg-card px-3 py-2 shadow-[var(--shadow-card)]';
        return (
          <li key={item.rotulo}>
            {item.para ? (
              <Link
                to={item.para}
                className={cn(
                  classe,
                  'hover:border-border-input focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                )}
              >
                {conteudo}
              </Link>
            ) : (
              <div className={classe}>{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
