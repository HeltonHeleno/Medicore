import { AlertCircle, CalendarSearch, Loader2 } from 'lucide-react';
import { useRef, type KeyboardEvent, type Ref } from 'react';
import { t } from '../../i18n/pt-BR';
import type { HorarioAgenda } from '../../types';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { idDoCampo } from '../ui/form/estilos';

const a = t.agenda;

interface SeletorHorarioProps {
  horarios: HorarioAgenda[] | null;
  carregando: boolean;
  valor: string;
  aoMudar: (hora: string) => void;
  /** Horário original no reagendamento (aparece marcado como "Horário atual"). */
  horarioAtual?: string;
  erro?: string;
  aviso?: string;
  /** Sem médico/data escolhidos ainda. */
  semParametros: boolean;
  aoBuscarProximoDia?: () => void;
  buscandoProximoDia?: boolean;
  mensagemProximoDia?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Grade de horários como grupo de rádio (ARIA): ↑ ↓ ← → Home End movem o foco,
 * Espaço ou Enter escolhem. Indisponíveis continuam focáveis (para o leitor de tela
 * anunciar o motivo), mas não podem ser escolhidos.
 */
export function SeletorHorario({
  horarios,
  carregando,
  valor,
  aoMudar,
  horarioAtual,
  erro,
  aviso,
  semParametros,
  aoBuscarProximoDia,
  buscandoProximoDia,
  mensagemProximoDia,
  ref,
}: SeletorHorarioProps) {
  const grupoRef = useRef<HTMLDivElement | null>(null);
  const id = idDoCampo('hora');
  const lista = horarios ?? [];
  const livres = lista.filter((h) => h.livre).length;
  const indiceFocavel = Math.max(
    0,
    lista.findIndex((h) => h.hora === valor) >= 0
      ? lista.findIndex((h) => h.hora === valor)
      : lista.findIndex((h) => h.livre),
  );

  const opcoes = () =>
    Array.from(grupoRef.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []);

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    const itens = opcoes();
    const atual = itens.indexOf(document.activeElement as HTMLElement);
    if (atual < 0) return;
    const mover: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    let proximo: number | null = null;
    if (e.key in mover) proximo = Math.min(itens.length - 1, Math.max(0, atual + mover[e.key]));
    else if (e.key === 'Home') proximo = 0;
    else if (e.key === 'End') proximo = itens.length - 1;
    if (proximo !== null) {
      e.preventDefault();
      itens[proximo].focus();
    }
  }

  const ligarRef = (el: HTMLDivElement | null) => {
    grupoRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  if (semParametros) {
    return (
      <p className="rounded-lg bg-bg px-4 py-3 text-[14px] text-text-muted">
        {a.escolhaMedicoData}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-rotulo`} className="text-[13.5px] font-medium">
          {a.campos.hora}
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
          <span className="sr-only">{` (${t.formulario.obrigatorio})`}</span>
        </p>
        <p className="text-[12.5px] text-text-muted" aria-live="polite">
          {carregando ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 size={13} aria-hidden className="animate-spin" />
              {t.formulario.buscando}
            </span>
          ) : (
            a.horariosDisponiveis(livres)
          )}
        </p>
      </div>

      {aviso && (
        <p
          role="status"
          className="rounded-md border border-warning/40 px-3 py-2 text-[13.5px] text-warning"
        >
          {aviso}
        </p>
      )}

      {lista.length > 0 && (
        <div
          ref={ligarRef}
          id={id}
          role="radiogroup"
          aria-labelledby={`${id}-rotulo`}
          aria-describedby={erro ? `${id}-erro` : undefined}
          aria-invalid={erro ? true : undefined}
          aria-required
          onKeyDown={aoTeclar}
          tabIndex={-1}
          className="grid grid-cols-3 gap-2 outline-none sm:grid-cols-5 lg:grid-cols-6"
        >
          {lista.map((h, i) => {
            const escolhido = h.hora === valor;
            const atual = h.hora === horarioAtual;
            const motivo = h.motivo ? a.motivosIndisponivel[h.motivo] : undefined;
            return (
              <div
                key={h.hora}
                role="radio"
                aria-checked={escolhido}
                aria-disabled={!h.livre || undefined}
                aria-label={[h.hora, motivo, atual && a.horarioAtual].filter(Boolean).join(', ')}
                tabIndex={i === indiceFocavel ? 0 : -1}
                onClick={() => h.livre && aoMudar(h.hora)}
                onKeyDown={(e) => {
                  if ((e.key === ' ' || e.key === 'Enter') && h.livre) {
                    e.preventDefault();
                    aoMudar(h.hora);
                  }
                }}
                className={cn(
                  'flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-lg border px-1 py-1.5 text-center select-none',
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none',
                  escolhido
                    ? 'border-primary bg-primary text-on-primary'
                    : h.livre
                      ? 'border-border-input bg-card hover:bg-primary-light/50'
                      : 'cursor-not-allowed border-dashed border-border bg-bg text-text-muted',
                )}
              >
                <span
                  className={cn(
                    'text-[14px] font-semibold tabular-nums',
                    !h.livre && 'line-through',
                  )}
                >
                  {h.hora}
                </span>
                {(motivo || atual) && (
                  <span aria-hidden className="text-[11px] leading-tight">
                    {atual ? a.horarioAtual : motivo}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!carregando && horarios !== null && livres === 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-bg px-4 py-3 text-[14px]">
          <span>{a.semHorarios}</span>
          {aoBuscarProximoDia && (
            <Button
              tamanho="sm"
              variante="contorno"
              iconeEsquerda={<CalendarSearch size={15} />}
              disabled={buscandoProximoDia}
              onClick={aoBuscarProximoDia}
            >
              {a.proximoDiaLivre}
            </Button>
          )}
          {mensagemProximoDia && <span className="text-text-muted">{mensagemProximoDia}</span>}
        </div>
      )}

      {erro && (
        <p
          id={`${id}-erro`}
          className="flex items-start gap-1 text-[12.5px] font-medium text-danger"
        >
          <AlertCircle size={14} aria-hidden className="mt-px shrink-0" />
          {erro}
        </p>
      )}
    </div>
  );
}
