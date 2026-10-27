import { ChevronDown } from 'lucide-react';
import type { Ref, SelectHTMLAttributes } from 'react';
import { t } from '../../../i18n/pt-BR';
import { cn } from '../../../utils/cn';
import { usePropsDoCampo } from './campoContexto';
import { classesControle } from './estilos';

export interface OpcaoSelect {
  valor: string;
  rotulo: string;
  desabilitada?: boolean;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  opcoes: readonly OpcaoSelect[];
  /** Primeira opção vazia ("Selecione…"). Use `false` para não mostrar. */
  vazia?: string | false;
  ref?: Ref<HTMLSelectElement>;
};

/** `<select>` nativo (melhor no celular e com leitores de tela), com o visual dos outros campos. */
export function Select({
  opcoes,
  vazia = t.formulario.selecione,
  className,
  ...resto
}: SelectProps) {
  const acessiveis = usePropsDoCampo();
  return (
    <div className="relative">
      <select
        className={cn(classesControle, 'appearance-none pr-9', className)}
        {...acessiveis}
        {...resto}
      >
        {vazia !== false && <option value="">{vazia}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor} disabled={o.desabilitada}>
            {o.rotulo}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-muted"
      />
    </div>
  );
}
