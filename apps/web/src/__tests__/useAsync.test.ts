import { act, renderHook, waitFor } from '@testing-library/react';
import { useAsync } from '../hooks/useAsync';

describe('useAsync', () => {
  it('começa carregando e depois entrega os dados', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.resolve(42)));
    expect(result.current.carregando).toBe(true);
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.data).toBe(42);
    expect(result.current.erro).toBeNull();
  });

  it('expõe o erro quando a promessa falha', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.reject(new Error('falhou'))));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.erro?.message).toBe('falhou');
    expect(result.current.data).toBeNull();
  });

  it('refaz a chamada com recarregar', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useAsync(fn));
    await waitFor(() => expect(result.current.carregando).toBe(false));
    act(() => result.current.recarregar());
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
  });

  it('ignora a resposta antiga quando as dependências mudam', async () => {
    const resolvers: Array<(v: string) => void> = [];
    const { result, rerender } = renderHook(
      ({ chave }) => useAsync(() => new Promise<string>((r) => resolvers.push(r)), [chave]),
      { initialProps: { chave: 'a' } },
    );
    rerender({ chave: 'b' });
    act(() => resolvers[1]('nova'));
    act(() => resolvers[0]('antiga'));
    await waitFor(() => expect(result.current.data).toBe('nova'));
  });
});
