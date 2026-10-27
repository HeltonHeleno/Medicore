import { act, renderHook, waitFor } from '@testing-library/react';
import { useColecao } from '../hooks/useColecao';
import { useListaPacientes } from '../hooks/useDados';
import { criarRepositorio, resetar } from '../services/repositorio';
import { criarPaciente } from '../services/pacientes';

const repo = criarRepositorio<{ id: string; valor: number }>('teste-hook', () => [
  { id: 'a', valor: 1 },
]);

beforeEach(() => resetar());

describe('useColecao', () => {
  it('recarrega depois de uma gravação, sem voltar a "carregando"', async () => {
    const { result } = renderHook(() =>
      useColecao(async () => repo.todos().length, [], ['teste-hook']),
    );
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => {
      repo.inserir({ id: 'b', valor: 2 });
    });
    expect(result.current.carregando).toBe(false);
    await waitFor(() => expect(result.current.data).toBe(2));
    expect(result.current.atualizando).toBe(false);
  });

  it('ignora mudanças em coleções que não acompanha', async () => {
    const fn = vi.fn(async () => 1);
    const { result } = renderHook(() => useColecao(fn, [], ['outra']));
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => {
      repo.inserir({ id: 'c', valor: 3 });
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('ignora a resposta antiga quando os parâmetros mudam', async () => {
    const resolvers: ((v: string) => void)[] = [];
    const { result, rerender } = renderHook(
      ({ p }) => useColecao(() => new Promise<string>((r) => resolvers.push(r)), [p]),
      { initialProps: { p: 'primeira' } },
    );
    rerender({ p: 'segunda' });
    await act(async () => {
      resolvers[1]('segunda');
      resolvers[0]('primeira');
    });
    expect(result.current.data).toBe('segunda');
  });

  it('cancela a assinatura ao desmontar', async () => {
    const fn = vi.fn(async () => 1);
    const { unmount } = renderHook(() => useColecao(fn, [], ['teste-hook']));
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    unmount();
    act(() => {
      repo.inserir({ id: 'd', valor: 4 });
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('hook de entidade: lista de pacientes acompanha um cadastro novo', async () => {
    const { result } = renderHook(() => useListaPacientes({ busca: 'Zuleica' }));
    await waitFor(() => expect(result.current.data?.total).toBe(0));
    await act(() =>
      criarPaciente({
        nome: 'Zuleica Prado',
        cpf: '52998224725',
        dataNascimento: '1980-01-01',
        sexo: 'feminino',
        telefone: '11987654321',
        convenio: { tipo: 'particular' },
        consentimentoLgpd: true,
      }),
    );
    await waitFor(() => expect(result.current.data?.total).toBe(1));
  });
});
