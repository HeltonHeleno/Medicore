/** Fase 28 — Senha nova (convite e redefinição). */
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';

export interface SenhaNova {
  senha: string;
  confirmacao: string;
}

/** Erros que dá para conferir antes de enviar. */
export function problemaLocal({ senha, confirmacao }: SenhaNova): string | undefined {
  if (senha.length < 12) return ta.senha.curta;
  if (senha !== confirmacao) return ta.senha.diferentes;
  return undefined;
}
