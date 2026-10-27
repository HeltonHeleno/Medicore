import { Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { t } from '../../../i18n/pt-BR';
import { cn } from '../../../utils/cn';
import { Button } from '../Button';
import { classesControle } from '../form/estilos';
import { Select } from '../form/Select';

interface BarraFiltrosProps {
  busca: string;
  /** Chamado 300 ms depois que o usuário para de digitar (ou ao apertar Enter). */
  aoBuscar: (termo: string) => void;
  rotuloBusca: string;
  placeholder?: string;
  /** Filtros extras (selects), na mesma linha. */
  children?: ReactNode;
  /** Há algum filtro ou busca ativo? Mostra "Limpar filtros". */
  filtrosAtivos?: boolean;
  aoLimpar?: () => void;
  atraso?: number;
  className?: string;
}

/** Busca com atraso + filtros em uma linha (quebra no celular) + "Limpar filtros". */
export function BarraFiltros({
  busca,
  aoBuscar,
  rotuloBusca,
  placeholder,
  children,
  filtrosAtivos,
  aoLimpar,
  atraso = 300,
  className,
}: BarraFiltrosProps) {
  const id = useId();
  const [texto, setTexto] = useState(busca);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Busca trocada de fora (ex.: "Limpar filtros", voltar no navegador).
  const [buscaAnterior, setBuscaAnterior] = useState(busca);
  if (busca !== buscaAnterior) {
    setBuscaAnterior(busca);
    setTexto(busca);
  }

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const agendar = (valor: string) => {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => aoBuscar(valor.trim()), atraso);
  };

  return (
    <div
      role="search"
      aria-label={rotuloBusca}
      className={cn('flex flex-wrap items-end gap-3', className)}
    >
      <div className="relative min-w-[220px] flex-1 basis-64">
        <label htmlFor={id} className="sr-only">
          {rotuloBusca}
        </label>
        <Search
          size={17}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
        />
        <input
          id={id}
          type="search"
          value={texto}
          placeholder={placeholder ?? rotuloBusca}
          autoComplete="off"
          className={cn(classesControle, 'pl-9')}
          onChange={(e) => {
            setTexto(e.target.value);
            agendar(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              clearTimeout(temporizador.current);
              aoBuscar(texto.trim());
            }
          }}
        />
      </div>
      {children}
      {filtrosAtivos && aoLimpar && (
        <Button
          variante="contorno"
          tamanho="sm"
          className="h-[42px]"
          iconeEsquerda={<X size={15} />}
          onClick={() => {
            clearTimeout(temporizador.current);
            aoLimpar();
          }}
        >
          {t.lista.limparFiltros}
        </Button>
      )}
    </div>
  );
}

/** Select compacto para a barra de filtros, com rótulo visível. */
export function FiltroSelect({
  rotulo,
  valor,
  aoMudar,
  opcoes,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  opcoes: readonly { valor: string; rotulo: string }[];
}) {
  const id = useId();
  return (
    <div className="flex min-w-[160px] flex-col gap-1">
      <label htmlFor={id} className="text-[12.5px] text-text-muted">
        {rotulo}
      </label>
      <Select
        id={id}
        value={valor}
        vazia={false}
        onChange={(e) => aoMudar(e.target.value)}
        opcoes={opcoes}
      />
    </div>
  );
}
