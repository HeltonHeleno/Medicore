import { useId, useState } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts';
import { Card } from '../ui/Card';
import { ConteudoAsync } from '../ui/ConteudoAsync';
import { Skeleton } from '../ui/Skeleton';
import { useCoresTema } from '../../hooks/useCoresTema';
import { useInternacoes } from '../../hooks/useDashboardData';
import { t } from '../../i18n/pt-BR';
import type { PeriodoInternacao, PontoInternacao } from '../../types';
import { formatNumero } from '../../utils/format';

const PERIODOS: PeriodoInternacao[] = ['semana', 'mes', 'ano'];
const ALTURA = 180;

function Dica({ active, payload, label }: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] shadow-md">
      <span className="font-medium">{label}</span>
      <span className="text-text-muted"> · {t.internacoes.tooltip(Number(payload[0].value))}</span>
    </div>
  );
}

function resumo(pontos: PontoInternacao[]) {
  const min = pontos.reduce((a, b) => (b.valor < a.valor ? b : a));
  const max = pontos.reduce((a, b) => (b.valor > a.valor ? b : a));
  return t.internacoes.resumoGrafico(min.rotulo, min.valor, max.rotulo, max.valor);
}

function Grafico({ pontos }: { pontos: PontoInternacao[] }) {
  const cores = useCoresTema();
  const idGradiente = `grad-${useId().replace(/:/g, '')}`;

  return (
    <>
      <div role="img" aria-label={resumo(pontos)} className="-mx-1 mt-auto">
        <ResponsiveContainer width="100%" height={ALTURA}>
          <AreaChart
            data={pontos}
            margin={{ top: 8, right: 6, bottom: 0, left: 6 }}
            accessibilityLayer={false}
          >
            <defs>
              <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cores.primary} stopOpacity={0.22} />
                <stop offset="100%" stopColor={cores.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="rotulo"
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              interval="preserveStartEnd"
              tick={{ fill: cores['text-muted'], fontSize: 12 }}
            />
            <YAxis hide domain={['dataMin - 8', 'dataMax + 8']} />
            <Tooltip
              content={Dica}
              cursor={{ stroke: cores.border, strokeWidth: 1.5 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="valor"
              stroke={cores.primary}
              strokeWidth={2}
              fill={`url(#${idGradiente})`}
              activeDot={{ r: 5, fill: cores.primary, stroke: cores.card, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Versão em tabela para leitores de tela */}
      <table className="sr-only">
        <caption>{t.internacoes.tabelaLegenda}</caption>
        <thead>
          <tr>
            <th scope="col">{t.internacoes.colunaPeriodo}</th>
            <th scope="col">{t.internacoes.colunaInternacoes}</th>
          </tr>
        </thead>
        <tbody>
          {pontos.map((p) => (
            <tr key={p.rotulo}>
              <th scope="row">{p.rotulo}</th>
              <td>{formatNumero(p.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function AdmissionChart({ className }: { className?: string }) {
  const [periodo, setPeriodo] = useState<PeriodoInternacao>('semana');
  const internacoes = useInternacoes(periodo);
  const idSelect = useId();

  const seletor = (
    <div>
      <label htmlFor={idSelect} className="sr-only">
        {t.internacoes.rotuloPeriodo}
      </label>
      <select
        id={idSelect}
        value={periodo}
        onChange={(e) => setPeriodo(e.target.value as PeriodoInternacao)}
        className="cursor-pointer rounded-md border border-transparent bg-transparent py-0.5 pr-1 text-[13px] text-text hover:border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
      >
        {PERIODOS.map((p) => (
          <option key={p} value={p}>
            {t.internacoes.periodos[p]}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <Card titulo={t.internacoes.titulo} extra={seletor} className={className}>
      <ConteudoAsync
        estado={internacoes}
        vazio={t.vazio.internacoes}
        carregando={<Skeleton altura={ALTURA} className="mt-auto" />}
      >
        {(pontos) => <Grafico pontos={pontos} />}
      </ConteudoAsync>
    </Card>
  );
}

export default AdmissionChart;
