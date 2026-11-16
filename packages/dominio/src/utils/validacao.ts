/**
 * Validadores de documentos e contatos brasileiros.
 * Todos aceitam o valor com ou sem máscara.
 */
import { UFS, type UF } from '../types';

export const somenteDigitos = (valor: string): string => valor.replace(/\D/g, '');

/** CPF: 11 dígitos, não pode ser sequência repetida, dígitos verificadores válidos. */
export function cpfValido(valor: string): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: string, pesoInicial: number) => {
    const soma = [...base].reduce((acc, d, i) => acc + Number(d) * (pesoInicial - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return (
    digito(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    digito(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
}

/** Telefone com DDD: fixo (10 dígitos) ou celular (11 dígitos começando com 9 após o DDD). */
export function telefoneValido(valor: string): boolean {
  const tel = somenteDigitos(valor);
  if (tel.length !== 10 && tel.length !== 11) return false;
  const ddd = Number(tel.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (tel.length === 11) return tel[2] === '9';
  return /[2-5]/.test(tel[2]); // fixo começa com 2–5
}

export const cepValido = (valor: string): boolean => somenteDigitos(valor).length === 8;

export const emailValido = (valor: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim());

export const ufValida = (valor: string): valor is UF => (UFS as readonly string[]).includes(valor);

/** CRM: 4 a 7 dígitos + UF válida. */
export const crmValido = (numero: string, uf: string): boolean =>
  /^\d{4,7}$/.test(somenteDigitos(numero)) &&
  somenteDigitos(numero) === numero.trim() &&
  ufValida(uf);
