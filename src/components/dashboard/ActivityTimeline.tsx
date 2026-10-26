import { Card } from '../ui/Card';
import { ConteudoAsync } from '../ui/ConteudoAsync';
import { SkeletonLinhas } from '../ui/Skeleton';
import { useAtividades } from '../../hooks/useDashboardData';
import { t } from '../../i18n/pt-BR';
import { formatHora } from '../../utils/format';

export function ActivityTimeline({ className }: { className?: string }) {
  const atividades = useAtividades();
  return (
    <Card titulo={t.atividades.titulo} className={className}>
      <ConteudoAsync
        estado={atividades}
        vazio={t.vazio.atividades}
        carregando={<SkeletonLinhas linhas={6} />}
      >
        {(lista) => (
          <ol className="space-y-3.5">
            {lista.map((a) => (
              <li key={a.id} className="relative pl-4">
                <span
                  aria-hidden
                  className="absolute top-[0.55em] left-0 size-[5px] rounded-full bg-text"
                />
                <p className="text-[14px] leading-snug">{a.descricao}</p>
                <time dateTime={a.horario} className="mt-1 block text-[12px] text-text-muted">
                  {formatHora(a.horario)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </ConteudoAsync>
    </Card>
  );
}
