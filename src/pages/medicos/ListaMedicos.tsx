import { LayoutGrid, Plus, Table2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TabelaMedicos } from '../../components/medicos/TabelaMedicos';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BarraFiltros, FiltroSelect } from '../../components/ui/lista/BarraFiltros';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { Paginacao } from '../../components/ui/lista/Paginacao';
import { POR_PAGINA } from '../../config/limites';
import { departamentos } from '../../data/mock';
import { useAcoesMedico } from '../../hooks/useAcoesMedico';
import { useListaMedicos } from '../../hooks/useDados';
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import type { Ordem, OrdenacaoMedicos, StatusFiltro } from '../../types';
import { cn } from '../../utils/cn';

const m = t.medicos;
const p = t.pacientes;
const PADROES = {
  busca: '',
  departamentoId: '',
  status: 'ativos',
  ordenarPor: 'nome',
  ordem: 'asc',
  pagina: 1,
};
const STATUS: StatusFiltro[] = ['ativos', 'inativos', 'todos'];
const CHAVE_VISUALIZACAO = 'medicore-medicos-visualizacao';

function lerPreferencia(): boolean {
  try {
    return localStorage.getItem(CHAVE_VISUALIZACAO) === 'cartoes';
  } catch {
    return false;
  }
}

/** /medicos — busca por nome ou CRM, filtros por departamento e situação, tabela ou cartões. */
export default function ListaMedicos() {
  const navigate = useNavigate();
  const { filtros, definir, limpar, haFiltros } = useFiltrosUrl(PADROES);
  const [cartoes, setCartoes] = useState(lerPreferencia);
  const acoes = useAcoesMedico();

  const status = STATUS.includes(filtros.status as StatusFiltro)
    ? (filtros.status as StatusFiltro)
    : 'ativos';
  const ordenarPor: OrdenacaoMedicos =
    filtros.ordenarPor === 'departamento' ? 'departamento' : 'nome';
  const ordem: Ordem = filtros.ordem === 'desc' ? 'desc' : 'asc';

  const lista = useListaMedicos({
    busca: filtros.busca,
    departamentoId: filtros.departamentoId || undefined,
    status,
    ordenarPor,
    ordem,
    pagina: filtros.pagina,
    porPagina: POR_PAGINA,
  });

  const mudarVisualizacao = (emCartoes: boolean) => {
    setCartoes(emCartoes);
    try {
      localStorage.setItem(CHAVE_VISUALIZACAO, emCartoes ? 'cartoes' : 'tabela');
    } catch {
      /* sem storage: vale só nesta visita */
    }
  };

  const botaoVisao = (emCartoes: boolean, rotulo: string, Icone: typeof Table2) => (
    <button
      type="button"
      aria-pressed={cartoes === emCartoes}
      onClick={() => mudarVisualizacao(emCartoes)}
      className={cn(
        'inline-flex h-[42px] items-center gap-1.5 px-3 text-[13.5px] font-medium first:rounded-l-lg last:rounded-r-lg',
        'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
        cartoes === emCartoes ? 'bg-primary text-on-primary' : 'bg-card text-text hover:bg-bg',
      )}
    >
      <Icone size={16} aria-hidden />
      {rotulo}
    </button>
  );

  return (
    <>
      <CabecalhoPagina
        titulo={m.titulo}
        descricao={m.descricaoLista}
        acoes={
          <ButtonLink to="/medicos/novo" iconeEsquerda={<Plus size={18} />}>
            {m.novo}
          </ButtonLink>
        }
      />
      <Card>
        <BarraFiltros
          busca={filtros.busca}
          aoBuscar={(busca) => definir({ busca })}
          rotuloBusca={m.buscar}
          filtrosAtivos={haFiltros}
          aoLimpar={limpar}
          className="mb-4"
        >
          <FiltroSelect
            rotulo={m.departamento}
            valor={filtros.departamentoId}
            aoMudar={(departamentoId) => definir({ departamentoId })}
            opcoes={[
              { valor: '', rotulo: m.todosDepartamentos },
              ...departamentos.map((d) => ({ valor: d.id, rotulo: d.nome })),
            ]}
          />
          <FiltroSelect
            rotulo={p.status}
            valor={status}
            aoMudar={(valor) => definir({ status: valor })}
            opcoes={[
              { valor: 'ativos', rotulo: p.ativos },
              { valor: 'inativos', rotulo: p.inativos },
              { valor: 'todos', rotulo: p.todos },
            ]}
          />
          <div
            role="group"
            aria-label={m.visualizacao}
            className="flex rounded-lg border border-border-input"
          >
            {botaoVisao(false, m.tabela, Table2)}
            {botaoVisao(true, m.cartoes, LayoutGrid)}
          </div>
        </BarraFiltros>

        <TabelaMedicos
          dados={lista.data}
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
          mensagemVazia={haFiltros ? m.nenhumEncontrado(filtros.busca) : m.nenhumCadastrado}
          acaoVazia={
            haFiltros
              ? { rotulo: t.lista.limparFiltros, aoClicar: limpar }
              : { rotulo: m.novo, aoClicar: () => navigate('/medicos/novo') }
          }
          cartoes={cartoes}
          aoInativar={acoes.inativar}
          aoReativar={(r) => void acoes.reativar(r)}
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
      {acoes.dialogo}
    </>
  );
}
