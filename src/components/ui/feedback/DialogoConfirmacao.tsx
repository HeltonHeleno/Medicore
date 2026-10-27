import { useCallback, useId, useRef, useState, type ReactNode } from 'react';
import { t } from '../../../i18n/pt-BR';
import { Button } from '../Button';
import { classesControle } from '../form/estilos';
import { ContextoConfirmacao, type OpcoesConfirmacao, type RespostaConfirmacao } from './contextos';
import { Modal } from './Modal';

interface Pendente extends OpcoesConfirmacao {
  resolver: (resposta: RespostaConfirmacao) => void;
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

  const [textoLivre, setTextoLivre] = useState('');
  const textoLivreRef = useRef<HTMLTextAreaElement>(null);
  const idTextoLivre = useId();

  const perguntar = useCallback(
    (opcoes: OpcoesConfirmacao) =>
      new Promise<RespostaConfirmacao>((resolver) => {
        setDigitado('');
        setTextoLivre('');
        setPendente((anterior) => {
          anterior?.resolver({ confirmado: false, texto: '' }); // um diálogo por vez
          return { ...opcoes, resolver };
        });
      }),
    [],
  );

  const responder = (confirmado: boolean) => {
    pendente?.resolver({ confirmado, texto: confirmado ? textoLivre.trim() : '' });
    setPendente(null);
  };

  const liberado = !pendente?.exigirTexto || digitado.trim() === pendente.exigirTexto;
  const focoInicial = pendente?.exigirTexto
    ? textoRef
    : pendente?.perigo
      ? cancelarRef
      : confirmarRef;

  return (
    <ContextoConfirmacao.Provider value={perguntar}>
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
              variante={pendente?.perigo ? 'perigo' : 'primario'}
            >
              {pendente?.rotuloConfirmar ?? t.confirmacao.confirmar}
            </Button>
          </>
        }
      >
        {pendente?.campoTexto && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idTextoLivre} className="text-[13.5px] font-medium">
              {pendente.campoTexto.rotulo}
            </label>
            <textarea
              ref={textoLivreRef}
              id={idTextoLivre}
              rows={2}
              maxLength={pendente.campoTexto.maximo ?? 300}
              value={textoLivre}
              onChange={(e) => setTextoLivre(e.target.value)}
              className={classesControle}
            />
          </div>
        )}
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
