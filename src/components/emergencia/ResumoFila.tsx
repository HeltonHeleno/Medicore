import { Link } from 'react-router-dom';
import { te } from '../../i18n/pt-BR/emergencia';
import type { IndicadoresEmergencia } from '../../services/indicadores-operacionais';
import { CORES_RISCO } from '../../types/emergencia';
import { cn } from '../../utils/cn';
import { formatarDuracao } from '../../utils/tempos';
import { BadgeRisco } from './BadgeRisco';

const f = te.fila;
const cartao =
  'flex min-w-[8.5rem] flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2 shadow-[var(--shadow-card)]';

/**
 * Resumo da fila (E8, A13): por cor, quantos aguardam atendimento e quantos passaram do
 * prazo (cada cor leva ao filtro "Mostrar só"); espera média até o chamado nas últimas
 * 24 h e atendimentos de hoje.
 */
export function ResumoFila({ ind }: { ind: IndicadoresEmergencia }) {
  const esperas = CORES_RISCO.filter((c) => ind.esperaMediaPorCor[c] !== undefined).map((c) =>
    f.esperaCor(te.cores[c], formatarDuracao(ind.esperaMediaPorCor[c]!)),
  );
  return (
    <div className="space-y-3">
      <ul aria-label={f.resumoRotulo} className="flex flex-wrap gap-2 sm:gap-3">
        {CORES_RISCO.map((cor) => {
          const { aguardando, acimaDoPrazo } = ind.porCor[cor];
          return (
            <li key={cor}>
              <Link
                to={`/emergencia?mostrar=${cor}`}
                className={cn(
                  cartao,
                  'hover:border-border-input focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                )}
              >
                <BadgeRisco risco={cor} variante="curto" className="self-start" />
                <span className="text-[14px] font-semibold tabular-nums">
                  {f.aguardandoCor(aguardando)}
                </span>
                {acimaDoPrazo > 0 && (
                  <span className="text-[12.5px] font-semibold text-danger">
                    {f.acimaDoPrazo}: {acimaDoPrazo}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        <li>
          <div className={cartao}>
            <span className="text-[12.5px] font-medium text-text-muted">{f.hoje}</span>
            <span className="text-[20px] leading-tight font-bold tabular-nums">
              {ind.atendimentosHoje}
            </span>
          </div>
        </li>
      </ul>
      <p className="text-[13px] text-text-muted">
        <span className="font-medium text-text">{f.esperaMedia}:</span>{' '}
        {esperas.length > 0 ? esperas.join(' · ') : f.semEspera}
      </p>
    </div>
  );
}
