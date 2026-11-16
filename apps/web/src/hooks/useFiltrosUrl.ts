import { useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

type Valor = string | number;

/**
 * Busca, filtros, ordenação e página na query string (M14): a URL pode ser
 * compartilhada e o "Voltar" do navegador restaura a lista como estava.
 *
 * - Os tipos vêm dos `padroes` (número continua número).
 * - Valores iguais ao padrão não aparecem na URL.
 * - Mudar qualquer filtro volta para a página 1.
 */
export function useFiltrosUrl<F extends Record<string, Valor>>(padroes: F) {
  const [params, setParams] = useSearchParams();

  const filtros = useMemo(() => {
    const lido = { ...padroes };
    for (const chave of Object.keys(padroes) as (keyof F & string)[]) {
      const bruto = params.get(chave);
      if (bruto === null) continue;
      if (typeof padroes[chave] === 'number') {
        const n = Number(bruto);
        if (Number.isFinite(n)) lido[chave] = n as F[typeof chave];
      } else {
        lido[chave] = bruto as F[typeof chave];
      }
    }
    return lido;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const definir = useCallback(
    (mudancas: Partial<F>) => {
      setParams(
        (atuais) => {
          const proximos = new URLSearchParams(atuais);
          const mudouFiltro = Object.keys(mudancas).some((k) => k !== 'pagina');
          const tudo: Partial<F> =
            mudouFiltro && 'pagina' in padroes
              ? ({ pagina: undefined, ...mudancas } as Partial<F>)
              : mudancas;
          for (const [chave, valor] of Object.entries(tudo)) {
            if (valor === undefined || valor === '' || valor === padroes[chave])
              proximos.delete(chave);
            else proximos.set(chave, String(valor));
          }
          return proximos;
        },
        { replace: true },
      );
    },
    [padroes, setParams],
  );

  const limpar = useCallback(
    () => setParams(new URLSearchParams(), { replace: true }),
    [setParams],
  );

  const haFiltros = Object.keys(padroes).some(
    (k) => k !== 'pagina' && k !== 'ordenarPor' && k !== 'ordem' && filtros[k] !== padroes[k],
  );

  return { filtros, definir, limpar, haFiltros };
}

/** Estado para passar no `<Link state>` ao abrir um detalhe: guarda a URL da lista. */
export function useOrigem(): { de: string } {
  const { pathname, search } = useLocation();
  return { de: pathname + search };
}

/** Para onde o "Voltar" do detalhe deve ir: a lista como estava, ou o caminho padrão. */
export function useVoltarPara(padrao: string): string {
  const { state } = useLocation();
  const de = (state as { de?: unknown } | null)?.de;
  return typeof de === 'string' && de.startsWith('/') ? de : padrao;
}
