import { act, renderHook, waitFor } from '@testing-library/react';
import { useRelogio } from '../hooks/useRelogio';
import { useFila, useMapaLeitos } from '../hooks/useDadosOperacoes';
import { repoLeitos } from '../services/colecoes-operacoes';
import { garantirSemeadura } from '../services/colecoes-operacoes';
import { resetar } from '../services/repositorio';

describe('useRelogio (RS-14)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T23:59:00-03:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('tique a cada 30 s e troca o "hoje" na virada da meia-noite (fuso do hospital)', () => {
    const { result } = renderHook(() => useRelogio());
    expect(result.current.hoje).toBe('2026-11-10');
    const primeiro = result.current.agora.getTime();
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.agora.getTime()).toBe(primeiro + 30_000);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.hoje).toBe('2026-11-11');
  });

  it('intervalo configurável e sem tique depois de desmontar', () => {
    const { result, unmount } = renderHook(() => useRelogio(5_000));
    const t0 = result.current.agora.getTime();
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(result.current.agora.getTime()).toBe(t0 + 5_000);
    unmount();
    expect(() => vi.advanceTimersByTime(60_000)).not.toThrow();
  });
});

describe('hooks de dados dos módulos', () => {
  beforeEach(() => {
    resetar();
    garantirSemeadura();
  });

  it('o mapa recarrega quando um leito muda, inclusive vindo de "outra aba"', async () => {
    const { result } = renderHook(() => useMapaLeitos({ status: 'bloqueado' }));
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    const livre = repoLeitos.todos().find((l) => l.status === 'livre')!;
    act(() => {
      repoLeitos.atualizar(livre.id, { status: 'bloqueado' });
    });
    await waitFor(() => expect(result.current.data).toHaveLength(2));

    // Outra aba: grava direto no storage e dispara o evento `storage`.
    const chave = 'medicore:leitos:v1';
    const itens = JSON.parse(localStorage.getItem(chave)!) as { id: string; status: string }[];
    const outro = itens.find((l) => l.status === 'livre')!;
    const novo = JSON.stringify(
      itens.map((l) => (l.id === outro.id ? { ...l, status: 'bloqueado' } : l)),
    );
    localStorage.setItem(chave, novo);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: chave, newValue: novo }));
    });
    await waitFor(() => expect(result.current.data).toHaveLength(3));
  });

  it('a fila acompanha as coleções da emergência', async () => {
    const { result } = renderHook(() => useFila());
    await waitFor(() => expect(result.current.data?.aguardandoTriagem.length).toBe(2));
  });
});
