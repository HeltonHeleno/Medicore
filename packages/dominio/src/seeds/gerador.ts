/**
 * Gerador determinístico para os dados de exemplo: a mesma semente produz sempre
 * os mesmos CPFs, CRMs e sorteios, então os testes e as capturas são estáveis.
 * Todos os dados são fictícios (RS-01).
 */

/** PRNG mulberry32: devolve números em [0, 1). */
export function criarAleatorio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export const inteiro = (rand: () => number, min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));

export const sortear = <T>(rand: () => number, lista: readonly T[]): T =>
  lista[Math.floor(rand() * lista.length)];

const digitos = (rand: () => number, n: number) =>
  Array.from({ length: n }, () => inteiro(rand, 0, 9)).join('');

/** CPF com dígitos verificadores corretos (e sem todos os dígitos iguais). */
export function gerarCpfValido(rand: () => number): string {
  let base: string;
  do base = digitos(rand, 9);
  while (/^(\d)\1+$/.test(base));
  const dv = (parcial: string) => {
    const soma = [...parcial].reduce((s, d, i) => s + Number(d) * (parcial.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = dv(base);
  const d2 = dv(base + d1);
  return `${base}${d1}${d2}`;
}

/** Número de CRM com 6 dígitos (sem zero à esquerda). */
export const gerarCrm = (rand: () => number): string => `${inteiro(rand, 1, 9)}${digitos(rand, 5)}`;

/** Celular com DDD: "11" + "9" + 8 dígitos. */
export const gerarCelular = (rand: () => number, ddd = '11'): string =>
  `${ddd}9${inteiro(rand, 6, 9)}${digitos(rand, 7)}`;

/** Fixo com DDD: "11" + 2–5 + 7 dígitos. */
export const gerarFixo = (rand: () => number, ddd = '11'): string =>
  `${ddd}${inteiro(rand, 2, 5)}${digitos(rand, 7)}`;

/** Gera valores únicos chamando `gerar` até não repetir. */
export function unicos(gerar: () => string): () => string {
  const usados = new Set<string>();
  return () => {
    let v: string;
    do v = gerar();
    while (usados.has(v));
    usados.add(v);
    return v;
  };
}
