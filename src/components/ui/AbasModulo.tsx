import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { abaAtiva, type AbaModulo } from './abas';

/**
 * Abas de navegação de um módulo (Mapa · Internações; Fila · Alertas · Histórico).
 * São links (cada aba é uma URL), com `aria-current="page"` na atual; não é um `tablist`.
 * No celular, a faixa rola na horizontal sem alargar a página.
 */
export function AbasModulo({
  rotulo,
  abas,
  className,
}: {
  /** Nome acessível da navegação (ex.: "Seções da Emergência"). */
  rotulo: string;
  abas: readonly AbaModulo[];
  className?: string;
}) {
  const { pathname, search } = useLocation();
  const ativa = abaAtiva(abas, pathname, search);
  return (
    <nav aria-label={rotulo} className={cn('-mx-1 max-w-full overflow-x-auto', className)}>
      <ul className="flex min-w-max gap-1 border-b border-border px-1">
        {abas.map((aba, i) => {
          const atual = i === ativa;
          return (
            <li key={aba.para}>
              <Link
                to={aba.para}
                aria-current={atual ? 'page' : undefined}
                className={cn(
                  '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[14px] font-medium whitespace-nowrap',
                  'focus-visible:rounded-t focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                  atual
                    ? 'border-primary text-on-primary-light'
                    : 'border-transparent text-text-muted hover:border-border-input hover:text-text',
                )}
              >
                {aba.rotulo}
                {aba.contador !== undefined && (
                  <span className="rounded-full bg-bg px-1.5 py-0.5 text-[12px] leading-none tabular-nums">
                    {aba.contador}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
