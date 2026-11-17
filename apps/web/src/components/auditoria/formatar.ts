/** Fase 29 — Como um valor da trilha (ou dos dados do titular) aparece na tela. */
import type { RegistroAuditoria } from '@medicore/dominio/contrato/auditoria';
import { tau } from '@medicore/dominio/i18n/pt-BR/auditoria';
import { formatarData, formatarDataHora } from '@medicore/dominio/utils/datas';

const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Texto curto para um valor qualquer (datas no formato brasileiro, listas e objetos resumidos). */
export function formatarValor(v: unknown): string {
  if (v === null || v === undefined || v === '') return tau.campos.vazio;
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  if (typeof v === 'string') {
    if (INSTANTE.test(v)) return formatarDataHora(v);
    if (DATA.test(v)) return formatarData(v);
    return v;
  }
  if (Array.isArray(v)) return v.length === 0 ? tau.campos.vazio : v.map(formatarValor).join('; ');
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== null && x !== undefined && x !== '')
      .map(([k, x]) => `${k}: ${formatarValor(x)}`)
      .join(', ');
  }
  return String(v);
}

/** Quem fez: a pessoa ou, sem login, a origem (rotina, banco). */
export const quemFez = (r: Pick<RegistroAuditoria, 'usuarioNome' | 'origem'>) =>
  r.usuarioNome ?? tau.origens[r.origem as keyof typeof tau.origens] ?? r.origem;

/** O que foi visto (leituras), pelos códigos do `detalhe` ("cadastro,cpf_completo" → "cadastro, CPF completo"). */
export function textoDoDetalhe(detalhe: string): string {
  const [codigos, ...resto] = detalhe.split(' (');
  const texto = codigos!
    .split(',')
    .map((c) => tau.detalhes[c.trim()] ?? c.trim())
    .join(', ');
  return resto.length ? `${texto} (${resto.join(' (')}` : texto;
}

export const nomeDaEntidade = (entidade: string) => tau.entidades[entidade] ?? entidade;

export interface MudancaCampo {
  campo: string;
  antes?: string;
  depois?: string;
  adicionados?: string;
}

/** `{ campo: { antes, depois } }` ou `{ campo: { adicionados } }` → linhas para a tela. */
export function mudancas(campos: Record<string, unknown> | undefined): MudancaCampo[] {
  return Object.entries(campos ?? {}).map(([campo, v]) => {
    const m = (v ?? {}) as { antes?: unknown; depois?: unknown; adicionados?: unknown };
    return 'adicionados' in m
      ? { campo, adicionados: formatarValor(m.adicionados) }
      : { campo, antes: formatarValor(m.antes), depois: formatarValor(m.depois) };
  });
}
