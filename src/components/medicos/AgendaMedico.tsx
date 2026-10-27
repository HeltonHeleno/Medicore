import { Link } from 'react-router-dom';
import { useAgenda, useHorariosLivres } from '../../hooks/useDados';
import { t } from '../../i18n/pt-BR';
import type { Medico } from '../../types';
import { atendeNoDia } from '../../utils/agenda';
import {
  formatarDataCurta,
  hojeNoFuso,
  horaDoInstante,
  somarDias,
  dataDoInstante,
} from '../../utils/datas';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonLinhas } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';

const m = t.medicos;

/** "Agenda de hoje" (consultas e horários livres) e "Próximos 7 dias" (quantidade por dia). */
export function AgendaMedico({ medico }: { medico: Medico }) {
  const hoje = hojeNoFuso();
  const fimSemana = somarDias(hoje, 6);
  const atendeHoje = atendeNoDia(medico.disponibilidade, hoje);
  const semana = useAgenda({ medicoId: medico.id, de: hoje, ate: fimSemana });
  const horarios = useHorariosLivres({
    medicoId: medico.id,
    data: hoje,
    duracaoMin: medico.disponibilidade.duracaoPadraoMin,
  });

  const consultasHoje = (semana.data ?? []).filter((c) => dataDoInstante(c.inicio) === hoje);
  const livres = (horarios.data ?? []).filter((h) => h.livre);
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(hoje, i));
  const porDia = new Map<string, number>();
  for (const c of semana.data ?? []) {
    if (c.status === 'cancelada') continue;
    const dia = dataDoInstante(c.inicio);
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }
  const maximo = Math.max(1, ...porDia.values());

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card titulo={m.cards.hoje}>
        {semana.data === null ? (
          <SkeletonLinhas />
        ) : (
          <>
            {consultasHoje.length === 0 ? (
              <EmptyState
                mensagem={atendeHoje ? m.semConsultasHoje : m.naoAtendeHoje}
                className="py-3"
              />
            ) : (
              <ul className="divide-y divide-border">
                {consultasHoje.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-3">
                      <Link
                        to={`/consultas/${c.id}`}
                        className="rounded font-medium tabular-nums hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        {horaDoInstante(c.inicio)}
                      </Link>
                      <span className="truncate">{c.pacienteNome}</span>
                    </span>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
            {atendeHoje && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-[13.5px] font-medium">{m.livresHoje(livres.length)}</p>
                {livres.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {livres.slice(0, 16).map((h) => (
                      <li
                        key={h.hora}
                        className="rounded bg-primary-light/60 px-2 py-1 text-[12.5px] tabular-nums"
                      >
                        {h.hora}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </Card>

      <Card titulo={m.cards.semana}>
        <ul className="space-y-2">
          {dias.map((dia) => {
            const atende = atendeNoDia(medico.disponibilidade, dia);
            const n = porDia.get(dia) ?? 0;
            return (
              <li
                key={dia}
                className="grid grid-cols-[88px_1fr_auto] items-center gap-3 text-[13.5px]"
              >
                <span className="text-text-muted capitalize">{formatarDataCurta(dia)}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-bg" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(n / maximo) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums">
                  {atende || n > 0 ? (
                    m.consultasNoDia(n)
                  ) : (
                    <span className="text-text-muted">{m.naoAtende}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
