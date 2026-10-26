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
import { useDocumentTitle } from '../hooks/useDocumentTitle';
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
 * Painel principal. A grade abaixo já segue o layout de referência;
 * os ajustes finos por largura de tela são da Fase 6.
 */
export default function Dashboard() {
  useDocumentTitle(t.menu.painel);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <WelcomeCard className="xl:col-span-2" />
      <AIInsights />

      <div className="grid min-w-0 gap-5 xl:col-span-2">
        <KpiCards />
        <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <Suspense fallback={<CarregandoGrafico titulo={t.internacoes.titulo} />}>
            <AdmissionChart />
          </Suspense>
          <Suspense fallback={<CarregandoGrafico titulo={t.leitos.titulo} />}>
            <OccupancyDonut />
          </Suspense>
        </div>
      </div>
      <DepartmentPerformance />

      <AlertList />
      <AppointmentsTable />
      <ActivityTimeline />
    </div>
  );
}
