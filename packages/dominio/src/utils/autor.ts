import { to } from '../i18n/pt-BR/operacoes';

/** Quem fez a ação (R-X9, D31): o nome, como sempre, e o id do usuário quando há login. */
export interface Autor {
  usuarioId?: string;
  nome: string;
}

const DEMONSTRACAO: Autor = { nome: to.autorDemonstracao };
let fonte: () => Autor | undefined = () => undefined;

/**
 * Fase 28 (BL-02.7) — A API liga aqui o usuário da sessão da requisição. Sem sessão (o navegador
 * com os dados locais, os testes, as rotinas do servidor), vale o autor de demonstração.
 */
export function definirFonteDoAutor(fn: () => Autor | undefined): void {
  fonte = fn;
}

/** O autor completo da ação atual (D31). */
export const autorDaAcao = (): Autor => fonte() ?? DEMONSTRACAO;

/**
 * R-X9: o nome de quem fez a ação. Os registros guardam o nome (texto, legível no histórico);
 * desde a Fase 28, também o id do usuário (`autorIdAtual`). Os registros antigos ficam como estão.
 */
export const autorAtual = (): string => autorDaAcao().nome;

/** O id do usuário da sessão, ou `undefined` sem login (D31). */
export const autorIdAtual = (): string | undefined => autorDaAcao().usuarioId;

/** `{ autor, autorId }` para gravar num evento ou registro (o id só existe com login). */
export const autoria = (): { autor: string; autorId?: string } => {
  const a = autorDaAcao();
  return a.usuarioId ? { autor: a.nome, autorId: a.usuarioId } : { autor: a.nome };
};
