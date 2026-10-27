import { AlertCircle } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { t } from '../../../i18n/pt-BR';
import { cn } from '../../../utils/cn';
import { idDoCampo } from './estilos';

export interface OpcaoRadio<V extends string> {
  valor: V;
  rotulo: string;
  descricao?: ReactNode;
}

interface RadioGroupProps<V extends string> {
  legenda: string;
  nome: string;
  opcoes: readonly OpcaoRadio<V>[];
  valor: V | undefined;
  aoMudar: (valor: V) => void;
  aoSair?: () => void;
  obrigatorio?: boolean;
  dica?: ReactNode;
  erro?: string;
  horizontal?: boolean;
  desabilitado?: boolean;
  className?: string;
}

/** Grupo de opções exclusivas (`fieldset` + `legend`). Use com `Controller` do RHF. */
export function RadioGroup<V extends string>({
  legenda,
  nome,
  opcoes,
  valor,
  aoMudar,
  aoSair,
  obrigatorio,
  dica,
  erro,
  horizontal,
  desabilitado,
  className,
}: RadioGroupProps<V>) {
  const base = idDoCampo(nome);
  const automatico = useId();
  const idDica = `${base}-dica`;
  const idErro = `${base}-erro`;
  return (
    <fieldset
      id={base}
      tabIndex={-1}
      aria-describedby={[dica && idDica, erro && idErro].filter(Boolean).join(' ') || undefined}
      aria-invalid={erro ? true : undefined}
      className={cn('min-w-0 outline-none', className)}
      disabled={desabilitado}
    >
      <legend className="mb-2 text-[13.5px] font-medium text-text">
        {legenda}
        {obrigatorio && (
          <>
            <span aria-hidden className="ml-0.5 text-danger">
              *
            </span>
            <span className="sr-only">{` (${t.formulario.obrigatorio})`}</span>
          </>
        )}
      </legend>
      <div className={cn('flex gap-x-5 gap-y-2', horizontal ? 'flex-wrap' : 'flex-col')}>
        {opcoes.map((o, i) => {
          const id = `${automatico}-${i}`;
          return (
            <div key={o.valor} className="flex items-start gap-2.5">
              <input
                type="radio"
                id={id}
                name={nome}
                value={o.valor}
                checked={valor === o.valor}
                onChange={() => aoMudar(o.valor)}
                onBlur={aoSair}
                className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
              <label htmlFor={id} className="cursor-pointer text-[14px]">
                {o.rotulo}
                {o.descricao && (
                  <span className="block text-[12.5px] text-text-muted">{o.descricao}</span>
                )}
              </label>
            </div>
          );
        })}
      </div>
      {dica && (
        <p id={idDica} className="mt-1.5 text-[12.5px] text-text-muted">
          {dica}
        </p>
      )}
      {erro && (
        <p
          id={idErro}
          className="mt-1.5 flex items-start gap-1 text-[12.5px] font-medium text-danger"
        >
          <AlertCircle size={14} aria-hidden className="mt-px shrink-0" />
          {erro}
        </p>
      )}
    </fieldset>
  );
}
