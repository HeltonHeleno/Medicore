import { ErroValidacao } from '@medicore/dominio/erros';
import { t } from '@medicore/dominio/i18n/pt-BR';

/** A mensagem do erro para mostrar no formulário de acesso. */
export function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroValidacao) return Object.values(e.campos)[0] ?? t.erros.inesperadoTitulo;
  return e instanceof Error && e.message ? e.message : t.erros.inesperadoTitulo;
}
