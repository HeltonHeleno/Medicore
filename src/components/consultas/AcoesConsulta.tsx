import { CalendarClock, CalendarPlus, CheckCircle2, UserX, XCircle } from 'lucide-react';
import { useId } from 'react';
import { t } from '../../i18n/pt-BR';
import type { ConsultaDetalhada } from '../../types';
import { horaDoInstante } from '../../utils/datas';
import { agora } from '../../utils/relogio';
import { Button, ButtonLink } from '../ui/Button';

const a = t.agenda;

interface Props {
  consulta: ConsultaDetalhada;
  aoConcluir: () => void;
  aoFaltar: () => void;
  aoCancelar: () => void;
}

/** Botões conforme o status e o horário (R-S1–R-S3), com dica quando desabilitados. */
export function AcoesConsulta({ consulta: c, aoConcluir, aoFaltar, aoCancelar }: Props) {
  const idDica = useId();
  if (c.status !== 'agendada') {
    return (
      <div className="space-y-3">
        <p className="text-[14px] text-text-muted">{a.situacaoFinal}</p>
        <ButtonLink
          to={`/consultas/nova?pacienteId=${c.pacienteId}&medicoId=${c.medicoId}`}
          variante="contorno"
          iconeEsquerda={<CalendarPlus size={16} />}
        >
          {a.acoes.agendarNovamente}
        </ButtonLink>
      </div>
    );
  }
  const comecou = agora().getTime() >= new Date(c.inicio).getTime();
  const bloqueio = comecou ? undefined : a.disponivelAPartir(horaDoInstante(c.inicio));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          iconeEsquerda={<CheckCircle2 size={16} />}
          aria-disabled={bloqueio ? true : undefined}
          aria-describedby={bloqueio ? idDica : undefined}
          onClick={() => !bloqueio && aoConcluir()}
        >
          {a.acoes.concluir}
        </Button>
        <Button
          variante="contorno"
          iconeEsquerda={<UserX size={16} />}
          aria-disabled={bloqueio ? true : undefined}
          aria-describedby={bloqueio ? idDica : undefined}
          onClick={() => !bloqueio && aoFaltar()}
        >
          {a.acoes.faltou}
        </Button>
      </div>
      {bloqueio && (
        <p id={idDica} className="text-[13px] text-text-muted">
          {bloqueio}
        </p>
      )}
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <ButtonLink
          to={`/consultas/${c.id}/editar`}
          variante="contorno"
          iconeEsquerda={<CalendarClock size={16} />}
        >
          {a.acoes.reagendar}
        </ButtonLink>
        <Button
          variante="contorno"
          iconeEsquerda={<XCircle size={16} />}
          onClick={aoCancelar}
          className="text-danger"
        >
          {a.acoes.cancelar}
        </Button>
      </div>
    </div>
  );
}
