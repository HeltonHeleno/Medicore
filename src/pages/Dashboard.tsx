import { lazy, Suspense } from 'react';
import { ActivityTimeline } from '../components/dashboard/ActivityTimeline';
import { AIInsights } from '../components/dashboard/AIInsights';
import { AlertList } from '../components/dashboard/AlertList';
import { AppointmentsTable } from '../components/dashboard/AppointmentsTable';
import { DepartmentPerformance } from '../components/dashboard/DepartmentPerformance';
import { KpiCards } from '../components/dashboard/KpiCards';
import { WelcomeCard } from '../components/dashboard/WelcomeCard';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { t } from '../i18n/pt-BR';

// Recharts é carregado sob demanda, fora do bundle inicial.
const AdmissionChart = lazy(() => import('../components/dashboard/AdmissionChart'));
const OccupancyDonut = lazy(() => import('../components/dashboard/OccupancyDonut'));

function CarregandoGrafico({ titulo, className }: { titulo: string; className?: string }) {
  return (
    <Card titulo={titulo} className={className}>
      <Skeleton altura={180} className="mt-auto" />
    </Card>
  );
}

/**
 * Posição de cada card por largura de tela.
 *
 * Desktop (≥1280px, 3 colunas):
 *   Boas-vindas (2) | Assistente IA
 *   [KPIs ×4 / Internações + Ocupação] (2) | Desempenho
 *   Alertas | Consultas | Linha do tempo
 *
 * Tablet (768–1279px, 2 colunas):
 *   Boas-vindas (2) · KPIs 2×2 (2) · Internações | Ocupação · Assistente IA | Desempenho
 *   · Alertas | Consultas · Linha do tempo (2)
 *
 * Celular (<768px, 1 coluna):
 *   Boas-vindas · KPIs · Alertas · Consultas · Ocupação · Internações · Desempenho
 *   · Assistente IA · Linha do tempo
 *
 * Abaixo de 1280px os blocos aninhados usam `display: contents`, então todos os
 * cards participam da mesma grade e a ordem é controlada por `order`.
 */
const posicao = {
  boasVindas: 'order-1 md:col-span-2 xl:order-1',
  ia: 'order-8 md:order-5 xl:order-2',
  blocoCentral: 'contents xl:order-3 xl:col-span-2 xl:grid xl:min-w-0 xl:grid-cols-1 xl:gap-5',
  kpis: 'order-2 md:col-span-2 xl:order-none xl:col-span-1',
  graficos: 'contents xl:grid xl:grid-cols-[1.25fr_1fr] xl:gap-5',
  internacoes: 'order-6 md:order-3 xl:order-none',
  ocupacao: 'order-5 md:order-4 xl:order-none',
  departamentos: 'order-7 md:order-6 xl:order-4',
  alertas: 'order-3 md:order-7 xl:order-5',
  consultas: 'order-4 md:order-8 xl:order-6',
  atividades: 'order-9 md:col-span-2 xl:order-7 xl:col-span-1',
} as const;

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
      <WelcomeCard className={posicao.boasVindas} />
      <AIInsights className={posicao.ia} />

      <div className={posicao.blocoCentral}>
        <KpiCards className={posicao.kpis} />
        <div className={posicao.graficos}>
          <Suspense
            fallback={
              <CarregandoGrafico titulo={t.internacoes.titulo} className={posicao.internacoes} />
            }
          >
            <AdmissionChart className={posicao.internacoes} />
          </Suspense>
          <Suspense
            fallback={<CarregandoGrafico titulo={t.leitos.titulo} className={posicao.ocupacao} />}
          >
            <OccupancyDonut className={posicao.ocupacao} />
          </Suspense>
        </div>
      </div>

      <DepartmentPerformance className={posicao.departamentos} />
      <AlertList className={posicao.alertas} />
      <AppointmentsTable className={posicao.consultas} />
      <ActivityTimeline className={posicao.atividades} />
    </div>
  );
}
