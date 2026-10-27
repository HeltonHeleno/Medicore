import { t } from '../../i18n/pt-BR';
import type { ConsultaDetalhada } from '../../types';
import { cn } from '../../utils/cn';

const r = t.agenda.resumo;

/** Contagens do período exibido (antes do filtro de situação). */
export function ResumoDia({ consultas }: { consultas: readonly ConsultaDetalhada[] }) {
  const conta = (s: ConsultaDetalhada['status']) => consultas.filter((c) => c.status === s).length;
  const pendentes = consultas.filter((c) => c.atrasada).length;
  const itens = [
    { rotulo: r.total, valor: consultas.length },
    { rotulo: r.agendadas, valor: conta('agendada') },
    { rotulo: r.concluidas, valor: conta('concluida') },
    { rotulo: r.canceladas, valor: conta('cancelada') },
    { rotulo: r.faltas, valor: conta('faltou') },
    { rotulo: r.pendentes, valor: pendentes, destaque: pendentes > 0 },
  ];
  return (
    <section aria-label={r.titulo}>
      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {itens.map((i) => (
          <div
            key={i.rotulo}
            className={cn(
              'rounded-lg border px-3 py-2',
              i.destaque ? 'border-danger/30 bg-danger-bg' : 'border-border bg-card',
            )}
          >
            <dt className={cn('text-[12px]', i.destaque ? 'text-danger' : 'text-text-muted')}>
              {i.rotulo}
            </dt>
            <dd className="text-[20px] font-bold tabular-nums">{i.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
