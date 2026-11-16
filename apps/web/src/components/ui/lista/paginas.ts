/** Páginas a mostrar: 1 … 4 5 6 … 12 (no máximo 7 posições). */
export function paginasVisiveis(atual: number, ultima: number): (number | '…')[] {
  if (ultima <= 7) return Array.from({ length: ultima }, (_, i) => i + 1);
  const inicio = Math.max(2, Math.min(atual - 1, ultima - 4));
  const fim = Math.min(ultima - 1, Math.max(atual + 1, 5));
  return [
    1,
    ...(inicio > 2 ? (['…'] as const) : []),
    ...Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i),
    ...(fim < ultima - 1 ? (['…'] as const) : []),
    ultima,
  ];
}
