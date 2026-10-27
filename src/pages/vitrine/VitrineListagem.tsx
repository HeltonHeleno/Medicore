import { Eye, Pencil, UserX } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { BarraFiltros, FiltroSelect } from '../../components/ui/lista/BarraFiltros';
import { DataTable, type Coluna } from '../../components/ui/lista/DataTable';
import { DescricaoLista } from '../../components/ui/lista/DescricaoLista';
import { MenuAcoes } from '../../components/ui/lista/MenuAcoes';
import { Paginacao } from '../../components/ui/lista/Paginacao';
import { useListaPacientes } from '../../hooks/useDados';
import { t } from '../../i18n/pt-BR';
import type { OrdenacaoPacientes, PacienteResumo, StatusFiltro } from '../../types';

const v = t.vitrine;

/** Vitrine: barra de filtros, tabela (ordenação, seleção, ações), paginação e estados. */
export function VitrineListagem() {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusFiltro>('ativos');
  const [pagina, setPagina] = useState(1);
  const [ordenacao, setOrdenacao] = useState<{ coluna: OrdenacaoPacientes; ordem: 'asc' | 'desc' }>(
    {
      coluna: 'nome',
      ordem: 'asc',
    },
  );
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const lista = useListaPacientes({
    busca,
    status,
    pagina,
    porPagina: 5,
    ordenarPor: ordenacao.coluna,
    ordem: ordenacao.ordem,
  });

  const colunas: Coluna<PacienteResumo>[] = [
    {
      id: 'nome',
      titulo: v.colunaNome,
      ordenavel: true,
      celula: (p) => (
        <Link
          to="/ui"
          className="rounded text-text hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          {p.nomeExibicao}
        </Link>
      ),
    },
    {
      id: 'cpf',
      titulo: v.colunaCpf,
      celula: (p) => <span className="tabular-nums">{p.cpfMascarado}</span>,
    },
    { id: 'idade', titulo: v.colunaIdade, ordenavel: true, celula: (p) => v.anos(p.idade) },
    { id: 'convenio', titulo: v.colunaConvenio, celula: (p) => p.convenioNome },
  ];

  const ordenar = (coluna: string) =>
    setOrdenacao((o) => ({
      coluna: coluna as OrdenacaoPacientes,
      ordem: o.coluna === coluna && o.ordem === 'asc' ? 'desc' : 'asc',
    }));

  return (
    <div className="space-y-5">
      <Card titulo={v.listagem}>
        <BarraFiltros
          busca={busca}
          aoBuscar={(termo) => {
            setBusca(termo);
            setPagina(1);
          }}
          rotuloBusca={v.buscarPacientes}
          filtrosAtivos={busca !== '' || status !== 'ativos'}
          aoLimpar={() => {
            setBusca('');
            setStatus('ativos');
            setPagina(1);
          }}
          className="mb-4"
        >
          <FiltroSelect
            rotulo={v.status}
            valor={status}
            aoMudar={(s) => {
              setStatus(s as StatusFiltro);
              setPagina(1);
            }}
            opcoes={[
              { valor: 'ativos', rotulo: v.ativos },
              { valor: 'inativos', rotulo: v.inativos },
              { valor: 'todos', rotulo: v.todos },
            ]}
          />
        </BarraFiltros>
        {selecionados.size > 0 && (
          <p className="mb-2 text-[13.5px] text-text-muted" aria-live="polite">
            {t.lista.selecionados(selecionados.size)}
          </p>
        )}
        <DataTable
          legenda={v.listagem}
          colunas={colunas}
          linhas={lista.data?.itens ?? null}
          chave={(p) => p.id}
          nomeDaLinha={(p) => p.nomeExibicao}
          carregando={lista.carregando}
          erro={lista.erro}
          aoTentarNovamente={lista.recarregar}
          ordenacao={ordenacao}
          aoOrdenar={ordenar}
          selecao={{ selecionados, aoMudar: setSelecionados }}
          acoes={(p) => (
            <MenuAcoes
              nome={p.nomeExibicao}
              acoes={[
                { rotulo: v.acaoVer, icone: Eye, href: '/ui' },
                { rotulo: v.acaoEditar, icone: Pencil, href: '/ui' },
                { rotulo: v.acaoInativar, icone: UserX, perigo: true, aoClicar: () => undefined },
              ]}
            />
          )}
        />
        {lista.data && (
          <Paginacao
            pagina={lista.data.pagina}
            porPagina={lista.data.porPagina}
            total={lista.data.total}
            aoMudar={setPagina}
          />
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card titulo={`${v.estadosTabela}: ${v.carregando}`}>
          <DataTable
            legenda={v.carregando}
            colunas={colunas}
            linhas={null}
            carregando
            chave={(p) => p.id}
            nomeDaLinha={(p) => p.nomeExibicao}
          />
        </Card>
        <Card titulo={`${v.estadosTabela}: ${v.vazio}`}>
          <DataTable
            legenda={v.vazio}
            colunas={colunas}
            linhas={[]}
            chave={(p) => p.id}
            nomeDaLinha={(p) => p.nomeExibicao}
            acaoVazia={{ rotulo: t.lista.limparFiltros, aoClicar: () => undefined }}
          />
        </Card>
        <Card titulo={`${v.estadosTabela}: ${v.erro}`}>
          <DataTable
            legenda={v.erro}
            colunas={colunas}
            linhas={null}
            erro={new Error('x')}
            aoTentarNovamente={() => undefined}
            chave={(p) => p.id}
            nomeDaLinha={(p) => p.nomeExibicao}
          />
        </Card>
      </div>

      <Card titulo={v.descricaoLista}>
        <DescricaoLista
          colunas={3}
          itens={[
            { termo: v.colunaNome, descricao: 'Ana Paula Silva' },
            { termo: v.colunaCpf, descricao: '***.982.247-**' },
            { termo: v.telefone, descricao: '(11) 98765-4321' },
            { termo: v.colunaConvenio, descricao: 'Unimed' },
            { termo: v.cep, descricao: '' },
            {
              termo: v.observacoes,
              descricao: 'Paciente prefere atendimento pela manhã.',
              largo: true,
            },
          ]}
        />
      </Card>
    </div>
  );
}
