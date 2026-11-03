import { AlertTriangle, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListaFila } from '../../components/emergencia/ListaFila';
import { GRUPOS_FILA } from '../../components/emergencia/fila';
import { ResumoFila } from '../../components/emergencia/ResumoFila';
import { AbasModulo } from '../../components/ui/AbasModulo';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import { FiltroSelect } from '../../components/ui/lista/BarraFiltros';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { TempoDecorrido } from '../../components/ui/TempoDecorrido';
import { useAcoesAtendimento } from '../../hooks/useAcoesAtendimento';
import { useAlertas, useFila, useIndicadoresEmergencia } from '../../hooks/useDadosOperacoes';
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl';
import { te } from '../../i18n/pt-BR/emergencia';
import type { AlertaOperacional, FilaEmergencia } from '../../types';
import { CORES_RISCO } from '../../types/emergencia';
import { cn } from '../../utils/cn';
import { abasEmergencia } from './abas';

const f = te.fila;
const PADROES = { aba: '', mostrar: '' };

/** Vermelhos e laranjas abertos (id → número e cor), para o anúncio de chegada de outra aba. */
function prioritarios(fila: FilaEmergencia) {
  const mapa = new Map<string, { numero: string; cor: string }>();
  for (const g of GRUPOS_FILA)
    for (const a of fila[g])
      if (a.risco === 'vermelho' || a.risco === 'laranja')
        mapa.set(a.id, { numero: a.numero, cor: te.cores[a.risco].toLowerCase() });
  return mapa;
}

/**
 * Anuncia (`aria-live="polite"`) só vermelho ou laranja **novo** enquanto a fila está
 * aberta, o que na prática vem de outra aba (18.2.6). A primeira carga não anuncia.
 */
function useAnuncioPrioritario(fila: FilaEmergencia | null) {
  const conhecidos = useRef<Set<string> | null>(null);
  const [anuncio, setAnuncio] = useState('');
  useEffect(() => {
    if (!fila) return;
    const atuais = prioritarios(fila);
    if (conhecidos.current) {
      const novos = [...atuais].filter(([id]) => !conhecidos.current!.has(id));
      if (novos.length > 0)
        setAnuncio(novos.map(([, x]) => te.avisos.novoNaFila(x.cor, x.numero)).join('. '));
    }
    conhecidos.current = new Set(atuais.keys());
  }, [fila]);
  return anuncio;
}

const destinoDoAlerta = (x: AlertaOperacional) =>
  x.referencia.tipo === 'atendimento'
    ? `/emergencia/${x.referencia.id}`
    : x.referencia.tipo === 'leito'
      ? `/leitos/${x.referencia.id}`
      : `/leitos?setor=${x.referencia.id}`;

const ESTILO_PRIORIDADE = {
  alta: 'border-danger/40 bg-danger-bg text-danger',
  media: 'border-warning/40 text-warning',
  baixa: 'border-border text-text-muted',
} as const;

/** Aba Alertas (18.7.1): lista completa do A12, com prioridade, local e link. */
function ListaAlertas({ alertas }: { alertas: AlertaOperacional[] }) {
  if (alertas.length === 0)
    return <p className="py-6 text-center text-text-muted">{te.alertasAba.vazio}</p>;
  return (
    <ul className="divide-y divide-border">
      {alertas.map((x) => (
        <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded border px-2 py-1 text-[12px] leading-none font-semibold',
              ESTILO_PRIORIDADE[x.prioridade],
            )}
          >
            <AlertTriangle size={13} aria-hidden />
            {te.alertasAba.prioridade[x.prioridade]}
          </span>
          <Link
            to={destinoDoAlerta(x)}
            className="min-w-0 flex-1 rounded font-medium break-words underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {x.titulo}
          </Link>
          <span className="text-[13px] text-text-muted">
            {[x.local, x.responsavel].filter(Boolean).join(' · ')} ·{' '}
            <TempoDecorrido desde={x.desde} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** /emergencia — fila (E8) e, com `?aba=alertas`, os alertas operacionais (A12). */
export default function Fila() {
  const { filtros, definir } = useFiltrosUrl(PADROES);
  const fila = useFila();
  const indicadores = useIndicadoresEmergencia();
  const alertas = useAlertas();
  const acoes = useAcoesAtendimento();
  const anuncio = useAnuncioPrioritario(fila.data);
  const naAbaAlertas = filtros.aba === 'alertas';

  const opcoesMostrar = [
    { valor: '', rotulo: f.todos },
    ...CORES_RISCO.map((c) => ({ valor: c, rotulo: te.cores[c] })),
    ...GRUPOS_FILA.map((g) => ({ valor: g, rotulo: f.grupos[g] })),
  ];

  return (
    <>
      <CabecalhoPagina
        titulo={te.titulo}
        descricao={te.descricao}
        acoes={
          <ButtonLink to="/emergencia/chegada" iconeEsquerda={<Plus size={18} />}>
            {te.registrarChegada}
          </ButtonLink>
        }
      />
      <AbasModulo
        rotulo={te.abasRotulo}
        abas={abasEmergencia(alertas.data?.length)}
        className="mb-5"
      />
      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      {naAbaAlertas ? (
        <Card titulo={te.alertasAba.titulo}>
          {alertas.erro ? (
            <ErrorState aoTentarNovamente={alertas.recarregar} />
          ) : alertas.data ? (
            <ListaAlertas alertas={alertas.data} />
          ) : (
            <SkeletonLinhas linhas={4} />
          )}
        </Card>
      ) : (
        <div className="space-y-5">
          {indicadores.data ? (
            <ResumoFila ind={indicadores.data} />
          ) : (
            <div aria-busy="true">
              <SkeletonLinhas linhas={1} />
            </div>
          )}
          <Card className="min-w-0">
            <div className="mb-3 flex flex-wrap items-end gap-3">
              <FiltroSelect
                rotulo={f.mostrarSo}
                valor={
                  opcoesMostrar.some((o) => o.valor === filtros.mostrar) ? filtros.mostrar : ''
                }
                aoMudar={(mostrar) => definir({ mostrar })}
                opcoes={opcoesMostrar}
              />
            </div>
            {fila.erro ? (
              <ErrorState aoTentarNovamente={fila.recarregar} />
            ) : fila.data ? (
              <ListaFila
                fila={fila.data}
                mostrar={filtros.mostrar}
                aoChamar={(a) => acoes.executar('chamar', a)}
              />
            ) : (
              <div aria-busy="true">
                <SkeletonLinhas linhas={6} />
              </div>
            )}
          </Card>
        </div>
      )}
      {acoes.dialogos}
    </>
  );
}
