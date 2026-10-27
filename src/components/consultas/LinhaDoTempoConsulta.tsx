import { t } from '../../i18n/pt-BR';
import type { EventoConsulta } from '../../types';
import { cn } from '../../utils/cn';
import { formatarDataHora } from '../../utils/datas';

const e = t.agenda.eventos;

const texto = (ev: EventoConsulta): string => {
  switch (ev.tipo) {
    case 'agendada':
      return e.agendada;
    case 'reagendada':
      return e.reagendada(
        ev.de ? formatarDataHora(ev.de) : '—',
        ev.para ? formatarDataHora(ev.para) : '—',
      );
    case 'cancelada':
      return e.cancelada;
    case 'concluida':
      return e.concluida;
    case 'faltou':
      return e.faltou;
  }
};

const cores: Record<EventoConsulta['tipo'], string> = {
  agendada: 'bg-primary',
  reagendada: 'bg-info',
  cancelada: 'bg-danger',
  concluida: 'bg-primary',
  faltou: 'bg-warning',
};

/** Histórico imutável da consulta (M8), do mais antigo ao mais recente. */
export function LinhaDoTempoConsulta({ eventos }: { eventos: EventoConsulta[] }) {
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {eventos.map((ev, i) => (
        <li key={`${ev.tipo}-${ev.em}-${i}`} className="relative">
          <span
            aria-hidden
            className={cn(
              'absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-card',
              cores[ev.tipo],
            )}
          />
          <p className="text-[14px] font-medium">{texto(ev)}</p>
          {ev.detalhe && <p className="text-[13.5px]">{ev.detalhe}</p>}
          <p className="text-[12.5px] text-text-muted tabular-nums">
            <time dateTime={ev.em}>{formatarDataHora(ev.em)}</time>
          </p>
        </li>
      ))}
    </ol>
  );
}
