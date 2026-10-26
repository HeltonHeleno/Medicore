import {
  Cell,
  Pie,
  PieChart,
  Tooltip,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts';
import { Card } from '../ui/Card';
import { ConteudoAsync } from '../ui/ConteudoAsync';
import { Skeleton } from '../ui/Skeleton';
import { useCoresTema } from '../../hooks/useCoresTema';
import { useLeitos } from '../../hooks/useDashboardData';
import { t } from '../../i18n/pt-BR';
import type { SetorLeitos } from '../../types';
import { cn } from '../../utils/cn';
import { formatPercentual } from '../../utils/format';
import { resumoLeitos } from '../../utils/leitos';

const TAMANHO = 132;

function DicaFatia({ active, payload }: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] shadow-md">
      <span className="font-medium">{item.name}</span>
      <span className="text-text-muted"> · {t.leitos.leitos(Number(item.value))}</span>
    </div>
  );
}

function Rosca({ setores }: { setores: SetorLeitos[] }) {
  const cores = useCoresTema();
  const r = resumoLeitos(setores);
  const dados = [
    { nome: t.leitos.ocupados, valor: r.ocupados, cor: cores.primary },
    { nome: t.leitos.disponiveis, valor: r.disponiveis, cor: cores['primary-light'] },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div
          className="relative shrink-0"
          style={{ width: TAMANHO, height: TAMANHO }}
          aria-label={t.leitos.resumoGrafico(r.percentual, r.ocupados, r.total)}
          role="img"
        >
          <PieChart width={TAMANHO} height={TAMANHO} accessibilityLayer={false}>
            <Pie
              data={dados}
              dataKey="valor"
              nameKey="nome"
              innerRadius={44}
              outerRadius={64}
              startAngle={90}
              endAngle={-270}
              stroke={cores.card}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {dados.map((d) => (
                <Cell key={d.nome} fill={d.cor} />
              ))}
            </Pie>
            <Tooltip content={DicaFatia} />
          </PieChart>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          >
            <span className="text-[22px] leading-none font-bold tabular-nums">
              {formatPercentual(r.percentual)}
            </span>
            <span className="mt-1 text-[10px] text-text-muted">{t.leitos.ocupadosCentro}</span>
          </div>
        </div>

        <dl className="grid min-w-[10rem] flex-1 grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 text-[14px]">
          {dados.map((d, i) => (
            <div key={d.nome} className="contents">
              <dt className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    'size-3 rounded-[3px]',
                    i === 0 ? 'bg-primary' : 'border-2 border-text-muted/60',
                  )}
                />
                {d.nome}
              </dt>
              <dd className="text-right font-medium tabular-nums">{t.leitos.leitos(d.valor)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ul aria-label={t.leitos.setores} className="mt-5 grid grid-cols-3 gap-2.5">
        {setores.map((s) => (
          <li
            key={s.id}
            aria-label={t.leitos.setorResumo(s.nome, s.ocupados, s.total)}
            className="rounded-lg bg-bg px-2 py-2.5 text-center"
          >
            <p aria-hidden className="text-[15px] font-semibold tabular-nums">
              {s.ocupados}/{s.total}
            </p>
            <p aria-hidden className="mt-0.5 text-[11px] text-text-muted">
              {s.nome}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-6">
        <Skeleton largura={TAMANHO} altura={TAMANHO} redondo />
        <div className="flex-1 space-y-3">
          <Skeleton />
          <Skeleton />
        </div>
      </div>
      <Skeleton altura={52} />
    </div>
  );
}

export function OccupancyDonut({ className }: { className?: string }) {
  const leitos = useLeitos();
  return (
    <Card titulo={t.leitos.titulo} className={className}>
      <ConteudoAsync estado={leitos} vazio={t.vazio.leitos} carregando={<Esqueleto />}>
        {(setores) => <Rosca setores={setores} />}
      </ConteudoAsync>
    </Card>
  );
}

export default OccupancyDonut;
