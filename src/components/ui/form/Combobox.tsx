import { Loader2, X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { t } from '../../../i18n/pt-BR';
import { cn } from '../../../utils/cn';
import { usePropsDoCampo } from './campoContexto';
import { classesControle } from './estilos';

interface ComboboxProps<T> {
  /** Busca assíncrona (ex.: pacientes ativos pelo nome ou CPF). */
  buscar: (termo: string) => Promise<T[]>;
  valor: T | null;
  aoMudar: (valor: T | null) => void;
  aoSair?: () => void;
  /** Texto mostrado no campo quando há um item selecionado. */
  paraTexto: (item: T) => string;
  chave: (item: T) => string;
  /** Conteúdo de cada opção (ex.: nome + CPF mascarado). Padrão: `paraTexto`. */
  renderizarOpcao?: (item: T) => ReactNode;
  placeholder?: string;
  desabilitado?: boolean;
  /** Atraso da busca em ms (250 por padrão). */
  atraso?: number;
  /** Busca já ao focar, com termo vazio (lista inicial). */
  buscarAoFocar?: boolean;
  name?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Campo de busca com lista de sugestões, no padrão ARIA 1.2 "combobox com listbox".
 * Teclado: ↓/↑ navegam, Enter seleciona, Esc fecha (ou limpa, se já fechado), Tab sai.
 * O foco fica sempre no campo; a opção ativa é indicada por `aria-activedescendant`.
 */
export function Combobox<T>({
  buscar,
  valor,
  aoMudar,
  aoSair,
  paraTexto,
  chave,
  renderizarOpcao,
  placeholder = t.formulario.digiteParaBuscar,
  desabilitado,
  atraso = 250,
  buscarAoFocar,
  name,
  ref,
}: ComboboxProps<T>) {
  const acessiveis = usePropsDoCampo();
  const idBase = useId();
  const idLista = `${idBase}-lista`;
  const idOpcao = (i: number) => `${idBase}-opcao-${i}`;

  const [texto, setTexto] = useState(valor ? paraTexto(valor) : '');
  const [aberto, setAberto] = useState(false);
  const [opcoes, setOpcoes] = useState<T[]>([]);
  const [ativa, setAtiva] = useState(-1);
  const [buscando, setBuscando] = useState(false);
  const [anuncio, setAnuncio] = useState('');
  const requisicao = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  const listaRef = useRef<HTMLUListElement>(null);

  // Valor trocado de fora (ex.: reset do formulário) atualiza o texto.
  const chaveValor = valor ? chave(valor) : null;
  const [chaveAnterior, setChaveAnterior] = useState(chaveValor);
  if (chaveValor !== chaveAnterior) {
    setChaveAnterior(chaveValor);
    setTexto(valor ? paraTexto(valor) : '');
  }

  useEffect(() => () => clearTimeout(temporizador.current), []);

  // Mantém a opção ativa visível ao navegar pelo teclado.
  useEffect(() => {
    if (ativa < 0) return;
    document.getElementById(idOpcao(ativa))?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativa]);

  function pesquisar(termo: string, imediato = false) {
    clearTimeout(temporizador.current);
    const id = ++requisicao.current;
    setBuscando(true);
    setAberto(true);
    const executar = () =>
      buscar(termo).then(
        (resultado) => {
          if (id !== requisicao.current) return; // resposta antiga
          setOpcoes(resultado);
          setAtiva(resultado.length > 0 ? 0 : -1);
          setBuscando(false);
          setAnuncio(t.formulario.resultados(resultado.length));
        },
        () => {
          if (id !== requisicao.current) return;
          setOpcoes([]);
          setBuscando(false);
          setAnuncio(t.erro.carregar);
        },
      );
    if (imediato || atraso === 0) void executar();
    else temporizador.current = setTimeout(executar, atraso);
  }

  function fechar() {
    clearTimeout(temporizador.current);
    requisicao.current++;
    setAberto(false);
    setBuscando(false);
    setAtiva(-1);
  }

  function selecionar(item: T) {
    aoMudar(item);
    setTexto(paraTexto(item));
    fechar();
  }

  function limpar() {
    aoMudar(null);
    setTexto('');
    fechar();
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!aberto) pesquisar(texto, true);
        else if (opcoes.length) setAtiva((a) => (a + 1) % opcoes.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (aberto && opcoes.length) setAtiva((a) => (a - 1 + opcoes.length) % opcoes.length);
        break;
      case 'Home':
      case 'End':
        if (aberto && opcoes.length) {
          e.preventDefault();
          setAtiva(e.key === 'Home' ? 0 : opcoes.length - 1);
        }
        break;
      case 'Enter':
        if (aberto && ativa >= 0 && opcoes[ativa]) {
          e.preventDefault();
          selecionar(opcoes[ativa]);
        }
        break;
      case 'Escape':
        if (aberto) {
          e.preventDefault();
          fechar();
          setTexto(valor ? paraTexto(valor) : '');
        } else if (texto) {
          e.preventDefault();
          limpar();
        }
        break;
    }
  }

  function aoPerderFoco() {
    // O clique numa opção usa onMouseDown + preventDefault, então o foco não sai do campo.
    if (aberto) fechar();
    if (!texto.trim()) {
      if (valor) aoMudar(null);
    } else {
      setTexto(valor ? paraTexto(valor) : '');
    }
    aoSair?.();
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        role="combobox"
        name={name}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={aberto && opcoes.length > 0}
        aria-controls={idLista}
        aria-activedescendant={aberto && ativa >= 0 ? idOpcao(ativa) : undefined}
        placeholder={placeholder}
        disabled={desabilitado}
        value={texto}
        className={cn(classesControle, 'pr-16')}
        {...acessiveis}
        onChange={(e) => {
          setTexto(e.target.value);
          pesquisar(e.target.value);
        }}
        onFocus={() => {
          if (buscarAoFocar && !valor) pesquisar(texto, true);
        }}
        onKeyDown={aoTeclar}
        onBlur={aoPerderFoco}
      />
      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
        {buscando && <Loader2 size={16} aria-hidden className="animate-spin text-text-muted" />}
        {valor && !desabilitado && (
          <button
            type="button"
            aria-label={t.formulario.limparSelecao}
            onClick={limpar}
            className="inline-flex size-7 items-center justify-center rounded-md text-text-muted hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </div>

      {/* Sem opções, a mensagem fica fora do listbox (um listbox só pode conter opções). */}
      {aberto && opcoes.length === 0 && (
        <p className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-card px-4 py-2.5 text-[13.5px] text-text-muted shadow-lg">
          {buscando ? t.formulario.buscando : t.formulario.nenhumResultado}
        </p>
      )}
      <ul
        ref={listaRef}
        id={idLista}
        role="listbox"
        aria-label={t.formulario.resultados(opcoes.length)}
        hidden={!aberto || opcoes.length === 0}
        className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg"
      >
        {opcoes.map((item, i) => {
          const selecionada = valor !== null && chave(item) === chave(valor);
          return (
            <li
              key={chave(item)}
              id={idOpcao(i)}
              role="option"
              aria-selected={selecionada}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selecionar(item)}
              onMouseMove={() => setAtiva(i)}
              className={cn(
                'cursor-pointer rounded-md px-3 py-2 text-[14px]',
                i === ativa && 'bg-primary-light/60 text-text',
                selecionada && 'font-semibold',
              )}
            >
              {renderizarOpcao ? renderizarOpcao(item) : paraTexto(item)}
            </li>
          );
        })}
      </ul>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {anuncio}
      </span>
    </div>
  );
}
