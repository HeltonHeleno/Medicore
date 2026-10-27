/**
 * Formatação de documentos para exibição.
 * (A Fase 9 acrescenta as máscaras de digitação dos formulários.)
 */
import type { Crm } from '../types';
import { somenteDigitos } from './validacao';

/** "52998224725" → "529.982.247-25". */
export function mascararCpf(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/** R-P4: nas listas, só os 6 dígitos do meio aparecem: "***.982.247-**". */
export function ocultarCpf(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length !== 11) return '***.***.***-**';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/** "11987654321" → "(11) 98765-4321"; "1134567890" → "(11) 3456-7890". */
export function mascararTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d;
  const meio = d.length === 11 ? 5 : 4;
  const resto = d.slice(2);
  return resto.length > meio
    ? `(${d.slice(0, 2)}) ${resto.slice(0, meio)}-${resto.slice(meio)}`
    : `(${d.slice(0, 2)}) ${resto}`;
}

/** "01310100" → "01310-100". */
export function mascararCep(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** { numero: '123456', uf: 'SP' } → "CRM/SP 123456". */
export const formatarCrm = (crm: Crm): string => `CRM/${crm.uf} ${crm.numero}`;
