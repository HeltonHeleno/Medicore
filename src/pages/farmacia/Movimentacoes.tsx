import { X } from 'lucide-react';
import { useId } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AbasModulo } from '../../components/ui/AbasModulo';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/form/Input';
import { FiltroSelect } from '../../components/ui/lista/BarraFiltros';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { DataTable, type Coluna } from '../../components/ui/lista/DataTable';
import { Paginacao } from '../../components/ui/lista/Paginacao';
import { POR_PAGINA } from '../../config/limites';
import { useColecao } from '../../hooks/useColecao';
import { useEstoque, useMovimentacoes } from '../../hooks/useDadosOperacoes';
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import { tf } from '../../i18n/pt-BR/farmacia';
import { nomeMedicamento, type MovimentacaoDetalhada } from '../../services/farmacia';
import { nomeExibicaoPaciente, obterPaciente } from '../../services/pacientes';
import type { TipoMovimentacao } from '../../types';
import { formatarDataHora } from '../../utils/datas';
import { cn } from '../../utils/cn';
import { abasFarmacia } from './abas';

const mt = tf.movimentacoesTela;
const col = mt.colunas;
const PADROES = { tipo: '', de: '', ate: '', medicamento: '', pacienteId: '', pagina: 1 };
const TIPOS = Object.keys(tf.movimentacoes) as TipoMovimentacao[];
const POSITIVOS: readonly TipoMovimentacao[] = ['entrada', 'devolucao', 'ajuste_positivo'];
const classeLink =
  'rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

/** Campo de data compacto da barra de filtros. */
function FiltroData({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-[150px] flex-col gap-1">
      <label htmlFor={id} className="text-[12.5px] text-text-muted">
        {rotulo}
      </label>
      <Input id={id} type="date" value={valor} onChange={(e) => aoMudar(e.target.value)} />
    </div>
  );
}

/** /farmacia/movimentacoes — histórico imutável (R-F9) com filtros e paginação na URL. */
export default function Movimentacoes() {
  const local = useLocation();
  const { filtros, definir, limpar, haFiltros } = useFiltrosUrl(PADROES);
  const tipo = TIPOS.find((x) => x === filtros.tipo);
  const lista = useMovimentacoes({
    tipo,
    de: filtros.de || undefined,
    ate: filtros.ate || undefined,
    medicamentoId: filtros.medicamento || undefined,
    pacienteId: filtros.pacienteId || undefined,
    pagina: filtros.pagina,
    porPagina: POR_PAGINA,
  });
  const medicamentos = useEstoque({ status: 'todos', porPagina: 500 });
  const paciente = useColecao(
    () =>
      filtros.pacienteId
        ? obterPaciente(filtros.pacienteId)
            .then(nomeExibicaoPaciente)
            .catch(() => filtros.pacienteId)
        : Promise.resolve(''),
    [filtros.pacienteId],
  );
  const de = { de: `${local.pathname}${local.search}` };

  const colunas: Coluna<MovimentacaoDetalhada>[] = [
    {
      id: 'em',
      titulo: col.em,
      celula: (x) => <span className="whitespace-nowrap">{formatarDataHora(x.em)}</span>,
    },
    { id: 'tipo', titulo: col.tipo, celula: (x) => tf.movimentacoes[x.tipo] },
    {
      id: 'medicamento',
      titulo: col.medicamento,
      celula: (x) => (
        <Link to={`/farmacia/medicamentos/${x.medicamentoId}`} state={de} className={classeLink}>
          {x.medicamentoNome}
        </Link>
      ),
    },
    {
      id: 'lote',
      titulo: col.lote,
      celula: (x) => <span className="font-mono">{x.loteNumero}</span>,
    },
    {
      id: 'quantidade',
      titulo: col.quantidade,
      celula: (x) => {
        const positivo = POSITIVOS.includes(x.tipo);
        return (
          <span
            className={cn(
              'font-semibold tabular-nums',
              positivo ? 'text-on-primary-light' : 'text-danger',
            )}
          >
            {positivo ? '+' : '−'}
            {x.quantidade}
          </span>
        );
      },
    },
    {
      id: 'saldo',
      titulo: col.saldo,
      celula: (x) => <span className="tabular-nums">{x.saldoLoteApos}</span>,
    },
    {
      id: 'dispensacao',
      titulo: col.dispensacao,
      celula: (x) =>
        x.dispensacaoId ? (
          <Link to={`/farmacia/dispensacoes/${x.dispensacaoId}`} state={de} className={classeLink}>
            {x.pacienteNome ?? mt.verDispensacao}
          </Link>
        ) : (
          '—'
        ),
    },
    { id: 'motivo', titulo: col.motivo, celula: (x) => x.motivo ?? '—' },
    { id: 'autor', titulo: col.autor, celula: (x) => x.autor },
  ];

  return (
    <>
      <CabecalhoPagina titulo={tf.abas.movimentacoes} descricao={mt.descricao} />
      <AbasModulo rotulo={tf.abasRotulo} abas={abasFarmacia} className="mb-5" />
      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <FiltroSelect
            rotulo={mt.tipo}
            valor={tipo ?? ''}
            aoMudar={(x) => definir({ tipo: x })}
            opcoes={[
              { valor: '', rotulo: tf.todos },
              ...TIPOS.map((x) => ({ valor: x, rotulo: tf.movimentacoes[x] })),
            ]}
          />
          <FiltroSelect
            rotulo={mt.medicamento}
            valor={filtros.medicamento}
            aoMudar={(x) => definir({ medicamento: x })}
            opcoes={[
              { valor: '', rotulo: tf.todos },
              ...(medicamentos.data?.itens ?? []).map((x) => ({
                valor: x.medicamento.id,
                rotulo: nomeMedicamento(x.medicamento),
              })),
            ]}
          />
          <FiltroData rotulo={mt.de} valor={filtros.de} aoMudar={(x) => definir({ de: x })} />
          <FiltroData rotulo={mt.ate} valor={filtros.ate} aoMudar={(x) => definir({ ate: x })} />
          {filtros.pacienteId && (
            <span className="flex items-center gap-1 rounded-full border border-border bg-bg py-1 pr-1 pl-3 text-[13px]">
              {mt.paciente(paciente.data ?? '…')}
              <button
                type="button"
                aria-label={mt.removerPaciente}
                onClick={() => definir({ pacienteId: '' })}
                className="rounded-full p-1 hover:bg-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <X size={14} aria-hidden />
              </button>
            </span>
          )}
          {haFiltros && (
            <Button variante="suave" onClick={limpar}>
              {t.lista.limparFiltros}
            </Button>
          )}
        </div>
        <DataTable
          legenda={mt.legenda}
          colunas={colunas}
          linhas={lista.data?.itens ?? null}
          chave={(x) => x.id}
          nomeDaLinha={(x) => `${tf.movimentacoes[x.tipo]} ${x.medicamentoNome}`}
          carregando={lista.carregando}
          erro={lista.erro}
          aoTentarNovamente={lista.recarregar}
          mensagemVazia={mt.vazio}
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
