import {
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type Ref,
} from 'react';
import { MASCARAS, posicaoAposDigitos, type TipoMascara } from '../../../utils/mascaras';
import { somenteDigitos } from '../../../utils/validacao';
import { Input } from './Input';

type InputMascaradoProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'ref'
> & {
  mascara: TipoMascara;
  /** Valor limpo (só dígitos). */
  value: string | undefined;
  /** Recebe o valor limpo (só dígitos). */
  onChange: (valorLimpo: string) => void;
  ref?: Ref<HTMLInputElement>;
};

/**
 * Mostra o valor com máscara e entrega ao formulário só os dígitos.
 * Mantém o cursor no lugar ao editar no meio do texto e aceita colar com ou sem máscara.
 * Use com `Controller` do react-hook-form.
 */
export function InputMascarado({ mascara, value, onChange, ref, ...resto }: InputMascaradoProps) {
  const { formatar, maxDigitos, exemplo } = MASCARAS[mascara];
  const elemento = useRef<HTMLInputElement | null>(null);
  const cursorPendente = useRef<number | null>(null);
  const limpoAtual = somenteDigitos(value ?? '').slice(0, maxDigitos);

  useLayoutEffect(() => {
    const el = elemento.current;
    if (cursorPendente.current === null || !el || document.activeElement !== el) return;
    el.setSelectionRange(cursorPendente.current, cursorPendente.current);
    cursorPendente.current = null;
  });

  const aoMudar = (e: ChangeEvent<HTMLInputElement>) => {
    const bruto = e.target.value;
    const cursor = e.target.selectionStart ?? bruto.length;
    let digitosAntes = somenteDigitos(bruto.slice(0, cursor)).length;
    let limpo = somenteDigitos(bruto);

    // Apagar um separador ("." "-" "(") com Backspace apaga o dígito anterior a ele.
    const tipo = (e.nativeEvent as InputEvent).inputType;
    if (limpo === limpoAtual && tipo === 'deleteContentBackward' && digitosAntes > 0) {
      limpo = limpo.slice(0, digitosAntes - 1) + limpo.slice(digitosAntes);
      digitosAntes -= 1;
    }

    limpo = limpo.slice(0, maxDigitos);
    cursorPendente.current = posicaoAposDigitos(
      formatar(limpo),
      Math.min(digitosAntes, limpo.length),
    );
    // O valor exibido é sempre derivado de `value`; força a máscara mesmo sem mudança de dígitos.
    e.target.value = formatar(limpo);
    onChange(limpo);
  };

  const ligarRef = (el: HTMLInputElement | null) => {
    elemento.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <Input
      ref={ligarRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={exemplo}
      value={formatar(limpoAtual)}
      onChange={aoMudar}
      {...resto}
    />
  );
}
