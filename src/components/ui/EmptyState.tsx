import { AlertTriangle, Inbox, RotateCw, type LucideIcon } from 'lucide-react';
import { t } from '../../i18n/pt-BR';
import { cn } from '../../utils/cn';
import { Button } from './Button';

interface EmptyStateProps {
  mensagem: string;
  icone?: LucideIcon;
  acao?: { rotulo: string; aoClicar: () => void };
  className?: string;
}

/** Mostrado quando o card carregou, mas não há nada para exibir. */
export function EmptyState({ mensagem, icone: Icone = Inbox, acao, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center',
        className,
      )}
    >
      <Icone size={28} className="text-text-muted" aria-hidden />
      <p className="text-[14px] text-text-muted">{mensagem}</p>
      {acao && (
        <Button variante="contorno" tamanho="sm" onClick={acao.aoClicar} className="mt-1">
          {acao.rotulo}
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  mensagem?: string;
  aoTentarNovamente?: () => void;
  className?: string;
}

/** Mostrado quando a busca dos dados do card falha. */
export function ErrorState({
  mensagem = t.erro.carregar,
  aoTentarNovamente,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center',
        className,
      )}
    >
      <AlertTriangle size={28} className="text-danger" aria-hidden />
      <p className="text-[14px] text-text">{mensagem}</p>
      {aoTentarNovamente && (
        <Button
          variante="contorno"
          tamanho="sm"
          onClick={aoTentarNovamente}
          iconeEsquerda={<RotateCw size={14} />}
          className="mt-1"
        >
          {t.erro.tentarNovamente}
        </Button>
      )}
    </div>
  );
}
