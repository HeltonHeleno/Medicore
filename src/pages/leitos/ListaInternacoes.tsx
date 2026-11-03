import { Plus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { AbasModulo } from '../../components/ui/AbasModulo';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BarraFiltros, FiltroSelect } from '../../components/ui/lista/BarraFiltros';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { DataTable, type Coluna } from '../../components/ui/lista/DataTable';
import { Paginacao } from '../../components/ui/lista/Paginacao';
import { POR_PAGINA } from '../../config/limites';
import { SETORES_INTERNACAO, nomeSetor } from '../../config/setores';
import { useListaMedicos } from '../../hooks/useDados';
import { useInternacoes } from '../../hooks/useDadosOperacoes';
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import { tl } from '../../i18n/pt-BR/leitos';
import type { InternacaoDetalhada } from '../../types';
import { formatarData, formatarDataHora } from '../../utils/datas';
import { abasLeitos } from './abas';

const l = tl.lista;
const col = l.colunas;
const PADROES = { busca: '', situacao: 'ativa', setor: '', medico: '', alta: '', pagina: 1 };
const classeLink =
  'rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

function Selo({ texto, perigo }: { texto: string; perigo?: boolean }) {
  return (
    <span
      className={
        perigo
          ? 'ml-1.5 rounded border border-danger/40 bg-danger-bg px-1.5 py-0.5 text-[11.5px] font-semibold text-danger'
          : 'ml-1.5 rounded border border-border bg-bg px-1.5 py-0.5 text-[11.5px] font-semibold'
      }
    >
      {texto}
    </span>
  );
}

/** /leitos/internacoes — ativas e encerradas (30 dias), com busca, filtros e paginação na URL. */
export default function ListaInternacoes() {
  const local = useLocation();
  const { filtros, definir, limpar, haFiltros } = useFiltrosUrl(PADROES);
  const status = filtros.situacao === 'encerrada' ? 'encerrada' : 'ativa';
  const ativas = status === 'ativa';
  const lista = useInternacoes({
    status,
    busca: filtros.busca,
    setorId: filtros.setor || undefined,
    medicoId: filtros.medico || undefined,
    altaPrevista:
      ativas && (filtros.alta === 'hoje' || filtros.alta === 'vencida') ? filtros.alta : undefined,
    pagina: filtros.pagina,
    porPagina: POR_PAGINA,
  });
  const medicos = useListaMedicos({ status: 'ativos', porPagina: 200 });
  const de = { de: `${local.pathname}${local.search}` };

  const colunas: Coluna<InternacaoDetalhada>[] = [
    {
      id: 'paciente',
      titulo: col.paciente,
      celula: (i) =>
        i.arquivado ? (
          <span className="text-text-muted">{tl.avisos.registroArquivado}</span>
        ) : (
          <Link to={`/leitos/internacoes/${i.id}`} state={de} className={classeLink}>
            {i.pacienteNome}
          </Link>
        ),
    },
    {
      id: 'leito',
      titulo: col.leito,
      celula: (i) => <span className="tabular-nums">{i.leitoCodigo}</span>,
    },
    { id: 'setor', titulo: col.setor, celula: (i) => i.setorNome },
    { id: 'medico', titulo: col.medico, celula: (i) => i.medicoNome },
    {
      id: 'dia',
      titulo: col.dia,
      celula: (i) =>
        ativas
          ? tl.avisos.diaInternacao(i.permanenciaDias)
          : tl.avisos.permanencia(i.permanenciaDias),
    },
    ativas
      ? {
          id: 'previsao',
          titulo: col.previsao,
          celula: (i) =>
            i.previsaoAlta ? (
              <span className="whitespace-nowrap">
                {formatarData(i.previsaoAlta)}
                {i.previsaoAltaVencida && <Selo texto={l.vencida} perigo />}
                {i.previsaoAltaHoje && <Selo texto={l.hoje} />}
              </span>
            ) : (
              '—'
            ),
        }
      : {
          id: 'alta',
          titulo: col.alta,
          celula: (i) =>
            i.alta ? `${formatarDataHora(i.alta.em)} (${tl.tiposAlta[i.alta.tipo]})` : '—',
        },
    { id: 'precaucao', titulo: col.precaucao, celula: (i) => tl.precaucoes[i.precaucao] },
  ];

  return (
    <>
      <CabecalhoPagina
        titulo={tl.abas.internacoes}
        descricao={l.descricao}
        acoes={
          <ButtonLink to="/leitos/internar" iconeEsquerda={<Plus size={18} />}>
            {tl.internarPaciente}
          </ButtonLink>
        }
      />
      <AbasModulo rotulo={tl.abasRotulo} abas={abasLeitos} className="mb-5" />
      <Card>
        <BarraFiltros
          busca={filtros.busca}
          aoBuscar={(busca) => definir({ busca })}
          rotuloBusca={l.buscar}
          filtrosAtivos={haFiltros}
          aoLimpar={limpar}
          className="mb-4"
        >
          <FiltroSelect
            rotulo={tl.situacao}
            valor={status}
            aoMudar={(situacao) => definir({ situacao, alta: '' })}
            opcoes={[
              { valor: 'ativa', rotulo: l.ativas },
              { valor: 'encerrada', rotulo: l.encerradas },
            ]}
          />
          <FiltroSelect
            rotulo={tl.setor}
            valor={filtros.setor}
            aoMudar={(setor) => definir({ setor })}
            opcoes={[
              { valor: '', rotulo: tl.todos },
              ...SETORES_INTERNACAO.map((x) => ({ valor: x, rotulo: nomeSetor(x) })),
            ]}
          />
          <FiltroSelect
            rotulo={l.medico}
            valor={filtros.medico}
            aoMudar={(medico) => definir({ medico })}
            opcoes={[
              { valor: '', rotulo: tl.todos },
              ...(medicos.data?.itens ?? []).map((m) => ({ valor: m.id, rotulo: m.nomeExibicao })),
            ]}
          />
          {ativas && (
            <FiltroSelect
              rotulo={l.altaPrevista}
              valor={filtros.alta}
              aoMudar={(alta) => definir({ alta })}
              opcoes={[
                { valor: '', rotulo: tl.todas },
                { valor: 'hoje', rotulo: l.altaHoje },
                { valor: 'vencida', rotulo: l.altaVencida },
              ]}
            />
          )}
        </BarraFiltros>

        <DataTable
          legenda={l.legenda}
          colunas={colunas}
          linhas={lista.data?.itens ?? null}
          chave={(i) => i.id}
          nomeDaLinha={(i) => i.pacienteNome}
          carregando={lista.carregando}
          erro={lista.erro}
          aoTentarNovamente={lista.recarregar}
          destacar={(i) => i.previsaoAltaVencida}
          mensagemVazia={haFiltros ? l.nenhuma : l.nenhumaAtiva}
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
