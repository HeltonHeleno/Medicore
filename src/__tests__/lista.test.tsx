import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { BarraFiltros } from '../components/ui/lista/BarraFiltros';
import { CabecalhoPagina } from '../components/ui/lista/CabecalhoPagina';
import { DataTable, type Coluna } from '../components/ui/lista/DataTable';
import { DescricaoLista } from '../components/ui/lista/DescricaoLista';
import { MenuAcoes } from '../components/ui/lista/MenuAcoes';
import { Paginacao } from '../components/ui/lista/Paginacao';
import { paginasVisiveis } from '../components/ui/lista/paginas';
import { useFiltrosUrl, useOrigem, useVoltarPara } from '../hooks/useFiltrosUrl';

interface Linha {
  id: string;
  nome: string;
  idade: number;
}
const LINHAS: Linha[] = [
  { id: 'a', nome: 'Ana', idade: 30 },
  { id: 'b', nome: 'Bruno', idade: 45 },
  { id: 'c', nome: 'Carla', idade: 22 },
];
const COLUNAS: Coluna<Linha>[] = [
  { id: 'nome', titulo: 'Nome', celula: (l) => l.nome, ordenavel: true },
  { id: 'idade', titulo: 'Idade', celula: (l) => l.idade, ordenavel: true },
];

function Tabela(props: Partial<Parameters<typeof DataTable<Linha>>[0]>) {
  return (
    <DataTable
      legenda="Pacientes"
      colunas={COLUNAS}
      linhas={LINHAS}
      chave={(l) => l.id}
      nomeDaLinha={(l) => l.nome}
      {...props}
    />
  );
}

describe('DataTable', () => {
  it('ordena pelo cabeçalho e marca aria-sort', async () => {
    const aoOrdenar = vi.fn();
    render(<Tabela ordenacao={{ coluna: 'nome', ordem: 'desc' }} aoOrdenar={aoOrdenar} />);
    const tabela = screen.getByRole('table', { name: 'Pacientes' });
    const [nome, idade] = within(tabela).getAllByRole('columnheader');
    expect(nome).toHaveAttribute('aria-sort', 'descending');
    expect(idade).not.toHaveAttribute('aria-sort');
    await userEvent.click(within(idade).getByRole('button', { name: 'Idade' }));
    expect(aoOrdenar).toHaveBeenCalledWith('idade');
    expect(
      within(tabela)
        .getAllByRole('rowheader')
        .map((c) => c.textContent),
    ).toEqual(['Ana', 'Bruno', 'Carla']);
  });

  it('seleção múltipla: por linha e "todos desta página", respeitando as bloqueadas', async () => {
    function ComSelecao() {
      const [sel, setSel] = useState<Set<string>>(new Set());
      return (
        <>
          <Tabela
            selecao={{ selecionados: sel, aoMudar: setSel, podeSelecionar: (k) => k !== 'c' }}
          />
          <output data-testid="sel">{[...sel].sort().join(',')}</output>
        </>
      );
    }
    render(<ComSelecao />);
    const tabela = screen.getByRole('table');
    const todos = within(tabela).getByRole('checkbox', { name: 'Selecionar todos desta página' });
    await userEvent.click(within(tabela).getByRole('checkbox', { name: 'Selecionar Ana' }));
    expect(todos).toHaveProperty('indeterminate', true);
    await userEvent.click(todos);
    expect(screen.getByTestId('sel')).toHaveTextContent('a,b');
    expect(within(tabela).getByRole('checkbox', { name: 'Selecionar Carla' })).toBeDisabled();
    await userEvent.click(todos);
    expect(screen.getByTestId('sel')).toHaveTextContent(/^$/);
  });

  it('versão em cartões traz as mesmas informações', () => {
    render(<Tabela />);
    const cartoes = screen.getByRole('list', { name: 'Pacientes' });
    expect(within(cartoes).getAllByRole('listitem')).toHaveLength(3);
    expect(within(cartoes).getAllByRole('term')[0]).toHaveTextContent('Idade');
  });

  it('estados: carregando, vazio com ação, erro com "Tentar novamente"', async () => {
    const { rerender, container } = render(<Tabela linhas={null} carregando />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    const limpar = vi.fn();
    rerender(<Tabela linhas={[]} acaoVazia={{ rotulo: 'Limpar filtros', aoClicar: limpar }} />);
    expect(screen.getByText('Nenhum registro encontrado.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(limpar).toHaveBeenCalled();
    const tentar = vi.fn();
    rerender(<Tabela erro={new Error('x')} aoTentarNovamente={tentar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(tentar).toHaveBeenCalled();
  });
});

describe('Paginacao', () => {
  it('mostra o intervalo e marca a página atual', async () => {
    const aoMudar = vi.fn();
    render(<Paginacao pagina={2} porPagina={10} total={48} aoMudar={aoMudar} />);
    expect(screen.getByText('Mostrando 11–20 de 48')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(aoMudar).toHaveBeenCalledWith(3);
  });

  it('página além do fim mostra a última; uma página só não tem navegação', () => {
    const { rerender } = render(
      <Paginacao pagina={9} porPagina={10} total={23} aoMudar={() => {}} />,
    );
    expect(screen.getByText('Mostrando 21–23 de 23')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
    rerender(<Paginacao pagina={1} porPagina={10} total={4} aoMudar={() => {}} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('reticências quando há muitas páginas', () => {
    expect(paginasVisiveis(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginasVisiveis(1, 12)).toEqual([1, 2, 3, 4, 5, '…', 12]);
    expect(paginasVisiveis(6, 12)).toEqual([1, '…', 5, 6, 7, '…', 12]);
    expect(paginasVisiveis(12, 12)).toEqual([1, '…', 8, 9, 10, 11, 12]);
  });
});

describe('MenuAcoes', () => {
  it('abre, navega por teclado, executa e devolve o foco', async () => {
    const editar = vi.fn();
    render(
      <MemoryRouter>
        <MenuAcoes
          nome="Ana"
          acoes={[
            { rotulo: 'Ver', href: '/x' },
            { rotulo: 'Editar', aoClicar: editar },
            { rotulo: 'Excluir', aoClicar: () => {}, desabilitado: true },
          ]}
        />
      </MemoryRouter>,
    );
    const botao = screen.getByRole('button', { name: 'Mais ações para Ana' });
    botao.focus();
    await userEvent.keyboard('{ArrowDown}');
    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Ver' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(within(menu).getByRole('menuitem', { name: 'Editar' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}'); // pula o desabilitado e volta ao início
    expect(within(menu).getByRole('menuitem', { name: 'Ver' })).toHaveFocus();
    await userEvent.keyboard('{End}{Enter}');
    expect(editar).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(botao).toHaveFocus();
  });
});

describe('BarraFiltros', () => {
  it('busca depois de 300 ms e "Limpar filtros" aparece com filtro ativo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const aoBuscar = vi.fn();
    const aoLimpar = vi.fn();
    const { rerender } = render(
      <BarraFiltros
        busca=""
        aoBuscar={aoBuscar}
        rotuloBusca="Buscar pacientes"
        aoLimpar={aoLimpar}
      />,
    );
    expect(screen.getByRole('search')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar pacientes' }), 'ana ');
    expect(aoBuscar).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(310));
    expect(aoBuscar).toHaveBeenCalledExactlyOnceWith('ana');
    vi.useRealTimers();

    rerender(
      <BarraFiltros
        busca="ana"
        aoBuscar={aoBuscar}
        rotuloBusca="Buscar pacientes"
        aoLimpar={aoLimpar}
        filtrosAtivos
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(aoLimpar).toHaveBeenCalled();
    rerender(<BarraFiltros busca="" aoBuscar={aoBuscar} rotuloBusca="Buscar pacientes" />);
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
});

describe('useFiltrosUrl', () => {
  const PADROES = { busca: '', status: 'ativos', pagina: 1 };
  const envoltorio =
    (inicial: string) =>
    ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[inicial]}>{children}</MemoryRouter>
    );

  it('lê da URL com os tipos do padrão e escreve só o que difere', () => {
    const { result } = renderHook(() => ({ f: useFiltrosUrl(PADROES), local: useLocation() }), {
      wrapper: envoltorio('/pacientes?busca=ana&pagina=3'),
    });
    expect(result.current.f.filtros).toEqual({ busca: 'ana', status: 'ativos', pagina: 3 });
    expect(result.current.f.haFiltros).toBe(true);

    act(() => result.current.f.definir({ pagina: 4 }));
    expect(result.current.local.search).toBe('?busca=ana&pagina=4');
    act(() => result.current.f.definir({ status: 'todos' })); // filtro novo → página 1
    expect(result.current.local.search).toBe('?busca=ana&status=todos');
    act(() => result.current.f.limpar());
    expect(result.current.local.search).toBe('');
    expect(result.current.f.haFiltros).toBe(false);
  });

  it('o detalhe volta para a lista como estava (M14)', () => {
    const { result } = renderHook(() => useOrigem(), {
      wrapper: envoltorio('/pacientes?busca=ana'),
    });
    expect(result.current).toEqual({ de: '/pacientes?busca=ana' });

    const comEstado = ({ children }: { children: ReactNode }) => (
      <MemoryRouter
        initialEntries={[{ pathname: '/pacientes/1', state: { de: '/pacientes?busca=ana' } }]}
      >
        {children}
      </MemoryRouter>
    );
    expect(
      renderHook(() => useVoltarPara('/pacientes'), { wrapper: comEstado }).result.current,
    ).toBe('/pacientes?busca=ana');
    expect(
      renderHook(() => useVoltarPara('/pacientes'), { wrapper: envoltorio('/pacientes/1') }).result
        .current,
    ).toBe('/pacientes');
  });
});

describe('CabecalhoPagina e DescricaoLista', () => {
  it('breadcrumb a partir das rotas, com o último item dinâmico', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/pacientes',
          handle: { titulo: 'Pacientes', breadcrumb: 'Pacientes' },
          children: [
            {
              path: ':id',
              handle: { titulo: 'Paciente', breadcrumb: 'Paciente' },
              element: <CabecalhoPagina titulo="João Pereira" breadcrumbFinal="João Pereira" />,
            },
          ],
        },
      ],
      { initialEntries: ['/pacientes/1'] },
    );
    render(<RouterProvider router={router} />);
    const nav = screen.getByRole('navigation', { name: 'Você está em' });
    expect(within(nav).getByRole('link', { name: 'Painel' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'Pacientes' })).toHaveAttribute(
      'href',
      '/pacientes',
    );
    expect(within(nav).getByText('João Pereira')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 1, name: 'João Pereira' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('DescricaoLista mostra "—" para vazio', () => {
    render(
      <DescricaoLista
        itens={[
          { termo: 'E-mail', descricao: '' },
          { termo: 'Nome', descricao: 'Ana' },
        ]}
      />,
    );
    expect(screen.getAllByRole('definition').map((d) => d.textContent)).toEqual(['—', 'Ana']);
  });
});
