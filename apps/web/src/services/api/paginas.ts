/**
 * Fase 27 — Algumas telas pedem "todos" de uma vez (a lista de médicos de um filtro, os
 * medicamentos da dispensação: `porPagina` 200 ou 500). A API devolve no máximo 100 por página
 * (R-API2); aqui as páginas são buscadas e juntadas, com o mesmo resultado do modo navegador.
 */
import { POR_PAGINA_MAXIMO, paginaEfetiva } from '@medicore/dominio/utils/paginacao';
import { POR_PAGINA } from '@medicore/dominio/config/limites';
import type { Paginado } from '@medicore/dominio/types';

type Filtros = { pagina?: number; porPagina?: number };

export function emPaginas<F extends Filtros, T>(
  listar: (filtros: F) => Promise<Paginado<T>>,
): (filtros?: F) => Promise<Paginado<T>> {
  return async (filtros = {} as F) => {
    const porPagina = filtros.porPagina ?? POR_PAGINA;
    if (porPagina <= POR_PAGINA_MAXIMO) return listar(filtros);
    const pedida = filtros.pagina ?? 1;
    const itens: T[] = [];
    let total = 0;
    // Primeira página da API, para saber o total.
    for (let pagina = 1; ; pagina++) {
      const r = await listar({ ...filtros, pagina, porPagina: POR_PAGINA_MAXIMO });
      total = r.total;
      itens.push(...r.itens);
      if (r.itens.length < POR_PAGINA_MAXIMO || itens.length >= total) break;
    }
    const efetiva = paginaEfetiva(pedida, porPagina, total);
    const inicio = (efetiva - 1) * porPagina;
    return { itens: itens.slice(inicio, inicio + porPagina), total, pagina: efetiva, porPagina };
  };
}
