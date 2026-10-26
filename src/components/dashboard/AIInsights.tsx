import { ChevronRight } from 'lucide-react';
import { ButtonLink } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConteudoAsync } from '../ui/ConteudoAsync';
import { SkeletonLinhas } from '../ui/Skeleton';
import { useInsights } from '../../hooks/useDashboardData';
import { t } from '../../i18n/pt-BR';

export function AIInsights({ className }: { className?: string }) {
  const insights = useInsights();

  return (
    <Card titulo={t.ia.titulo} className={className}>
      <div className="flex flex-1 flex-col rounded-[10px] border border-border p-4">
        <h3 className="text-[14px] font-semibold">{t.ia.insightsHoje}</h3>
        <div className="mt-3 flex-1">
          <ConteudoAsync
            estado={insights}
            vazio={t.vazio.insights}
            carregando={<SkeletonLinhas linhas={3} />}
          >
            {(lista) => (
              <ul className="list-disc space-y-3 pl-5 text-[14px] leading-snug marker:text-text-muted">
                {lista.map((i) => (
                  <li key={i.id}>{i.texto}</li>
                ))}
              </ul>
            )}
          </ConteudoAsync>
        </div>
        <ButtonLink
          to="/analises"
          variante="suave"
          tamanho="sm"
          largo
          iconeDireita={<ChevronRight size={18} />}
          className="mt-4 py-2.5 text-[14px]"
        >
          {t.ia.verTodos}
        </ButtonLink>
      </div>
    </Card>
  );
}
