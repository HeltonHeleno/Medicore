/**
 * A4: busca, ordenação e paginação das listas.
 */
import type { Ordem, Paginado } from '../types';
import { somenteDigitos } from './validacao';

/** Sem acentos, minúsculas, espaços simples: "  João  SILVA " → "joao silva". */
export const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export interface CamposBusca<T> {
  /** Textos onde procurar palavras (nome, nome social…). */
  textos: (item: T) => (string | undefined)[];
  /** Documentos onde procurar dígitos (CPF, telefone, CRM). */
  digitos?: (item: T) => (string | undefined)[];
}

/**
 * - Termo com 3+ dígitos e nenhuma letra → compara só os dígitos (CPF/telefone com ou sem máscara).
 * - Senão → cada palavra do termo precisa aparecer em algum texto, em qualquer ordem.
 */
export function filtrarPorTermo<T>(
  itens: readonly T[],
  termo: string | undefined,
  campos: CamposBusca<T>,
): T[] {
  const bruto = (termo ?? '').trim();
  if (!bruto) return [...itens];

  const digitosTermo = somenteDigitos(bruto);
  const soNumeros = digitosTermo.length >= 3 && !/\p{L}/u.test(bruto);
  if (soNumeros && campos.digitos) {
    return itens.filter((i) =>
      campos.digitos!(i).some((d) => d && somenteDigitos(d).includes(digitosTermo)),
    );
  }

  const palavras = normalizar(bruto).split(' ');
  return itens.filter((i) => {
    const alvo = normalizar(campos.textos(i).filter(Boolean).join(' '));
    return palavras.every((p) => alvo.includes(p));
  });
}

const colador = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

/** Ordenação estável (desempate por `id`); textos comparados sem diferenciar acentos/maiúsculas. */
export function ordenar<T extends { id: string }>(
  itens: readonly T[],
  chave: (item: T) => string | number | undefined,
  ordem: Ordem = 'asc',
): T[] {
  const fator = ordem === 'asc' ? 1 : -1;
  return [...itens].sort((a, b) => {
    const va = chave(a);
    const vb = chave(b);
    let cmp: number;
    if (va === undefined && vb === undefined) cmp = 0;
    else if (va === undefined)
      return 1; // vazios sempre no fim
    else if (vb === undefined) return -1;
    else if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
    else cmp = colador.compare(String(va), String(vb));
    return cmp !== 0 ? cmp * fator : a.id.localeCompare(b.id);
  });
}

/** Paginação; página pedida além do fim volta para a última página válida. */
export function paginar<T>(itens: readonly T[], pagina = 1, porPagina = 10): Paginado<T> {
  const total = itens.length;
  const ultima = Math.max(1, Math.ceil(total / porPagina));
  const atual = Math.min(Math.max(1, Math.floor(pagina)), ultima);
  return {
    itens: itens.slice((atual - 1) * porPagina, atual * porPagina),
    total,
    pagina: atual,
    porPagina,
  };
}
