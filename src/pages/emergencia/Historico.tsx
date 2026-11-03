import { useId } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BadgeRisco } from '../../components/emergencia/BadgeRisco';
import { AbasModulo } from '../../components/ui/AbasModulo';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/form/Input';
import { FiltroSelect } from '../../components/ui/lista/BarraFiltros';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { DataTable, type Coluna } from '../../components/ui/lista/DataTable';
import { Paginacao } from '../../components/ui/lista/Paginacao';
import { POR_PAGINA, RETENCAO_DIAS } from '../../config/limites';
import { useHistoricoEmergencia } from '../../hooks/useDadosOperacoes';
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl';
import { useRelogio } from '../../hooks/useRelogio';
import { t } from '../../i18n/pt-BR';
import { te } from '../../i18n/pt-BR/emergencia';
import type { AtendimentoDetalhado, CorRisco, TipoDesfecho } from '../../types';
import { CORES_RISCO } from '../../types/emergencia';
import { formatarDataHora, somarDias } from '../../utils/datas';
import { formatarDuracao } from '../../utils/tempos';
import { abasEmergencia } from './abas';

const h = te.historicoTela;
const col = h.colunas;
const PADROES = { data: '', risco: '', desfecho: '', pagina: 1 };
const DESFECHOS: TipoDesfecho[] = ['alta', 'internacao', 'transferencia', 'obito', 'evasao'];
const classeLink =
  'rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** /emergencia/historico — encerrados dos últimos 7 dias, com filtros na URL (D15). */
export default function Historico() {
  const local = useLocation();
  const { hoje } = useRelogio();
  const idData = useId();
  const { filtros, definir, limpar, haFiltros } = useFiltrosUrl(PADROES);
  const risco = CORES_RISCO.includes(filtros.risco as CorRisco)
    ? (filtros.risco as CorRisco)
    : undefined;
  const desfecho = DESFECHOS.includes(filtros.desfecho as TipoDesfecho)
    ? (filtros.desfecho as TipoDesfecho)
    : undefined;
  const lista = useHistoricoEmergencia({
    data: filtros.data || undefined,
    risco,
    desfecho,
    pagina: filtros.pagina,
    porPagina: POR_PAGINA,
  });
  const de = { de: `${local.pathname}${local.search}` };

  const colunas: Coluna<AtendimentoDetalhado>[] = [
    {
      id: 'numero',
      titulo: col.numero,
      celula: (a) =>
        a.arquivado ? (
          <span className="font-mono text-text-muted">{a.numero}</span>
        ) : (
          <Link to={`/emergencia/${a.id}`} state={de} className={`${classeLink} font-mono`}>
            {a.numero}
          </Link>
        ),
    },
    {
      id: 'paciente',
      titulo: col.paciente,
      celula: (a) =>
        a.arquivado ? (
          <span className="text-text-muted">{te.registroArquivado}</span>
        ) : (
          a.nomeExibicao
        ),
    },
    {
      id: 'risco',
      titulo: col.risco,
      celula: (a) =>
        a.risco ? <BadgeRisco risco={a.risco} variante="curto" /> : te.semClassificacao,
    },
    { id: 'chegada', titulo: col.chegada, celula: (a) => formatarDataHora(a.chegadaEm) },
    {
      id: 'desfecho',
      titulo: col.desfecho,
      celula: (a) =>
        a.desfecho
          ? `${maiuscula(te.desfechos[a.desfecho.tipo])} · ${formatarDataHora(a.desfecho.em)}`
          : '—',
    },
    {
      id: 'espera',
      titulo: col.espera,
      celula: (a) =>
        a.eventos.some((e) => e.tipo === 'chamado') ? formatarDuracao(a.esperaMin) : '—',
    },
  ];

  return (
    <>
      <CabecalhoPagina titulo={te.abas.historico} descricao={h.descricao} />
      <AbasModulo rotulo={te.abasRotulo} abas={abasEmergencia()} className="mb-5" />
      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex min-w-[160px] flex-col gap-1">
            <label htmlFor={idData} className="text-[12.5px] text-text-muted">
              {h.data}
            </label>
            <Input
              id={idData}
              type="date"
              value={filtros.data}
              min={somarDias(hoje, -RETENCAO_DIAS.atendimentos)}
              max={hoje}
              onChange={(e) => definir({ data: e.target.value })}
            />
          </div>
          <FiltroSelect
            rotulo={h.risco}
            valor={risco ?? ''}
            aoMudar={(x) => definir({ risco: x })}
            opcoes={[
              { valor: '', rotulo: h.todas },
              ...CORES_RISCO.map((c) => ({ valor: c, rotulo: te.cores[c] })),
            ]}
          />
          <FiltroSelect
            rotulo={h.desfecho}
            valor={desfecho ?? ''}
            aoMudar={(x) => definir({ desfecho: x })}
            opcoes={[
              { valor: '', rotulo: h.todos },
              ...DESFECHOS.map((x) => ({ valor: x, rotulo: maiuscula(te.desfechos[x]) })),
            ]}
          />
          {haFiltros && (
            <Button variante="suave" onClick={limpar}>
              {t.lista.limparFiltros}
            </Button>
          )}
        </div>
        <DataTable
          legenda={h.legenda}
          colunas={colunas}
          linhas={lista.data?.itens ?? null}
          chave={(a) => a.id}
          nomeDaLinha={(a) => a.numero}
          carregando={lista.carregando}
          erro={lista.erro}
          aoTentarNovamente={lista.recarregar}
          mensagemVazia={h.vazio}
          acaoVazia={haFiltros ? { rotulo: t.lista.limparFiltros, aoClicar: limpar } : undefined}
        />
        {lista.data && lista.data.total > 0 && (
          <Paginacao
            pagina={lista.data.pagina}
            porPagina={lista.data.porPagina}
            total={lista.data.total}
            aoMudar={(pagina) => definir({ pagina })}
          />
        )}
      </Card>
    </>
  );
}
