import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConteudoAsync } from '../components/ui/ConteudoAsync';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { EstadoAsync } from '../hooks/useAsync';

const comRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('StatusBadge', () => {
  it.each([
    ['concluida', 'Concluída'],
    ['agendada', 'Agendada'],
    ['cancelada', 'Cancelada'],
  ] as const)('mostra "%s" como "%s"', (status, rotulo) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(rotulo)).toBeInTheDocument();
  });

  it('usa estilos diferentes por status', () => {
    const { container } = render(
      <>
        <StatusBadge status="concluida" />
        <StatusBadge status="cancelada" />
      </>,
    );
    const [a, b] = Array.from(container.querySelectorAll('span'));
    expect(a.className).toContain('bg-primary');
    expect(b.className).toContain('bg-danger-bg');
  });
});

describe('PriorityBadge', () => {
  it.each([
    ['alta', 'Alta', 'text-danger'],
    ['media', 'Média', 'text-warning'],
    ['baixa', 'Baixa', 'text-text-muted'],
  ] as const)('mostra "%s" como "%s"', (prioridade, rotulo, classe) => {
    render(<PriorityBadge prioridade={prioridade} />);
    expect(screen.getByText(rotulo)).toHaveClass(classe);
  });
});

describe('ProgressBar', () => {
  it('expõe o valor para tecnologias assistivas', () => {
    render(<ProgressBar valor={88} rotulo="Cardiologia" />);
    const barra = screen.getByRole('progressbar', { name: 'Cardiologia' });
    expect(barra).toHaveAttribute('aria-valuenow', '88');
    expect(barra).toHaveAttribute('aria-valuemin', '0');
    expect(barra).toHaveAttribute('aria-valuemax', '100');
  });

  it('limita valores fora da faixa 0–100', () => {
    render(<ProgressBar valor={130} rotulo="Acima" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('usa a cor de perigo quando pedido', () => {
    const { container } = render(<ProgressBar valor={93} rotulo="Emergência" cor="perigo" />);
    expect(container.querySelector('[style]')).toHaveClass('bg-danger');
  });
});

describe('Button', () => {
  it('dispara onClick e é do tipo "button" por padrão', async () => {
    const aoClicar = vi.fn();
    render(<Button onClick={aoClicar}>Salvar</Button>);
    const botao = screen.getByRole('button', { name: 'Salvar' });
    expect(botao).toHaveAttribute('type', 'button');
    await userEvent.click(botao);
    expect(aoClicar).toHaveBeenCalledOnce();
  });

  it('aplica a variante e o tamanho', () => {
    render(
      <Button variante="contorno" tamanho="sm">
        Ver
      </Button>,
    );
    const botao = screen.getByRole('button', { name: 'Ver' });
    expect(botao).toHaveClass('border', 'text-[13px]');
  });

  it('ButtonLink renderiza um link navegável', () => {
    comRouter(<ButtonLink to="/consultas">Ver agenda</ButtonLink>);
    expect(screen.getByRole('link', { name: 'Ver agenda' })).toHaveAttribute('href', '/consultas');
  });
});

describe('Card', () => {
  it('vira uma região nomeada pelo título e mostra a ação', () => {
    comRouter(
      <Card titulo="Consultas de hoje" acao={{ rotulo: 'Ver todas', href: '/consultas' }}>
        conteúdo
      </Card>,
    );
    expect(screen.getByRole('region', { name: 'Consultas de hoje' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Consultas de hoje' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/consultas');
  });

  it('variante perigo usa o fundo rosado e título vermelho', () => {
    comRouter(
      <Card titulo="Alertas de emergência" variante="perigo">
        x
      </Card>,
    );
    expect(screen.getByRole('region')).toHaveClass('bg-danger-bg');
    expect(screen.getByRole('heading')).toHaveClass('text-danger');
  });
});

describe('EmptyState e ErrorState', () => {
  it('EmptyState mostra a mensagem', () => {
    render(<EmptyState mensagem="Nenhuma consulta para hoje." />);
    expect(screen.getByText('Nenhuma consulta para hoje.')).toBeInTheDocument();
  });

  it('ErrorState anuncia o erro e permite tentar novamente', async () => {
    const tentar = vi.fn();
    render(<ErrorState aoTentarNovamente={tentar} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os dados.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(tentar).toHaveBeenCalledOnce();
  });
});

describe('ConteudoAsync', () => {
  const estado = <T,>(parcial: Partial<EstadoAsync<T>>): EstadoAsync<T> => ({
    data: null,
    carregando: false,
    erro: null,
    recarregar: vi.fn(),
    ...parcial,
  });
  const lista = (itens: string[]) => (
    <ul>
      {itens.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );

  it('mostra o esqueleto enquanto carrega', () => {
    const { container } = render(
      <ConteudoAsync estado={estado<string[]>({ carregando: true })}>{lista}</ConteudoAsync>,
    );
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('mostra o erro com "Tentar novamente"', () => {
    render(
      <ConteudoAsync estado={estado<string[]>({ erro: new Error('x') })}>{lista}</ConteudoAsync>,
    );
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('mostra a mensagem de vazio para listas sem itens', () => {
    render(
      <ConteudoAsync estado={estado<string[]>({ data: [] })} vazio="Nenhum alerta ativo.">
        {lista}
      </ConteudoAsync>,
    );
    expect(screen.getByText('Nenhum alerta ativo.')).toBeInTheDocument();
  });

  it('renderiza os dados quando há conteúdo', () => {
    render(<ConteudoAsync estado={estado({ data: ['a', 'b'] })}>{lista}</ConteudoAsync>);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
