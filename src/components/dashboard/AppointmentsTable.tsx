import { Card } from '../ui/Card';
import { ConteudoAsync } from '../ui/ConteudoAsync';
import { SkeletonLinhas } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';
import { useConsultasHoje } from '../../hooks/useDashboardData';
import { t } from '../../i18n/pt-BR';
import type { ConsultaPainel } from '../../types';
import { formatHora } from '../../utils/format';

const th =
  'pr-3 pb-2 text-left text-[11px] font-medium tracking-[0.06em] whitespace-nowrap text-text-muted uppercase last:pr-0';

function Tabela({ consultas }: { consultas: ConsultaPainel[] }) {
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
              <time dateTime={con.horario}>{formatHora(con.horario)}</time>
            </td>
            <td className="py-2.5 pr-3 whitespace-nowrap">{con.paciente}</td>
            <td className="py-2.5 pr-3">{con.departamento}</td>
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
function Lista({ consultas }: { consultas: ConsultaPainel[] }) {
  return (
    <ul className="divide-y divide-border @sm:hidden" aria-label={t.consultas.legendaTabela}>
      {consultas.map((con) => (
        <li key={con.id} className="py-3">
          <div className="flex items-center justify-between gap-3">
            <time dateTime={con.horario} className="text-[14px] font-semibold tabular-nums">
              {formatHora(con.horario)}
            </time>
            <StatusBadge status={con.status} />
          </div>
          <p className="mt-1 text-[14px]">
            {con.paciente} <span className="text-text-muted">· {con.departamento}</span>
          </p>
        </li>
      ))}
    </ul>
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
