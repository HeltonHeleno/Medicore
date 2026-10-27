import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { t } from '../../../i18n/pt-BR';
import { cn } from '../../../utils/cn';
import { Button } from '../Button';
import { classesControle } from '../form/estilos';
import { ContextoConfirmacao, type OpcoesConfirmacao } from './contextos';
import { Modal } from './Modal';

interface Pendente extends OpcoesConfirmacao {
  resolver: (resposta: boolean) => void;
}

/**
 * Fornece `useConfirmar()`: `await confirmar({ titulo, mensagem, perigo })` devolve
 * `true` (confirmou) ou `false` (cancelou, Esc ou clique fora).
 */
export function ConfirmacaoProvider({ children }: { children: ReactNode }) {
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [digitado, setDigitado] = useState('');
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const confirmarRef = useRef<HTMLButtonElement>(null);
  const textoRef = useRef<HTMLInputElement>(null);
  const idTexto = useId();

  const confirmar = useCallback(
    (opcoes: OpcoesConfirmacao) =>
      new Promise<boolean>((resolver) => {
        setDigitado('');
        setPendente((anterior) => {
          anterior?.resolver(false); // um diálogo por vez
          return { ...opcoes, resolver };
        });
      }),
    [],
  );

  const responder = (resposta: boolean) => {
    pendente?.resolver(resposta);
    setPendente(null);
  };

  const liberado = !pendente?.exigirTexto || digitado.trim() === pendente.exigirTexto;
  const focoInicial = pendente?.exigirTexto
    ? textoRef
    : pendente?.perigo
      ? cancelarRef
      : confirmarRef;

  return (
    <ContextoConfirmacao.Provider value={confirmar}>
      {children}
      <Modal
        aberto={pendente !== null}
        aoFechar={() => responder(false)}
        titulo={pendente?.titulo ?? ''}
        descricao={pendente?.mensagem}
        tamanho="sm"
        papel="alertdialog"
        focoInicial={focoInicial}
        rodape={
          <>
            <Button ref={cancelarRef} variante="contorno" onClick={() => responder(false)}>
              {pendente?.rotuloCancelar ?? t.confirmacao.cancelar}
            </Button>
            <Button
              ref={confirmarRef}
              disabled={!liberado}
              onClick={() => responder(true)}
              className={cn(pendente?.perigo && 'bg-danger text-white hover:bg-danger/90')}
            >
              {pendente?.rotuloConfirmar ?? t.confirmacao.confirmar}
            </Button>
          </>
        }
      >
        {pendente?.exigirTexto && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (liberado) responder(true);
            }}
            className="flex flex-col gap-1.5"
          >
            <label htmlFor={idTexto} className="text-[13.5px] font-medium">
              {t.confirmacao.digiteParaConfirmar(pendente.exigirTexto)}
            </label>
            <input
              ref={textoRef}
              id={idTexto}
              value={digitado}
              autoComplete="off"
              onChange={(e) => setDigitado(e.target.value)}
              className={classesControle}
            />
          </form>
        )}
      </Modal>
    </ContextoConfirmacao.Provider>
  );
}
