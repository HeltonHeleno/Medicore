/**
 * Foco nos campos do formulário (resumo de erros e 1º campo inválido). Separado de
 * `estilos.ts`, que vai no pacote inicial, porque só os formulários (sob demanda) usam.
 */
import { idDoCampo } from './estilos';

/** Elemento do campo: pelo id do `Campo` ou, em último caso, pelo atributo `name`. */
const elementoDoCampo = (campo: string) =>
  document.getElementById(idDoCampo(campo)) ??
  document.querySelector<HTMLElement>(`[name="${CSS.escape(campo)}"]`);

/** Leva o foco ao campo pelo id do `Campo` ou, em último caso, pelo atributo `name`. */
export function focarCampo(campo: string) {
  let el = elementoDoCampo(campo);
  // Grupo (radiogroup, fieldset): o foco vai para a opção marcada ou para a primeira.
  if (el && el.tabIndex < 0 && !el.matches('input, select, textarea, button')) {
    el =
      el.querySelector<HTMLElement>('input:checked, [aria-checked="true"]') ??
      el.querySelector<HTMLElement>(
        'input:not([disabled]), select, textarea, button:not([disabled]), [tabindex="0"]',
      ) ??
      el;
  }
  el?.focus();
  el?.scrollIntoView?.({ block: 'center' });
}

/**
 * Ordena os itens pela posição do campo na tela (21.2.3): a ordem dos erros do zod segue o
 * esquema, que nem sempre é a ordem visual. Campos que não estão na tela ficam no fim.
 */
export function naOrdemDaTela<T extends { campo: string }>(itens: T[]): T[] {
  if (typeof document === 'undefined') return itens;
  const posicao = new Map(itens.map((i) => [i.campo, elementoDoCampo(i.campo)]));
  return [...itens].sort((a, b) => {
    const ea = posicao.get(a.campo);
    const eb = posicao.get(b.campo);
    if (!ea || !eb) return ea ? -1 : eb ? 1 : 0;
    if (ea === eb) return 0;
    return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
}
