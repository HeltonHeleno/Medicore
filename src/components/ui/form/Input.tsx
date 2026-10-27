import type { InputHTMLAttributes, Ref } from 'react';
import { cn } from '../../../utils/cn';
import { usePropsDoCampo } from './campoContexto';
import { classesControle, classesSomenteLeitura } from './estilos';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> };

/** Campo de texto. Dentro de um `Campo`, recebe id e atributos ARIA automaticamente. */
export function Input({ className, ...resto }: InputProps) {
  const acessiveis = usePropsDoCampo();
  return (
    <input
      className={cn(classesControle, classesSomenteLeitura, className)}
      {...acessiveis}
      {...resto}
    />
  );
}
