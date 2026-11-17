/**
 * Fase 27 — Peças da paginação sem o `zod`: o navegador no modo API usa no pacote inicial
 * (`services/api/paginas.ts`), e o contrato das listas (`contrato/lista.ts`) as reexporta.
 */

/** Máximo por página (R-API2). O Painel usa rotas de indicadores, não listas. */
export const POR_PAGINA_MAXIMO = 100;

/**
 * Página efetiva, como o `paginar` das telas: uma página além da última mostra a última
 * (a lista encolheu enquanto a pessoa navegava).
 */
export function paginaEfetiva(pagina: number, porPagina: number, total: number): number {
  const ultima = Math.max(1, Math.ceil(total / porPagina));
  return Math.min(Math.max(1, Math.floor(pagina)), ultima);
}
