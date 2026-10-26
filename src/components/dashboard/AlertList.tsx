import { Card } from '../ui/Card';
import { ConteudoAsync } from '../ui/ConteudoAsync';
import { PriorityBadge } from '../ui/PriorityBadge';
import { Skeleton } from '../ui/Skeleton';
import { useAlertas } from '../../hooks/useDashboardData';
import { t } from '../../i18n/pt-BR';

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

export function AlertList({ className }: { className?: string }) {
  const alertas = useAlertas();

  return (
    <Card
      id="alertas-emergencia"
      titulo={t.alertas.titulo}
      acao={{ rotulo: t.alertas.verTodos, href: '/emergencia' }}
      variante="perigo"
      className={className}
    >
      <ConteudoAsync estado={alertas} vazio={t.vazio.alertas} carregando={<Esqueleto />}>
        {(lista) => (
          <ul className="-mt-1 divide-y divide-danger/20 border-t border-danger/20">
            {lista.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-text">
                    {a.titulo} — {a.local}
                  </p>
                  <p className="mt-1 text-[12px] text-danger">{a.medico}</p>
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
