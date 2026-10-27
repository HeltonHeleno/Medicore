import { t } from '../../i18n/pt-BR';
import type { Disponibilidade } from '../../types';
import { cn } from '../../utils/cn';

const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0] as const;

/** Grade semanal (dias × faixas), com a pausa separando os turnos. */
export function GradeDisponibilidade({ disponibilidade: d }: { disponibilidade: Disponibilidade }) {
  const faixas = d.pausa
    ? [`${d.inicio}–${d.pausa.inicio}`, `${d.pausa.fim}–${d.fim}`]
    : [`${d.inicio}–${d.fim}`];
  const texto = (dia: number) =>
    d.diasSemana.includes(dia as Disponibilidade['diasSemana'][number])
      ? faixas.join(' · ')
      : t.medicos.naoAtende;
  return (
    <>
      {/* Celular: lista vertical (7 colunas não cabem sem rolagem) */}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13.5px] sm:hidden">
        {ORDEM_DIAS.map((dia) => (
          <div key={dia} className="contents">
            <dt className="font-medium">{t.diasSemanaCurto[dia]}</dt>
            <dd className={cn('tabular-nums', !d.diasSemana.includes(dia) && 'text-text-muted')}>
              {texto(dia)}
            </dd>
          </div>
        ))}
      </dl>
      <table className="hidden w-full table-fixed border-collapse text-center text-[13px] sm:table">
        <caption className="sr-only">{t.medicos.gradeLegenda}</caption>
        <thead>
          <tr>
            {ORDEM_DIAS.map((dia) => (
              <th key={dia} scope="col" className="pb-2 font-medium text-text-muted">
                {t.diasSemanaCurto[dia]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {ORDEM_DIAS.map((dia) => {
              const atende = d.diasSemana.includes(dia);
              return (
                <td key={dia} className="px-1 align-top">
                  <div
                    className={cn(
                      'flex min-h-16 flex-col justify-center gap-1 rounded-md px-1 py-2',
                      atende ? 'bg-primary-light/60 text-text' : 'bg-bg text-text-muted',
                    )}
                  >
                    {atende
                      ? faixas.map((f) => (
                          <span key={f} className="tabular-nums">
                            {f}
                          </span>
                        ))
                      : t.medicos.naoAtende}
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </>
  );
}
