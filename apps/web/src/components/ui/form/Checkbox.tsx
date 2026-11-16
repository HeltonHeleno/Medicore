import { AlertCircle } from 'lucide-react';
import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from '../../../utils/cn';
import { idDoCampo } from './estilos';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  rotulo: ReactNode;
  descricao?: ReactNode;
  erro?: string;
  ref?: Ref<HTMLInputElement>;
};

/** Caixa de seleção com rótulo clicável, descrição e erro opcionais. */
export function Checkbox({
  rotulo,
  descricao,
  erro,
  className,
  id,
  name,
  ...resto
}: CheckboxProps) {
  const automatico = useId();
  const idFinal = id ?? (name ? idDoCampo(name) : automatico);
  const idDesc = `${idFinal}-desc`;
  const idErro = `${idFinal}-erro`;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          id={idFinal}
          name={name}
          aria-invalid={erro ? true : undefined}
          aria-describedby={
            [descricao && idDesc, erro && idErro].filter(Boolean).join(' ') || undefined
          }
          className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
          {...resto}
        />
        <div className="min-w-0">
          <label htmlFor={idFinal} className="cursor-pointer text-[14px] text-text">
            {rotulo}
          </label>
          {descricao && (
            <p id={idDesc} className="text-[12.5px] text-text-muted">
              {descricao}
            </p>
          )}
        </div>
      </div>
      {erro && (
        <p id={idErro} className="flex items-start gap-1 text-[12.5px] font-medium text-danger">
          <AlertCircle size={14} aria-hidden className="mt-px shrink-0" />
          {erro}
        </p>
      )}
    </div>
  );
}
