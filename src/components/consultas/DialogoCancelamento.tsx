import { useId, useState } from 'react';
import { t } from '../../i18n/pt-BR';
import type { ConsultaDetalhada } from '../../types';
import { formatarDataHora } from '../../utils/datas';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { Textarea } from '../ui/form/Textarea';
import { Campo } from '../ui/form/Campo';

const a = t.agenda;

interface Props {
  consulta: ConsultaDetalhada | null;
  /** Resolve com o motivo (já validado no serviço); lança para mostrar o erro no campo. */
  aoConfirmar: (motivo: string) => Promise<void>;
  aoFechar: () => void;
}

/** P11: motivo obrigatório (5–300 caracteres), com sugestões em um clique. */
export function DialogoCancelamento({ consulta, aoConfirmar, aoFechar }: Props) {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const idSugestoes = useId();

  const [idAnterior, setIdAnterior] = useState(consulta?.id);
  if (consulta?.id !== idAnterior) {
    setIdAnterior(consulta?.id);
    setMotivo('');
    setErro(undefined);
    setEnviando(false);
  }

  async function confirmar() {
    setEnviando(true);
    setErro(undefined);
    try {
      await aoConfirmar(motivo);
    } catch (e) {
      setErro(e instanceof Error ? e.message : t.erros.inesperadoTitulo);
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto={consulta !== null}
      aoFechar={aoFechar}
      titulo={a.cancelarTitulo}
      descricao={
        consulta
          ? `${consulta.pacienteNome} · ${formatarDataHora(consulta.inicio)} · ${consulta.medicoNome}`
          : undefined
      }
      papel="alertdialog"
      tamanho="sm"
      rodape={
        <>
          <Button variante="contorno" onClick={aoFechar}>
            {a.voltar}
          </Button>
          <Button variante="perigo" disabled={enviando} onClick={confirmar}>
            {a.confirmarCancelamento}
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
        <div
          role="group"
          aria-labelledby={idSugestoes}
          className="flex flex-wrap items-center gap-2"
        >
          <span id={idSugestoes} className="text-[12.5px] text-text-muted">
            {a.sugestoes}:
          </span>
          {a.sugestoesMotivo.map((s) => (
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
        <Campo rotulo={a.motivoCancelamento} nome="motivoCancelamento" obrigatorio erro={erro}>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={300}
            rows={3}
          />
        </Campo>
      </form>
    </Modal>
  );
}
