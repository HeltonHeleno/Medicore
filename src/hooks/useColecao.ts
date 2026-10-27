import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { assinar } from '../services/repositorio';
import type { EstadoAsync } from './useAsync';

export interface EstadoColecao<T> extends EstadoAsync<T> {
  /** Recarregando em segundo plano depois de uma alteração (os dados antigos continuam visíveis). */
  atualizando: boolean;
}

/**
 * Como `useAsync`, mas também recarrega quando o repositório avisa que uma das
 * `colecoes` mudou — nesta aba ou em outra (M6). Sem `colecoes`, qualquer mudança recarrega.
 *
 * - O primeiro carregamento liga `carregando`; os seguintes só ligam `atualizando`,
 *   para a tela não piscar o esqueleto a cada gravação.
 * - Respostas de chamadas antigas são ignoradas.
 */
export function useColecao<T>(
  fn: () => Promise<T>,
  deps: DependencyList = [],
  colecoes?: readonly string[],
): EstadoColecao<T> {
  const [data, setData] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<Error | null>(null);
  const [rodada, setRodada] = useState(0);
  const temDados = useRef(false);
  const chaveColecoes = colecoes?.join('|');

  // Recarga por notificação do repositório.
  useEffect(() => {
    const filtro = chaveColecoes?.split('|');
    return assinar((alteradas) => {
      if (!filtro || filtro.some((c) => alteradas.has(c))) setRodada((n) => n + 1);
    });
  }, [chaveColecoes]);

  // Mudança de parâmetros é um carregamento "novo" (mostra o esqueleto de novo).
  useEffect(() => {
    temDados.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    let ativo = true;
    if (temDados.current) setAtualizando(true);
    else setCarregando(true);
    setErro(null);

    fn().then(
      (resultado) => {
        if (!ativo) return;
        temDados.current = true;
        setData(resultado);
        setCarregando(false);
        setAtualizando(false);
      },
      (e: unknown) => {
        if (!ativo) return;
        setErro(e instanceof Error ? e : new Error(String(e)));
        setCarregando(false);
        setAtualizando(false);
      },
    );
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, rodada]);

  const recarregar = useCallback(() => setRodada((n) => n + 1), []);

  return { data, carregando, atualizando, erro, recarregar };
}
