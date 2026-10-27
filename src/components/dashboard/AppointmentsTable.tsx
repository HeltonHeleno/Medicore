import { CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { ConteudoAsync } from '../ui/ConteudoAsync';
import { SkeletonLinhas } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';
import { useConsultasHoje, usePendentesRegistro } from '../../hooks/useDashboardData';
import { useOrigem } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import type { ConsultaDetalhada } from '../../types';
import { formatHora } from '../../utils/format';

const th =
  'pr-3 pb-2 text-left text-[11px] font-medium tracking-[0.06em] whitespace-nowrap text-text-muted uppercase last:pr-0';
const link =
  'rounded hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

function LinkPaciente({ consulta }: { consulta: ConsultaDetalhada }) {
  return (
    <Link to={`/consultas/${consulta.id}`} state={useOrigem()} className={link}>
      {consulta.pacienteNome}
    </Link>
  );
}

function Tabela({ consultas }: { consultas: ConsultaDetalhada[] }) {
  const c = t.consultas.colunas;
  return (
    <table className="hidden w-full border-collapse text-[13px] @sm:table">
      <caption className="sr-only">{t.consultas.legendaTabela}</caption>
      <thead>
        <tr>
          <th scope="col" className={th}>
            {c.horario}
          </th>
          <th scope="col" className={th}>
            {c.paciente}
          </th>
          <th scope="col" className={th}>
            {c.departamento}
          </th>
          <th scope="col" className={th}>
            {c.status}
          </th>
        </tr>
      </thead>
      <tbody>
        {consultas.map((con) => (
          <tr key={con.id}>
            <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums">
              <time dateTime={con.inicio}>{formatHora(con.inicio)}</time>
            </td>
            <td className="py-2.5 pr-3 whitespace-nowrap">
              <LinkPaciente consulta={con} />
            </td>
            <td className="py-2.5 pr-3">{con.departamentoNome}</td>
            <td className="py-2.5">
              <StatusBadge status={con.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Quando o card tem menos de 384px de largura útil, a tabela vira uma lista. */
function Lista({ consultas }: { consultas: ConsultaDetalhada[] }) {
  return (
    <ul className="divide-y divide-border @sm:hidden" aria-label={t.consultas.legendaTabela}>
      {consultas.map((con) => (
        <li key={con.id} className="py-3">
          <div className="flex items-center justify-between gap-3">
            <time dateTime={con.inicio} className="text-[14px] font-semibold tabular-nums">
              {formatHora(con.inicio)}
            </time>
            <StatusBadge status={con.status} />
          </div>
          <p className="mt-1 text-[14px]">
            <LinkPaciente consulta={con} />{' '}
            <span className="text-text-muted">· {con.departamentoNome}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Aviso de consultas que já terminaram sem registro (P13), de qualquer dia. */
function AvisoPendentes() {
  const { data } = usePendentesRegistro();
  const n = data?.length ?? 0;
  if (n === 0) return null;
  return (
    <p className="mb-3">
      <Link
        to="/consultas?status=pendentes"
        className={`${link} inline-flex items-center gap-1.5 text-[13px] font-semibold text-danger`}
      >
        <CalendarClock size={15} aria-hidden />
        {t.consultas.aguardandoRegistro(n)}
      </Link>
    </p>
  );
}

export function AppointmentsTable({ className }: { className?: string }) {
  const consultas = useConsultasHoje();
  return (
    <Card
      titulo={t.consultas.titulo}
      acao={{ rotulo: t.consultas.verTodas, href: '/consultas' }}
      className={className}
    >
      <AvisoPendentes />
      <ConteudoAsync
        estado={consultas}
        vazio={t.vazio.consultas}
        carregando={<SkeletonLinhas linhas={5} />}
      >
        {(lista) => (
          <div className="@container">
            <Tabela consultas={lista} />
            <Lista consultas={lista} />
          </div>
        )}
      </ConteudoAsync>
    </Card>
  );
}
