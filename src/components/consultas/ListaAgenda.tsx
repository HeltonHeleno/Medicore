import { AlertTriangle, CalendarClock, CheckCircle2, Eye, UserX, XCircle } from 'lucide-react';
import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useOrigem } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import type { ConsultaDetalhada } from '../../types';
import { cn } from '../../utils/cn';
import { dataDoInstante, formatarDataExtenso, horaDoInstante } from '../../utils/datas';
import { agora } from '../../utils/relogio';
import { MenuAcoes } from '../ui/lista/MenuAcoes';
import { StatusBadge } from '../ui/StatusBadge';

const a = t.agenda;

export interface AcoesItemAgenda {
  concluir: (c: ConsultaDetalhada) => void;
  faltou: (c: ConsultaDetalhada) => void;
  cancelar: (c: ConsultaDetalhada) => void;
}

interface ListaAgendaProps {
  consultas: ConsultaDetalhada[];
  visao: 'horario' | 'medico';
  /** Mostra a data em cada grupo (período com vários dias). */
  variosDias: boolean;
  acoes: AcoesItemAgenda;
  selecao?: { selecionados: ReadonlySet<string>; aoMudar: (s: Set<string>) => void };
}

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function BotaoRapido({
  rotulo,
  icone: Icone,
  aoClicar,
  bloqueadoAte,
  perigo,
}: {
  rotulo: string;
  icone: typeof CheckCircle2;
  aoClicar: () => void;
  bloqueadoAte?: string;
  perigo?: boolean;
}) {
  const idDica = useId();
  return (
    <>
      <button
        type="button"
        aria-disabled={bloqueadoAte ? true : undefined}
        aria-describedby={bloqueadoAte ? idDica : undefined}
        title={bloqueadoAte ? a.disponivelAPartir(bloqueadoAte) : undefined}
        onClick={() => !bloqueadoAte && aoClicar()}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-border-input px-2.5 py-1.5 text-[13px] font-medium',
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
          bloqueadoAte
            ? 'cursor-not-allowed opacity-50'
            : perigo
              ? 'text-danger hover:bg-danger-bg'
              : 'hover:bg-bg',
        )}
      >
        <Icone size={15} aria-hidden />
        {rotulo}
      </button>
      {bloqueadoAte && (
        <span id={idDica} className="sr-only">
          {a.disponivelAPartir(bloqueadoAte)}
        </span>
      )}
    </>
  );
}

function ItemAgenda({
  c,
  acoes,
  selecao,
  mostrarData,
}: {
  c: ConsultaDetalhada;
  acoes: AcoesItemAgenda;
  selecao?: ListaAgendaProps['selecao'];
  mostrarData: boolean;
}) {
  const origem = useOrigem();
  const comecou = agora().getTime() >= new Date(c.inicio).getTime();
  const horario = `${horaDoInstante(c.inicio)}–${horaDoInstante(c.fim)}`;
  const agendada = c.status === 'agendada';

  return (
    <li
      className={cn(
        'rounded-lg border p-3 sm:p-4',
        c.atrasada ? 'border-danger/30 bg-danger-bg/50' : 'border-border bg-card',
      )}
    >
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        {selecao && agendada && (
          <input
            type="checkbox"
            aria-label={a.selecionarConsulta(`${c.pacienteNome}, ${horario}`)}
            checked={selecao.selecionados.has(c.id)}
            onChange={(e) => {
              const prox = new Set(selecao.selecionados);
              if (e.target.checked) prox.add(c.id);
              else prox.delete(c.id);
              selecao.aoMudar(prox);
            }}
            className="mt-1 size-[18px] cursor-pointer accent-primary"
          />
        )}
        <div className="w-28 shrink-0">
          <p className="font-semibold tabular-nums">{horario}</p>
          {mostrarData && (
            <p className="text-[12.5px] text-text-muted tabular-nums">
              {dataDoInstante(c.inicio).split('-').reverse().join('/')}
            </p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <Link
              to={`/consultas/${c.id}`}
              state={origem}
              className="rounded font-semibold text-text hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {c.pacienteNome}
            </Link>
            {c.pacienteAlergias && (
              <span title={a.possuiAlergias} className="inline-flex text-danger">
                <AlertTriangle size={15} aria-hidden />
                <span className="sr-only">{a.possuiAlergias}</span>
              </span>
            )}
          </p>
          <p className="text-[13px] text-text-muted">
            {c.medicoNome} · {c.departamentoNome} · {a.tipos[c.tipo]}
          </p>
          {c.atrasada && (
            <p className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-danger">
              <CalendarClock size={14} aria-hidden />
              {a.aguardandoRegistro}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={c.status} />
          <MenuAcoes
            nome={`${c.pacienteNome}, ${horario}`}
            acoes={[
              { rotulo: a.acoes.ver, icone: Eye, href: `/consultas/${c.id}` },
              ...(agendada
                ? [
                    {
                      rotulo: a.acoes.reagendar,
                      icone: CalendarClock,
                      href: `/consultas/${c.id}/editar`,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>
      {agendada && (
        <div className="mt-3 flex flex-wrap gap-2 sm:pl-32">
          <BotaoRapido
            rotulo={a.acoes.concluir}
            icone={CheckCircle2}
            aoClicar={() => acoes.concluir(c)}
            bloqueadoAte={comecou ? undefined : horaDoInstante(c.inicio)}
          />
          <BotaoRapido
            rotulo={a.acoes.faltou}
            icone={UserX}
            aoClicar={() => acoes.faltou(c)}
            bloqueadoAte={comecou ? undefined : horaDoInstante(c.inicio)}
          />
          <BotaoRapido
            rotulo={a.acoes.cancelar}
            icone={XCircle}
            aoClicar={() => acoes.cancelar(c)}
            perigo
          />
        </div>
      )}
    </li>
  );
}

/** Consultas agrupadas por dia (por horário) ou por médico. */
export function ListaAgenda({ consultas, visao, variosDias, acoes, selecao }: ListaAgendaProps) {
  const grupos = new Map<string, ConsultaDetalhada[]>();
  for (const c of consultas) {
    const chave = visao === 'medico' ? c.medicoNome : variosDias ? dataDoInstante(c.inicio) : '';
    grupos.set(chave, [...(grupos.get(chave) ?? []), c]);
  }
  const chaves = [...grupos.keys()].sort((x, y) => x.localeCompare(y, 'pt-BR'));

  return (
    <div className="space-y-5">
      {chaves.map((chave) => (
        <section key={chave || 'unico'} aria-label={chave ? undefined : a.legendaLista}>
          {chave && (
            <h2 className="mb-2 text-[14px] font-semibold text-text-muted">
              {visao === 'medico' ? chave : capitalizar(formatarDataExtenso(chave))}
            </h2>
          )}
          <ul className="space-y-2">
            {grupos.get(chave)!.map((c) => (
              <ItemAgenda
                key={c.id}
                c={c}
                acoes={acoes}
                selecao={selecao}
                mostrarData={variosDias && visao === 'medico'}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
