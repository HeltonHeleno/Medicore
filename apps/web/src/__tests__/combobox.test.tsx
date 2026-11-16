import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Campo } from '../components/ui/form/Campo';
import { Combobox } from '../components/ui/form/Combobox';

interface Pessoa {
  id: string;
  nome: string;
}
const PESSOAS: Pessoa[] = [
  { id: '1', nome: 'Ana Silva' },
  { id: '2', nome: 'André Souza' },
  { id: '3', nome: 'Bruno Lima' },
];
const buscarPessoas = vi.fn(async (termo: string) => {
  return PESSOAS.filter((p) => p.nome.toLowerCase().includes(termo.toLowerCase()));
});

function Teste({ atraso = 0 }: { atraso?: number }) {
  const [valor, setValor] = useState<Pessoa | null>(null);
  return (
    <>
      <Campo rotulo="Paciente" obrigatorio>
        <Combobox
          buscar={buscarPessoas}
          valor={valor}
          aoMudar={setValor}
          paraTexto={(p) => p.nome}
          chave={(p) => p.id}
          atraso={atraso}
        />
      </Campo>
      <output data-testid="valor">{valor?.id ?? 'nenhum'}</output>
      <button type="button">depois</button>
    </>
  );
}

beforeEach(() => {
  buscarPessoas.mockClear();
});

describe('Combobox (ARIA 1.2)', () => {
  it('filtra, navega com ↑/↓ e seleciona com Enter — só teclado', async () => {
    render(<Teste />);
    const campo = screen.getByRole('combobox', { name: /Paciente/ });
    expect(campo).toHaveAttribute('aria-expanded', 'false');

    await userEvent.type(campo, 'an');
    await screen.findByRole('option', { name: 'Ana Silva' });
    expect(campo).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(await screen.findByText('2 resultados')).toBeInTheDocument();

    const lista = screen.getByRole('listbox');
    expect(campo).toHaveAttribute('aria-controls', lista.id);
    const [ana, andre] = screen.getAllByRole('option');
    expect(campo).toHaveAttribute('aria-activedescendant', ana.id);
    await userEvent.keyboard('{ArrowDown}');
    expect(campo).toHaveAttribute('aria-activedescendant', andre.id);
    await userEvent.keyboard('{ArrowDown}'); // volta ao início
    expect(campo).toHaveAttribute('aria-activedescendant', ana.id);
    await userEvent.keyboard('{ArrowUp}{Enter}');

    expect(screen.getByTestId('valor')).toHaveTextContent('2');
    expect(campo).toHaveValue('André Souza');
    expect(campo).toHaveAttribute('aria-expanded', 'false');
    expect(campo).toHaveFocus();
  });

  it('Esc fecha a lista e, com ela fechada, limpa a seleção', async () => {
    render(<Teste />);
    const campo = screen.getByRole('combobox');
    await userEvent.type(campo, 'bru');
    await screen.findByRole('option', { name: 'Bruno Lima' });
    await userEvent.keyboard('{Enter}');
    expect(screen.getByTestId('valor')).toHaveTextContent('3');

    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(campo).toHaveAttribute('aria-expanded', 'true'));
    await userEvent.keyboard('{Escape}');
    expect(campo).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('valor')).toHaveTextContent('3');
    await userEvent.keyboard('{Escape}');
    expect(screen.getByTestId('valor')).toHaveTextContent('nenhum');
    expect(campo).toHaveValue('');
  });

  it('nenhum resultado e Tab sai sem selecionar', async () => {
    render(<Teste />);
    const campo = screen.getByRole('combobox');
    await userEvent.type(campo, 'zzz');
    expect(await screen.findByText('Nenhum resultado', { selector: 'p' })).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'depois' })).toHaveFocus();
    expect(screen.getByTestId('valor')).toHaveTextContent('nenhum');
    // Texto sem seleção é descartado: o campo não finge ter um valor escolhido.
    expect(campo).toHaveValue('');
  });

  it('clique na opção seleciona; botão limpa a seleção', async () => {
    render(<Teste />);
    await userEvent.type(screen.getByRole('combobox'), 'ana');
    await userEvent.click(await screen.findByRole('option', { name: 'Ana Silva' }));
    expect(screen.getByTestId('valor')).toHaveTextContent('1');
    await userEvent.click(screen.getByRole('button', { name: 'Limpar seleção' }));
    expect(screen.getByTestId('valor')).toHaveTextContent('nenhum');
  });

  it('espera 250 ms antes de buscar e ignora digitações intermediárias', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Teste atraso={250} />);
    await user.type(screen.getByRole('combobox'), 'and');
    expect(buscarPessoas).not.toHaveBeenCalled();
    expect(screen.getByText('Buscando…')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(260));
    expect(buscarPessoas).toHaveBeenCalledTimes(1);
    expect(buscarPessoas).toHaveBeenCalledWith('and');
    vi.useRealTimers();
  });
});
