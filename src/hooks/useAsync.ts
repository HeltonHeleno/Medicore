import { useCallback, useEffect, useState, type DependencyList } from 'react';

export interface EstadoAsync<T> {
  data: T | null;
  carregando: boolean;
  erro: Error | null;
  /** Refaz a chamada (usado pelo botão "Tentar novamente"). */
  recarregar: () => void;
}

/**
 * Executa uma função assíncrona e expõe dados, carregamento e erro.
 * Refaz a chamada quando `deps` mudam e ignora respostas de chamadas
 * antigas (evita condição de corrida ao trocar de período, por exemplo).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList = []): EstadoAsync<T> {
  const [data, setData] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);

    fn().then(
      (resultado) => {
        if (!ativo) return;
        setData(resultado);
        setCarregando(false);
      },
      (e: unknown) => {
        if (!ativo) return;
        setErro(e instanceof Error ? e : new Error(String(e)));
        setData(null);
        setCarregando(false);
      },
    );

    return () => {
      ativo = false;
    };
    // `fn` costuma ser uma função inline; quem controla a recarga são `deps` e `tentativa`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tentativa]);

  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);

  return { data, carregando, erro, recarregar };
}
