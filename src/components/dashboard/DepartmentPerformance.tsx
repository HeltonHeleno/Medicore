import { Card } from '../ui/Card';
import { ConteudoAsync } from '../ui/ConteudoAsync';
import { ProgressBar } from '../ui/ProgressBar';
import { Skeleton } from '../ui/Skeleton';
import { LIMITE_ALERTA_DEPARTAMENTO } from '../../config/limites';
import { useDepartamentos } from '../../hooks/useDashboardData';
import { t } from '../../i18n/pt-BR';
import { formatPercentual } from '../../utils/format';

function Esqueleto() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton largura="60%" />
          <Skeleton altura={6} />
        </div>
      ))}
    </div>
  );
}

export function DepartmentPerformance({ className }: { className?: string }) {
  const departamentos = useDepartamentos();

  return (
    <Card titulo={t.departamentos.titulo} className={className}>
      <ConteudoAsync
        estado={departamentos}
        vazio={t.vazio.departamentos}
        carregando={<Esqueleto />}
      >
        {(lista) => (
          <ul className="flex flex-1 flex-col justify-between gap-5">
            {lista.map((d) => (
              <li key={d.id}>
                <div className="mb-2 flex items-baseline justify-between gap-3 text-[14px]">
                  <span>{d.nome}</span>
                  <span className="tabular-nums">{formatPercentual(d.desempenho)}</span>
                </div>
                <ProgressBar
                  valor={d.desempenho}
                  rotulo={d.nome}
                  cor={d.desempenho >= LIMITE_ALERTA_DEPARTAMENTO ? 'perigo' : 'primaria'}
                />
              </li>
            ))}
          </ul>
        )}
      </ConteudoAsync>
    </Card>
  );
}
