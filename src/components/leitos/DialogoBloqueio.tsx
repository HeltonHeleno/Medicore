import { useState } from 'react';
import { tl } from '../../i18n/pt-BR/leitos';
import { ErroValidacao } from '../../services/erros';
import type { Leito } from '../../types';
import { hojeNoFuso } from '../../utils/datas';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { Campo } from '../ui/form/Campo';
import { Input } from '../ui/form/Input';
import { Textarea } from '../ui/form/Textarea';

interface DialogoBloqueioProps {
  leito: Leito | null;
  aoConfirmar: (dados: { motivo: string; previsaoLiberacao?: string }) => Promise<void>;
  aoFechar: () => void;
}

/** L5: motivo (5 a 200 caracteres, com sugestões) e previsão de liberação opcional. */
export function DialogoBloqueio({ leito, aoConfirmar, aoFechar }: DialogoBloqueioProps) {
  const d = tl.dialogos;
  const [motivo, setMotivo] = useState('');
  const [previsao, setPrevisao] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const [idAntes, setIdAntes] = useState(leito?.id);
  if (leito?.id !== idAntes) {
    setIdAntes(leito?.id);
    setMotivo('');
    setPrevisao('');
    setErros({});
    setEnviando(false);
  }

  async function confirmar() {
    setEnviando(true);
    setErros({});
    try {
      await aoConfirmar({ motivo: motivo.trim(), previsaoLiberacao: previsao || undefined });
    } catch (e) {
      setErros(
        e instanceof ErroValidacao
          ? e.campos
          : { motivo: e instanceof Error ? e.message : String(e) },
      );
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto={leito !== null}
      aoFechar={aoFechar}
      titulo={leito ? d.bloquearTitulo(leito.codigo) : ''}
      descricao={d.bloquearDescricao}
      tamanho="sm"
      rodape={
        <>
          <Button variante="contorno" onClick={aoFechar}>
            {tl.voltar}
          </Button>
          <Button disabled={enviando} onClick={confirmar}>
            {enviando ? tl.salvando : d.bloquear}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void confirmar();
        }}
        className="space-y-4"
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label={d.sugestoes}>
          {tl.motivosBloqueio.map((s) => (
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
        <Campo rotulo={d.motivoBloqueio} nome="motivo" obrigatorio erro={erros.motivo}>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={200}
            rows={2}
          />
        </Campo>
        <Campo rotulo={d.previsaoLiberacao} nome="previsaoLiberacao" erro={erros.previsaoLiberacao}>
          <Input
            type="date"
            min={hojeNoFuso()}
            value={previsao}
            onChange={(e) => setPrevisao(e.target.value)}
          />
        </Campo>
      </form>
    </Modal>
  );
}
