import { AlertTriangle, Stethoscope } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useRelogio } from '../../hooks/useRelogio';
import { te } from '../../i18n/pt-BR/emergencia';
import type { AtendimentoDetalhado, FilaEmergencia } from '../../types';
import { cn } from '../../utils/cn';
import { horaDoInstante } from '../../utils/datas';
import { excessoMin, formatarDuracao, minutosDesde } from '../../utils/tempos';
import { Button, ButtonLink } from '../ui/Button';
import { TempoDecorrido } from '../ui/TempoDecorrido';
import { BadgeRisco } from './BadgeRisco';
import { filtrarGrupo, GRUPOS_FILA, type GrupoFila } from './fila';

const f = te.fila;

const classeLink =
  'rounded font-semibold text-text underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

/** Quando o pedido de leito foi feito (início da espera por leito). */
const pedidoEm = (a: AtendimentoDetalhado) =>
  [...a.eventos].reverse().find((e) => e.tipo === 'leito_solicitado')?.em;

interface LinhaProps {
  a: AtendimentoDetalhado;
  grupo: GrupoFila;
  agora: Date;
  aoChamar: (a: AtendimentoDetalhado) => void;
}

/**
 * Um atendimento da fila. No desktop é uma linha; abaixo de `sm` vira um cartão, com a
 * cor, o nome da cor e os mesmos textos (18.2.7).
 */
const LinhaFila = memo(function LinhaFila({ a, grupo, agora, aoChamar }: LinhaProps) {
  const aguardando = grupo === 'aguardandoAtendimento' || grupo === 'aguardandoTriagem';
  const excesso = aguardando && a.prazo ? excessoMin(a.prazo, agora) : 0;
  const nome =
    a.idade !== undefined && a.pacienteId
      ? `${a.nomeExibicao}, ${te.anos(a.idade)}`
      : a.nomeExibicao;
  const desdePedido = grupo === 'aguardandoLeito' ? pedidoEm(a) : undefined;
  return (
    <li
      data-atendimento={a.numero}
      className={cn(
        'grid gap-x-4 gap-y-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:rounded-none sm:border-0 sm:border-b sm:bg-transparent sm:px-1 sm:py-3',
        excesso > 0 && 'border-danger/40 sm:border-l-4 sm:border-l-danger sm:pl-2',
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        {a.risco ? (
          <BadgeRisco risco={a.risco} variante="curto" />
        ) : (
          <span className="rounded border border-border px-2 py-1 text-[12.5px] leading-none font-medium text-text-muted">
            {te.semClassificacao}
          </span>
        )}
        <span className="font-mono text-[13px] text-text-muted">{a.numero}</span>
        <Link to={`/emergencia/${a.id}`} className={cn(classeLink, 'min-w-0 break-words')}>
          {nome}
        </Link>
        <span className="w-full min-w-0 text-[13.5px] break-words text-text-muted">
          {a.queixa}
          {grupo === 'emAtendimento' && a.medicoNome && (
            <span className="ml-2 inline-flex items-center gap-1 text-text">
              <Stethoscope size={14} aria-hidden />
              {f.comMedico(a.medicoNome)}
            </span>
          )}
          {grupo === 'emObservacao' && a.leitoObservacaoCodigo && (
            <span className="ml-2 text-text">{f.noLeito(a.leitoObservacaoCodigo)}</span>
          )}
        </span>
      </div>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        <div className="flex gap-1">
          <dt className="text-text-muted">{f.espera}:</dt>
          <dd>
            {desdePedido ? (
              te.avisos.aguardandoLeitoHa(formatarDuracao(minutosDesde(desdePedido, agora)))
            ) : (
              <TempoDecorrido desde={a.chegadaEm} />
            )}
          </dd>
        </div>
        {aguardando && a.prazo && (
          <div className="flex gap-1">
            <dt className="text-text-muted">{f.prazo}:</dt>
            <dd>
              <TempoDecorrido prazo={a.prazo} />
            </dd>
          </div>
        )}
        <div className="flex gap-1 text-text-muted">
          <dt className="sr-only">{f.chegada('')}</dt>
          <dd>{f.chegada(horaDoInstante(a.chegadaEm))}</dd>
        </div>
        {excesso > 0 && (
          <div className="w-full">
            <dt className="sr-only">{f.acimaDoPrazo}</dt>
            <dd className="inline-flex items-center gap-1 rounded bg-danger-bg px-2 py-0.5 text-[12.5px] font-semibold text-danger">
              <AlertTriangle size={13} aria-hidden />
              {te.avisos.acimaDoPrazo(excesso)}
            </dd>
          </div>
        )}
      </dl>

      <div
        role="group"
        aria-label={f.acoesDe(a.numero)}
        className="flex flex-wrap gap-2 sm:justify-end"
      >
        {grupo === 'aguardandoTriagem' && (
          <ButtonLink
            tamanho="sm"
            to={`/emergencia/${a.id}/triagem`}
            aria-label={f.triarLeitor(a.numero)}
          >
            {te.triar}
          </ButtonLink>
        )}
        {grupo === 'aguardandoAtendimento' && (
          <Button tamanho="sm" onClick={() => aoChamar(a)} aria-label={f.chamarLeitor(a.numero)}>
            {te.chamar}
          </Button>
        )}
        <ButtonLink
          tamanho="sm"
          variante="contorno"
          to={`/emergencia/${a.id}`}
          aria-label={f.verLeitor(a.numero)}
        >
          {te.verAtendimento}
        </ButtonLink>
      </div>
    </li>
  );
});

/**
 * Fila da emergência (E8) em grupos, na ordem dada pelo serviço: "Aguardando atendimento"
 * na ordem do A7 (cor, prazo, chegada); os outros, por chegada. O filtro não muda a ordem.
 */
export function ListaFila({
  fila,
  mostrar,
  aoChamar,
}: {
  fila: FilaEmergencia;
  mostrar: string;
  aoChamar: (a: AtendimentoDetalhado) => void;
}) {
  const { agora } = useRelogio();
  const grupos = GRUPOS_FILA.map((g) => ({ g, itens: filtrarGrupo(fila[g], g, mostrar) })).filter(
    (x): x is { g: GrupoFila; itens: AtendimentoDetalhado[] } => x.itens !== null,
  );
  const total = GRUPOS_FILA.reduce((s, g) => s + fila[g].length, 0);
  const visiveis = grupos.reduce((s, x) => s + x.itens.length, 0);
  if (total === 0) return <p className="py-6 text-center text-text-muted">{f.filaVazia}</p>;
  if (mostrar && visiveis === 0)
    return <p className="py-6 text-center text-text-muted">{f.vazioFiltro}</p>;
  return (
    <div className="space-y-6">
      {grupos
        .filter((x) => !mostrar || x.itens.length > 0)
        .map(({ g, itens }) => (
          <section key={g} aria-labelledby={`grupo-${g}`}>
            <h2 id={`grupo-${g}`} className="mb-1 text-[15px] font-semibold">
              {f.grupoTitulo(f.grupos[g], itens.length)}
            </h2>
            {itens.length === 0 ? (
              <p className="py-2 text-[13.5px] text-text-muted">{f.vazioGrupo}</p>
            ) : (
              <ul className="space-y-2 sm:space-y-0">
                {itens.map((a) => (
                  <LinhaFila key={a.id} a={a} grupo={g} agora={agora} aoChamar={aoChamar} />
                ))}
              </ul>
            )}
          </section>
        ))}
    </div>
  );
}
