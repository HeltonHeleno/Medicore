import { BookOpen, PackagePlus, Pill, Plus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { TabelaEstoque } from '../../components/farmacia/TabelaEstoque';
import { AbasModulo } from '../../components/ui/AbasModulo';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Checkbox } from '../../components/ui/form/Checkbox';
import { BarraFiltros, FiltroSelect } from '../../components/ui/lista/BarraFiltros';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { Paginacao } from '../../components/ui/lista/Paginacao';
import { ResumoNumeros } from '../../components/ui/ResumoNumeros';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { POR_PAGINA } from '../../config/limites';
import { useEstoque, useResumoEstoque } from '../../hooks/useDadosOperacoes';
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import { tf } from '../../i18n/pt-BR/farmacia';
import { FORMAS } from '../../schemas/farmacia';
import type { FiltrosEstoque, FormaFarmaceutica } from '../../types';
import { abasFarmacia } from './abas';

const e = tf.estoqueTela;
const PADROES = {
  busca: '',
  situacao: '',
  forma: '',
  controlados: '',
  status: 'ativos',
  ordenarPor: 'nome',
  ordem: 'asc',
  pagina: 1,
};
const SITUACOES = ['ok', 'baixo', 'zerado', 'vencendo', 'vencidos'] as const;
const ORDENACOES = ['nome', 'disponivel', 'vencimento'] as const;
const STATUS = ['ativos', 'inativos', 'todos'] as const;

/** /farmacia — estoque (19.2): resumo, busca, filtros, ordenação e paginação na URL. */
export default function Estoque() {
  const local = useLocation();
  const { filtros, definir, limpar, haFiltros } = useFiltrosUrl(PADROES);
  const ordenarPor = ORDENACOES.find((x) => x === filtros.ordenarPor) ?? 'nome';
  const ordem = filtros.ordem === 'desc' ? 'desc' : 'asc';
  const criterio: FiltrosEstoque = {
    busca: filtros.busca,
    situacao: SITUACOES.find((x) => x === filtros.situacao),
    forma: FORMAS.find((x) => x === filtros.forma) as FormaFarmaceutica | undefined,
    soControlados: filtros.controlados === '1',
    status: STATUS.find((x) => x === filtros.status) ?? 'ativos',
    ordenarPor,
    ordem,
    pagina: filtros.pagina,
    porPagina: POR_PAGINA,
  };
  const lista = useEstoque(criterio);
  const resumo = useResumoEstoque();
  const r = resumo.data;

  return (
    <>
      <CabecalhoPagina
        titulo={tf.titulo}
        descricao={
          <>
            {e.descricao}{' '}
            <Link
              to="/farmacia/controlados"
              className="inline-flex items-center gap-1 rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <BookOpen size={15} aria-hidden />
              {tf.livroControlados}
            </Link>
          </>
        }
        acoes={
          <div className="flex flex-wrap gap-2">
            <ButtonLink
              variante="contorno"
              to="/farmacia/medicamentos/novo"
              iconeEsquerda={<Plus size={18} />}
            >
              {tf.novoMedicamento}
            </ButtonLink>
            <ButtonLink
              variante="contorno"
              to="/farmacia/entrada"
              iconeEsquerda={<PackagePlus size={18} />}
            >
              {tf.entradaLote}
            </ButtonLink>
            <ButtonLink to="/farmacia/dispensar" iconeEsquerda={<Pill size={18} />}>
              {tf.dispensar}
            </ButtonLink>
          </div>
        }
      />
      <AbasModulo rotulo={tf.abasRotulo} abas={abasFarmacia} className="mb-5" />

      {r ? (
        <ResumoNumeros
          rotulo={e.resumoRotulo}
          className="mb-5"
          itens={[
            {
              rotulo: e.resumo.baixo,
              valor: r.baixo,
              para: '/farmacia?situacao=baixo',
              destaque: 'perigo',
            },
            {
              rotulo: e.resumo.zerado,
              valor: r.zerado,
              para: '/farmacia?situacao=zerado',
              destaque: 'perigo',
            },
            { rotulo: e.resumo.vencendo, valor: r.vencendo, para: '/farmacia/vencimentos' },
            {
              rotulo: e.resumo.vencidos,
              valor: r.vencidos,
              para: '/farmacia/vencimentos',
              destaque: 'perigo',
            },
          ]}
        />
      ) : (
        <div aria-busy="true" className="mb-5">
          <SkeletonLinhas linhas={1} />
        </div>
      )}

      <Card>
        <BarraFiltros
          busca={filtros.busca}
          aoBuscar={(busca) => definir({ busca })}
          rotuloBusca={e.buscar}
          placeholder={e.buscarPlaceholder}
          filtrosAtivos={haFiltros}
          aoLimpar={limpar}
          className="mb-4"
        >
          <FiltroSelect
            rotulo={e.situacao}
            valor={criterio.situacao ?? ''}
            aoMudar={(situacao) => definir({ situacao })}
            opcoes={[
              { valor: '', rotulo: tf.todas },
              ...SITUACOES.map((x) => ({ valor: x, rotulo: e.situacoesFiltro[x] })),
            ]}
          />
          <FiltroSelect
            rotulo={e.forma}
            valor={criterio.forma ?? ''}
            aoMudar={(forma) => definir({ forma })}
            opcoes={[
              { valor: '', rotulo: tf.todas },
              ...FORMAS.map((x) => ({ valor: x, rotulo: tf.formas[x] })),
            ]}
          />
          <FiltroSelect
            rotulo={e.status}
            valor={criterio.status ?? 'ativos'}
            aoMudar={(status) => definir({ status })}
            opcoes={STATUS.map((x) => ({ valor: x, rotulo: e.statusOpcoes[x] }))}
          />
          <Checkbox
            rotulo={e.soControlados}
            checked={criterio.soControlados}
            onChange={(ev) => definir({ controlados: ev.target.checked ? '1' : '' })}
            className="pb-2.5"
          />
        </BarraFiltros>
        <TabelaEstoque
          linhas={lista.data?.itens ?? null}
          carregando={lista.carregando}
          erro={lista.erro}
          aoTentarNovamente={lista.recarregar}
          ordenacao={{ coluna: ordenarPor, ordem }}
          aoOrdenar={(coluna) =>
            definir({
              ordenarPor: coluna,
              ordem: ordenarPor === coluna && ordem === 'asc' ? 'desc' : 'asc',
            })
          }
          mensagemVazia={e.vazio}
          acaoVazia={haFiltros ? { rotulo: t.lista.limparFiltros, aoClicar: limpar } : undefined}
          origem={{ de: `${local.pathname}${local.search}` }}
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
