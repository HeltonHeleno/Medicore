import { Link } from 'react-router-dom';
import { useDispensacoesDoDestino } from '../../hooks/useDadosOperacoes';
import { tf } from '../../i18n/pt-BR/farmacia';
import { cn } from '../../utils/cn';
import { formatarDataHora } from '../../utils/datas';
import { Card } from '../ui/Card';
import { SkeletonLinhas } from '../ui/Skeleton';

const classeLink =
  'rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

/** Dispensações de uma internação ou de um atendimento (19.10.2), com link para cada uma. */
export function SecaoDispensacoes({ destinoId }: { destinoId: string }) {
  const lista = useDispensacoesDoDestino(destinoId);
  return (
    <Card titulo={tf.ligacoes.dispensacoes}>
      {!lista.data ? (
        <SkeletonLinhas linhas={2} />
      ) : lista.data.length === 0 ? (
        <p className="text-[14px] text-text-muted">{tf.ligacoes.semDispensacoes}</p>
      ) : (
        <ul className="divide-y divide-border">
          {lista.data.map((d) => (
            <li key={d.id} className="space-y-0.5 py-2.5 text-[14px] first:pt-0 last:pb-0">
              <p className="flex flex-wrap items-center gap-2">
                {d.arquivado ? (
                  <span className="text-text-muted">{tf.registroArquivado}</span>
                ) : (
                  <Link to={`/farmacia/dispensacoes/${d.id}`} className={classeLink}>
                    {formatarDataHora(d.em)}
                  </Link>
                )}
                <span className="text-[12.5px] text-text-muted">
                  {tf.ligacoes.itensResumo(d.itens.length)}
                </span>
                {d.status === 'estornada' && (
                  <span className="rounded border border-danger/40 bg-danger-bg px-1.5 py-0.5 text-[11.5px] font-semibold text-danger">
                    {tf.dispensacaoTela.estornada}
                  </span>
                )}
              </p>
              <p
                className={cn(
                  'text-[13px] text-text-muted',
                  d.status === 'estornada' && 'line-through',
                )}
              >
                {d.itens.join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
