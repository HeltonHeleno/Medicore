import { AlertTriangle, CheckCircle2, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { t } from '../../../i18n/pt-BR';
import { cn } from '../../../utils/cn';
import { ContextoToast, type ApiToast, type OpcoesToast, type TipoToast } from './contextos';

interface Toast extends OpcoesToast {
  id: string;
  tipo: TipoToast;
  mensagem: string;
}

const DURACAO_PADRAO = 5000;
const MAXIMO = 4;

const estilos: Record<TipoToast, { icone: typeof CheckCircle2; classe: string }> = {
  sucesso: { icone: CheckCircle2, classe: 'text-primary' },
  erro: { icone: XCircle, classe: 'text-danger' },
  aviso: { icone: AlertTriangle, classe: 'text-warning' },
};

function ItemToast({ toast, aoFechar }: { toast: Toast; aoFechar: () => void }) {
  const { icone: Icone, classe } = estilos[toast.tipo];
  const [pausado, setPausado] = useState(false);
  const duracao = toast.duracao ?? (toast.tipo === 'erro' ? null : DURACAO_PADRAO);
  const aoFecharRef = useRef(aoFechar);
  useEffect(() => {
    aoFecharRef.current = aoFechar;
  });

  // Some sozinho (exceto erros). Passar o mouse ou focar pausa a contagem.
  useEffect(() => {
    if (duracao === null || pausado) return;
    const id = setTimeout(() => aoFecharRef.current(), duracao);
    return () => clearTimeout(id);
  }, [duracao, pausado]);

  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3.5 text-text shadow-lg"
    >
      <Icone size={19} aria-hidden className={cn('mt-0.5 shrink-0', classe)} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px]">{toast.mensagem}</p>
        {toast.acao && (
          <button
            type="button"
            onClick={() => {
              toast.acao!.aoClicar();
              aoFechar();
            }}
            className="mt-1 rounded text-[13.5px] font-semibold text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {toast.acao.rotulo}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label={t.toast.fechar}
        onClick={aoFechar}
        className="-m-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}

/**
 * Notificações curtas no canto da tela. Sucesso e aviso são anunciados com educação
 * (`role="status"`); erros, de imediato (`role="alert"`) e ficam até serem fechados.
 * As regiões vivas existem desde o início, para o leitor de tela anunciar o que entra nelas.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const contador = useRef(0);

  const fechar = useCallback((id: string) => setToasts((l) => l.filter((x) => x.id !== id)), []);

  const api = useMemo<ApiToast>(() => {
    const adicionar =
      (tipo: TipoToast) =>
      (mensagem: string, opcoes: OpcoesToast = {}) => {
        const id = `toast-${++contador.current}`;
        setToasts((l) => [...l, { id, tipo, mensagem, ...opcoes }].slice(-MAXIMO));
        return id;
      };
    return {
      sucesso: adicionar('sucesso'),
      erro: adicionar('erro'),
      aviso: adicionar('aviso'),
      fechar,
    };
  }, [fechar]);

  const educados = toasts.filter((x) => x.tipo !== 'erro');
  const urgentes = toasts.filter((x) => x.tipo === 'erro');

  return (
    <ContextoToast.Provider value={api}>
      {children}
      <section
        aria-label={t.toast.regiao}
        className="pointer-events-none fixed right-4 bottom-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:w-96"
      >
        <div role="alert" className="flex w-full flex-col gap-2">
          {urgentes.map((x) => (
            <ItemToast key={x.id} toast={x} aoFechar={() => fechar(x.id)} />
          ))}
        </div>
        <div role="status" className="flex w-full flex-col gap-2">
          {educados.map((x) => (
            <ItemToast key={x.id} toast={x} aoFechar={() => fechar(x.id)} />
          ))}
        </div>
      </section>
    </ContextoToast.Provider>
  );
}
