import { AlertCircle } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { t } from '../../../i18n/pt-BR';
import { cn } from '../../../utils/cn';
import { ContextoCampo } from './campoContexto';
import { idDoCampo } from './estilos';

interface CampoProps {
  rotulo: string;
  /** Nome no formulário: gera um id previsível (usado pelo `ResumoErros`). */
  nome?: string;
  obrigatorio?: boolean;
  dica?: ReactNode;
  erro?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Rótulo + controle + dica + erro, com as ligações ARIA prontas:
 * `aria-describedby` aponta para a dica e para o erro; `aria-invalid` e `aria-required`.
 */
export function Campo({ rotulo, nome, obrigatorio, dica, erro, className, children }: CampoProps) {
  const automatico = useId();
  const id = nome ? idDoCampo(nome) : automatico;
  const idDica = `${id}-dica`;
  const idErro = `${id}-erro`;
  const descricao = [dica && idDica, erro && idErro].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13.5px] font-medium text-text">
        {rotulo}
        {obrigatorio && (
          <>
            <span aria-hidden className="ml-0.5 text-danger">
              *
            </span>
            <span className="sr-only">{` (${t.formulario.obrigatorio})`}</span>
          </>
        )}
      </label>
      <ContextoCampo.Provider
        value={{
          id,
          'aria-describedby': descricao,
          'aria-invalid': erro ? true : undefined,
          'aria-required': obrigatorio || undefined,
        }}
      >
        {children}
      </ContextoCampo.Provider>
      {dica && (
        <p id={idDica} className="text-[12.5px] text-text-muted">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className="flex items-start gap-1 text-[12.5px] font-medium text-danger">
          <AlertCircle size={14} aria-hidden className="mt-px shrink-0" />
          {erro}
        </p>
      )}
    </div>
  );
}
