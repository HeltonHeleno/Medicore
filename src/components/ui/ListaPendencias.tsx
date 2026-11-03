import { BedDouble, Siren } from 'lucide-react';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/pt-BR';
import type { PendenciaModulo } from '../../services/erros';

const rota = (p: PendenciaModulo) =>
  p.tipo === 'internacao' ? `/leitos/internacoes/${p.id}` : `/emergencia/${p.id}`;

/**
 * E-17 (R-X2, R-X4): internações e atendimentos que impedem inativar um cadastro,
 * cada um com o link para resolvê-lo.
 */
export function ListaPendencias({ itens }: { itens: readonly PendenciaModulo[] }) {
  if (itens.length === 0) return null;
  return (
    <section aria-label={t.operacoes.pendenciasTitulo} className="mt-3">
      <h3 className="text-[13.5px] font-semibold">
        {t.operacoes.pendenciasTitulo} ({itens.length})
      </h3>
      <ul className="mt-1 divide-y divide-border">
        {itens.map((p) => (
          <li key={`${p.tipo}-${p.id}`} className="flex items-center gap-2 py-2">
            {p.tipo === 'internacao' ? (
              <BedDouble size={16} aria-hidden className="shrink-0 text-text-muted" />
            ) : (
              <Siren size={16} aria-hidden className="shrink-0 text-text-muted" />
            )}
            <Link
              to={rota(p)}
              className="font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {p.descricao}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
