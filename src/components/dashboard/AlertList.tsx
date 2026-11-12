import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { ConteudoAsync } from '../ui/ConteudoAsync';
import { PriorityBadge } from '../ui/PriorityBadge';
import { Skeleton } from '../ui/Skeleton';
import { useIndicadoresOperacionais } from '../../hooks/useIndicadoresOperacionais';
import { t } from '../../i18n/pt-BR';
import type { AlertaOperacional } from '../../types';

/** Quantos alertas o Painel mostra; o resto fica em `/emergencia?aba=alertas` (A12). */
const NO_PAINEL = 3;

const destino = (a: AlertaOperacional) =>
  a.referencia.tipo === 'atendimento'
    ? `/emergencia/${a.referencia.id}`
    : a.referencia.tipo === 'leito'
      ? `/leitos/${a.referencia.id}`
      : `/leitos?setor=${a.referencia.id}`;

function Esqueleto() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton largura="75%" />
          <Skeleton largura="40%" altura={10} />
        </div>
      ))}
    </div>
  );
}

/** Os 3 primeiros alertas operacionais (prioridade e antiguidade), cada um com link. */
export function AlertList({ className }: { className?: string }) {
  const operacoes = useIndicadoresOperacionais();
  const estado = { ...operacoes, data: operacoes.data?.alertas.slice(0, NO_PAINEL) ?? null };

  return (
    <Card
      id="alertas-emergencia"
      titulo={t.alertas.titulo}
      acao={{ rotulo: t.alertas.verTodos, href: '/emergencia?aba=alertas' }}
      variante="perigo"
      className={className}
    >
      <ConteudoAsync estado={estado} vazio={t.vazio.alertas} carregando={<Esqueleto />}>
        {(lista) => (
          <ul className="-mt-1 divide-y divide-danger/20 border-t border-danger/20">
            {lista.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link
                    to={destino(a)}
                    className="rounded text-[14px] font-medium text-text underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    {a.titulo} — {a.local}
                  </Link>
                  {a.responsavel && <p className="mt-1 text-[12px] text-danger">{a.responsavel}</p>}
                </div>
                <PriorityBadge prioridade={a.prioridade} className="mt-0.5 shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </ConteudoAsync>
    </Card>
  );
}
