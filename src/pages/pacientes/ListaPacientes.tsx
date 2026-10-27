import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TabelaPacientes } from '../../components/pacientes/TabelaPacientes';
import { ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BarraFiltros, FiltroSelect } from '../../components/ui/lista/BarraFiltros';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { Paginacao } from '../../components/ui/lista/Paginacao';
import { POR_PAGINA } from '../../config/limites';
import { useListaPacientes } from '../../hooks/useDados';
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import type { Ordem, OrdenacaoPacientes, StatusFiltro } from '../../types';

const p = t.pacientes;
const PADROES = { busca: '', status: 'ativos', ordenarPor: 'nome', ordem: 'asc', pagina: 1 };
const ORDENACOES: OrdenacaoPacientes[] = ['nome', 'idade', 'proximaConsulta'];
const STATUS: StatusFiltro[] = ['ativos', 'inativos', 'todos'];

/** /pacientes — busca, filtro de situação, ordenação e paginação na URL (M14). */
export default function ListaPacientes() {
  const navigate = useNavigate();
  const { filtros, definir, limpar, haFiltros } = useFiltrosUrl(PADROES);
  const status = STATUS.includes(filtros.status as StatusFiltro)
    ? (filtros.status as StatusFiltro)
    : 'ativos';
  const ordenarPor = ORDENACOES.includes(filtros.ordenarPor as OrdenacaoPacientes)
    ? (filtros.ordenarPor as OrdenacaoPacientes)
    : 'nome';
  const ordem: Ordem = filtros.ordem === 'desc' ? 'desc' : 'asc';

  const lista = useListaPacientes({
    busca: filtros.busca,
    status,
    ordenarPor,
    ordem,
    pagina: filtros.pagina,
    porPagina: POR_PAGINA,
  });

  const ordenar = (coluna: string) =>
    definir({
      ordenarPor: coluna,
      ordem: ordenarPor === coluna && ordem === 'asc' ? 'desc' : 'asc',
    });

  return (
    <>
      <CabecalhoPagina
        titulo={p.titulo}
        descricao={p.descricaoLista}
        acoes={
          <ButtonLink to="/pacientes/novo" iconeEsquerda={<Plus size={18} />}>
            {p.novo}
          </ButtonLink>
        }
      />
      <Card>
        <BarraFiltros
          busca={filtros.busca}
          aoBuscar={(busca) => definir({ busca })}
          rotuloBusca={p.buscar}
          filtrosAtivos={haFiltros}
          aoLimpar={limpar}
          className="mb-4"
        >
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
        </BarraFiltros>

        <TabelaPacientes
          dados={lista.data}
          carregando={lista.carregando}
          erro={lista.erro}
          aoTentarNovamente={lista.recarregar}
          ordenacao={{ coluna: ordenarPor, ordem }}
          aoOrdenar={ordenar}
          mensagemVazia={haFiltros ? p.nenhumEncontrado(filtros.busca) : p.nenhumCadastrado}
          acaoVazia={
            haFiltros
              ? { rotulo: t.lista.limparFiltros, aoClicar: limpar }
              : { rotulo: p.novo, aoClicar: () => navigate('/pacientes/novo') }
          }
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
