/** Classes compartilhadas pelos controles de formulário (Input, Select, Textarea, Combobox). */
export const classesControle =
  'w-full rounded-lg border border-border-input bg-card px-3 py-2.5 text-[14px] text-text ' +
  'placeholder:text-text-muted transition-colors ' +
  'focus:border-primary focus:ring-2 focus:ring-primary/40 focus:outline-none ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/30 ' +
  'disabled:cursor-not-allowed disabled:bg-bg disabled:opacity-70';

/** Somente leitura (só para input/textarea: `<select>` também casa com `:read-only`). */
export const classesSomenteLeitura = 'read-only:bg-bg read-only:focus:ring-0';

/** Id previsível de um campo a partir do nome no formulário ("endereco.cep" → "campo-endereco-cep"). */
export const idDoCampo = (nome: string) => `campo-${nome.replace(/[^\w-]/g, '-')}`;

/** Leva o foco ao campo pelo id do `Campo` ou, em último caso, pelo atributo `name`. */
export function focarCampo(campo: string) {
  const el =
    document.getElementById(idDoCampo(campo)) ??
    document.querySelector<HTMLElement>(`[name="${CSS.escape(campo)}"]`);
  el?.focus();
  el?.scrollIntoView?.({ block: 'center' });
}
