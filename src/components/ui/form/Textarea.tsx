import { useEffect, useRef, useState, type Ref, type TextareaHTMLAttributes } from 'react';
import { t } from '../../../i18n/pt-BR';
import { cn } from '../../../utils/cn';
import { usePropsDoCampo } from './campoContexto';
import { classesControle, classesSomenteLeitura } from './estilos';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: Ref<HTMLTextAreaElement>;
};

/** Texto longo com contador ("120/500") quando há `maxLength`. Funciona com `register` do RHF. */
export function Textarea({ className, maxLength, onChange, ref, ...resto }: TextareaProps) {
  const acessiveis = usePropsDoCampo();
  const interno = useRef<HTMLTextAreaElement | null>(null);
  const [tamanho, setTamanho] = useState(0);
  const idContador = acessiveis.id ? `${acessiveis.id}-contador` : undefined;

  // Valor inicial vindo do RHF (defaultValues) ou de `value`.
  useEffect(() => {
    setTamanho(interno.current?.value.length ?? 0);
  }, [resto.value]);

  const ligarRef = (el: HTMLTextAreaElement | null) => {
    interno.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <div className="relative">
      <textarea
        ref={ligarRef}
        rows={4}
        maxLength={maxLength}
        className={cn(classesControle, classesSomenteLeitura, 'min-h-24 resize-y', className)}
        {...acessiveis}
        aria-describedby={
          [acessiveis['aria-describedby'], maxLength && idContador].filter(Boolean).join(' ') ||
          undefined
        }
        onChange={(e) => {
          setTamanho(e.target.value.length);
          onChange?.(e);
        }}
        {...resto}
      />
      {maxLength !== undefined && (
        <p
          id={idContador}
          className={cn(
            'mt-1 text-right text-[12px] tabular-nums',
            tamanho >= maxLength ? 'text-danger' : 'text-text-muted',
          )}
        >
          <span aria-hidden>{t.formulario.contador(tamanho, maxLength)}</span>
          <span className="sr-only">{t.formulario.contadorLeitor(tamanho, maxLength)}</span>
        </p>
      )}
    </div>
  );
}
