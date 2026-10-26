import { ErrorState } from '../ui/EmptyState';
import { useKpis, useLeitos } from '../../hooks/useDashboardData';
import { t } from '../../i18n/pt-BR';
import { cn } from '../../utils/cn';
import { formatNumero, formatPercentual } from '../../utils/format';
import { resumoLeitos } from '../../utils/leitos';
import { StatCard } from './StatCard';

/** Linha com os 4 indicadores do dia. "Leitos disponíveis" é calculado a partir dos setores. */
export function KpiCards({ className }: { className?: string }) {
  const kpis = useKpis();
  const leitos = useLeitos();

  if (kpis.erro || leitos.erro) {
    return (
      <div
        className={cn(
          'rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-card)]',
          className,
        )}
      >
        <ErrorState
          aoTentarNovamente={() => {
            if (kpis.erro) kpis.recarregar();
            if (leitos.erro) leitos.recarregar();
          }}
        />
      </div>
    );
  }

  const k = kpis.data;
  const l = leitos.data ? resumoLeitos(leitos.data) : null;
  const variacao = k?.variacaoPacientes ?? 0;

  return (
    <section
      aria-label={t.kpisRegiao}
      className={cn('grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-4', className)}
    >
      <StatCard
        titulo={t.kpis.totalPacientes}
        valor={k?.totalPacientes}
        tendencia={variacao > 0 ? 'alta' : variacao < 0 ? 'baixa' : undefined}
        detalhe={t.kpis.variacao(formatPercentual(Math.abs(variacao)))}
      />
      <StatCard
        titulo={t.kpis.leitosDisponiveis}
        valor={l?.disponiveis}
        detalhe={l ? t.kpis.deTotalLeitos(formatNumero(l.total)) : undefined}
      />
      <StatCard
        titulo={t.kpis.medicosPlantao}
        valor={k?.medicosPlantao}
        detalhe={t.kpis.escaladosHoje}
      />
      <StatCard
        titulo={t.kpis.casosEmergencia}
        valor={k?.casosEmergencia}
        destaque="perigo"
        detalhe={
          <a
            href="#alertas-emergencia"
            className="rounded hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {t.kpis.altaPrioridade}
          </a>
        }
      />
    </section>
  );
}
