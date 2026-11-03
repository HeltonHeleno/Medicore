import { Minus, Plus } from 'lucide-react';
import type { Ref } from 'react';
import { t } from '../../../i18n/pt-BR';
import { cn } from '../../../utils/cn';
import { usePropsDoCampo } from './campoContexto';
import { classesControle } from './estilos';

interface CampoQuantidadeProps {
  /** Quantidade atual; `null` = campo vazio (ainda não informado). */
  valor: number | null;
  aoMudar: (valor: number | null) => void;
  aoSair?: () => void;
  min?: number;
  max?: number;
  /** Unidade mostrada ao lado (ex.: "comprimidos"). Vai também no rótulo do `Campo`. */
  unidade?: string;
  name?: string;
  desabilitado?: boolean;
  ref?: Ref<HTMLInputElement>;
}

const limitar = (n: number, min: number, max?: number) =>
  Math.max(min, max === undefined ? n : Math.min(max, n));

/**
 * Quantidade inteira (D11) com botões − e +. Use dentro de um `Campo`, que dá o rótulo
 * (com a unidade, ex.: "Quantidade (comprimidos)"), a dica e o erro. Setas ↑ ↓ do teclado
 * também mudam o valor (campo numérico nativo).
 */
export function CampoQuantidade({
  valor,
  aoMudar,
  aoSair,
  min = 1,
  max,
  unidade,
  name,
  desabilitado,
  ref,
}: CampoQuantidadeProps) {
  const acessiveis = usePropsDoCampo();
  const base = valor ?? 0;
  const botao =
    'inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-input bg-card text-text ' +
    'hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ' +
    'disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={botao}
        aria-label={t.formulario.diminuirQuantidade}
        aria-controls={acessiveis.id}
        disabled={desabilitado || base <= min}
        onClick={() => aoMudar(limitar(base - 1, min, max))}
      >
        <Minus size={16} aria-hidden />
      </button>
      <input
        {...acessiveis}
        ref={ref}
        name={name}
        type="number"
        inputMode="numeric"
        step={1}
        min={min}
        max={max}
        disabled={desabilitado}
        value={valor ?? ''}
        onChange={(e) => {
          const texto = e.target.value;
          if (texto === '') return aoMudar(null);
          const n = Math.trunc(Number(texto));
          if (Number.isFinite(n)) aoMudar(n);
        }}
        onBlur={aoSair}
        className={cn(classesControle, 'w-24 text-right tabular-nums')}
      />
      <button
        type="button"
        className={botao}
        aria-label={t.formulario.aumentarQuantidade}
        aria-controls={acessiveis.id}
        disabled={desabilitado || (max !== undefined && base >= max)}
        onClick={() => aoMudar(limitar(base + 1, min, max))}
      >
        <Plus size={16} aria-hidden />
      </button>
      {unidade && (
        <span aria-hidden className="text-[13.5px] text-text-muted">
          {unidade}
        </span>
      )}
    </div>
  );
}
