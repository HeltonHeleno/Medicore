import { useId, useState, type ReactNode } from 'react';
import { tl } from '../../i18n/pt-BR/leitos';
import { ErroValidacao } from '../../services/erros';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { Campo } from '../ui/form/Campo';
import { Textarea } from '../ui/form/Textarea';

interface DialogoMotivoProps {
  aberto: boolean;
  titulo: string;
  descricao?: ReactNode;
  rotulo: string;
  sugestoes?: readonly string[];
  rotuloConfirmar: string;
  perigo?: boolean;
  /** Grava; lançar mostra a mensagem no campo (validação) ou no topo. */
  aoConfirmar: (motivo: string) => Promise<void>;
  aoFechar: () => void;
  /** Conteúdo extra acima do campo (ex.: aviso de prazo). */
  children?: ReactNode;
  maximo?: number;
}

/** Pede um motivo obrigatório (desfazer alta, cancelar pedido, bloquear…), com sugestões. */
export function DialogoMotivo({
  aberto,
  titulo,
  descricao,
  rotulo,
  sugestoes = [],
  rotuloConfirmar,
  perigo,
  aoConfirmar,
  aoFechar,
  children,
  maximo = 200,
}: DialogoMotivoProps) {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const idSugestoes = useId();

  const [abertoAntes, setAbertoAntes] = useState(aberto);
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto);
    if (aberto) {
      setMotivo('');
      setErro(undefined);
      setEnviando(false);
    }
  }

  async function confirmar() {
    setEnviando(true);
    setErro(undefined);
    try {
      await aoConfirmar(motivo.trim());
    } catch (e) {
      setErro(
        e instanceof ErroValidacao
          ? (Object.values(e.campos)[0] ?? e.message)
          : e instanceof Error
            ? e.message
            : String(e),
      );
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      descricao={descricao}
      papel="alertdialog"
      tamanho="sm"
      rodape={
        <>
          <Button variante="contorno" onClick={aoFechar}>
            {tl.voltar}
          </Button>
          <Button variante={perigo ? 'perigo' : 'primario'} disabled={enviando} onClick={confirmar}>
            {enviando ? tl.salvando : rotuloConfirmar}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void confirmar();
        }}
        className="space-y-3"
      >
        {children}
        {sugestoes.length > 0 && (
          <div
            role="group"
            aria-labelledby={idSugestoes}
            className="flex flex-wrap items-center gap-2"
          >
            <span id={idSugestoes} className="text-[12.5px] text-text-muted">
              {tl.dialogos.sugestoes}:
            </span>
            {sugestoes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setMotivo(s)}
                className="rounded-full border border-border-input px-3 py-1 text-[13px] hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <Campo rotulo={rotulo} nome="motivo" obrigatorio erro={erro}>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={maximo}
            rows={3}
          />
        </Campo>
      </form>
    </Modal>
  );
}
