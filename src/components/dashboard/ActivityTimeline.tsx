import { Card } from '../ui/Card';
import { ConteudoAsync } from '../ui/ConteudoAsync';
import { SkeletonLinhas } from '../ui/Skeleton';
import { useAtividades } from '../../hooks/useDashboardData';
import { t } from '../../i18n/pt-BR';
import { dataDoInstante, formatarData, hojeNoFuso, somarDias } from '../../utils/datas';
import { formatHora } from '../../utils/format';

/** Hoje: só a hora; ontem: "Ontem, 14:20"; antes disso: "25/10/2026 · 14:20". */
function quando(iso: string): string {
  const dia = dataDoInstante(iso);
  const hoje = hojeNoFuso();
  const hora = formatHora(iso);
  if (dia === hoje) return hora;
  if (dia === somarDias(hoje, -1)) return t.atividades.ontem(hora);
  return `${formatarData(dia)} · ${hora}`;
}

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
                <time dateTime={a.em} className="mt-1 block text-[12px] text-text-muted">
                  {quando(a.em)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </ConteudoAsync>
    </Card>
  );
}
