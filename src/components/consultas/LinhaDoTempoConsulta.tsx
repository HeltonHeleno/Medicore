import { t } from '../../i18n/pt-BR';
import type { EventoConsulta } from '../../types';
import { formatarDataHora } from '../../utils/datas';
import { LinhaDoTempo } from '../ui/LinhaDoTempo';

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
    <LinhaDoTempo
      itens={eventos.map((ev) => ({
        em: ev.em,
        titulo: texto(ev),
        detalhe: ev.detalhe,
        cor: cores[ev.tipo],
      }))}
    />
  );
}
