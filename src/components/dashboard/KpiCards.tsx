import { ErrorState } from '../ui/EmptyState';
import { useIndicadoresPainel, useKpis } from '../../hooks/useDashboardData';
import { useIndicadoresOperacionais } from '../../hooks/useIndicadoresOperacionais';
import { t } from '../../i18n/pt-BR';
import { cn } from '../../utils/cn';
import { formatNumero, formatPercentual } from '../../utils/format';
import { StatCard } from './StatCard';

/**
 * Linha com os 4 indicadores do dia. "Total de pacientes" e "Médicos de plantão" vêm dos
 * cadastros; "Leitos disponíveis" (só livres, A13) e "Casos de emergência" (abertos, com
 * os de vermelho e laranja) vêm dos módulos, carregados sob demanda (D20).
 */
export function KpiCards({ className }: { className?: string }) {
  const kpis = useKpis();
  const operacoes = useIndicadoresOperacionais();
  const cadastros = useIndicadoresPainel();

  if (kpis.erro || operacoes.erro || cadastros.erro) {
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
            if (operacoes.erro) operacoes.recarregar();
            if (cadastros.erro) cadastros.recarregar();
          }}
        />
      </div>
    );
  }

  const k = kpis.data;
  const c = cadastros.data;
  const l = operacoes.data?.leitos;
  const e = operacoes.data?.emergencia;
  const variacao = k?.variacaoPacientes ?? 0;

  return (
    <section
      aria-label={t.kpisRegiao}
      className={cn('grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-4', className)}
    >
      <StatCard
        titulo={t.kpis.totalPacientes}
        valor={c?.pacientesAtivos}
        tendencia={variacao > 0 ? 'alta' : variacao < 0 ? 'baixa' : undefined}
        detalhe={t.kpis.variacao(formatPercentual(Math.abs(variacao)))}
      />
      <StatCard
        titulo={t.kpis.leitosDisponiveis}
        valor={l?.disponiveis}
        detalhe={l ? t.kpis.deTotalLeitos(formatNumero(l.operacionais)) : undefined}
      />
      <StatCard
        titulo={t.kpis.medicosPlantao}
        valor={c?.medicosPlantao}
        detalhe={t.kpis.escaladosHoje}
      />
      <StatCard
        titulo={t.kpis.casosEmergencia}
        valor={e?.abertos}
        destaque="perigo"
        detalhe={
          e ? (
            <a
              href="#alertas-emergencia"
              className="rounded hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {t.kpis.altaPrioridade(e.altaPrioridade)}
            </a>
          ) : undefined
        }
      />
    </section>
  );
}
