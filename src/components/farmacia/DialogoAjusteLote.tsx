import { useState } from 'react';
import { tf } from '../../i18n/pt-BR/farmacia';
import { ErroConflito, ErroValidacao } from '../../services/erros';
import { ajustar, quantidadeComUnidade } from '../../services/farmacia';
import type { Lote, Medicamento } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { Campo } from '../ui/form/Campo';
import { CampoQuantidade } from '../ui/form/CampoQuantidade';
import { RadioGroup } from '../ui/form/RadioGroup';
import { Textarea } from '../ui/form/Textarea';

const d = tf.dialogos;
type TipoAjuste = 'ajuste_positivo' | 'ajuste_negativo';

interface DialogoAjusteLoteProps {
  /** Lote e o modo: ajuste de inventário (positivo ou negativo) ou perda/avaria. */
  alvo: { lote: Lote; modo: 'ajuste' | 'perda' } | null;
  medicamento: Medicamento;
  aoFechar: () => void;
  aoRegistrar: (texto: string) => void;
  aoErro: (erro: unknown) => void;
}

/** F5: ajuste e perda. O saldo nunca fica negativo (E-12); controlado exige motivo maior (R-F7). */
export function DialogoAjusteLote({
  alvo,
  medicamento,
  aoFechar,
  aoRegistrar,
  aoErro,
}: DialogoAjusteLoteProps) {
  const [tipo, setTipo] = useState<TipoAjuste>('ajuste_negativo');
  const [quantidade, setQuantidade] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const [idAntes, setIdAntes] = useState(alvo?.lote.id);
  if (alvo?.lote.id !== idAntes) {
    setIdAntes(alvo?.lote.id);
    setTipo('ajuste_negativo');
    setQuantidade(null);
    setMotivo('');
    setErros({});
    setEnviando(false);
  }
  const unidade = tf.unidades[medicamento.unidade](2);

  async function confirmar() {
    if (!alvo) return;
    setEnviando(true);
    setErros({});
    try {
      await ajustar(
        alvo.lote.id,
        {
          tipo: alvo.modo === 'perda' ? 'perda' : tipo,
          quantidade: quantidade ?? undefined,
          motivo,
        } as Parameters<typeof ajustar>[1],
        alvo.lote.versao,
      );
      aoRegistrar(d.ajusteRegistrado(quantidadeComUnidade(medicamento, quantidade ?? 0)));
    } catch (e) {
      setEnviando(false);
      if (e instanceof ErroValidacao) setErros(e.campos);
      else if (e instanceof ErroConflito && e.codigo === 'estoque_insuficiente')
        setErros({
          quantidade:
            d.saldoAtual(quantidadeComUnidade(medicamento, alvo.lote.quantidadeAtual)) +
            ' ' +
            e.message,
        });
      else aoErro(e);
    }
  }

  return (
    <Modal
      aberto={alvo !== null}
      aoFechar={aoFechar}
      titulo={
        alvo
          ? alvo.modo === 'perda'
            ? d.perdaTitulo(alvo.lote.numero)
            : d.ajusteTitulo(alvo.lote.numero)
          : ''
      }
      descricao={
        alvo
          ? d.saldoAtual(quantidadeComUnidade(medicamento, alvo.lote.quantidadeAtual))
          : undefined
      }
      rodape={
        <>
          <Button variante="contorno" onClick={aoFechar}>
            {tf.voltar}
          </Button>
          <Button disabled={enviando} onClick={confirmar}>
            {enviando ? tf.salvando : d.registrar}
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
        {alvo?.modo === 'ajuste' && (
          <RadioGroup
            legenda={d.tipo}
            nome="tipo"
            obrigatorio
            opcoes={(['ajuste_negativo', 'ajuste_positivo'] as const).map((x) => ({
              valor: x,
              rotulo: d.tiposAjuste[x],
            }))}
            valor={tipo}
            aoMudar={setTipo}
            erro={erros.tipo}
          />
        )}
        <Campo
          rotulo={`${d.quantidade} (${unidade})`}
          nome="quantidade"
          obrigatorio
          erro={erros.quantidade}
        >
          <CampoQuantidade valor={quantidade} aoMudar={setQuantidade} unidade={unidade} />
        </Campo>
        <Campo
          rotulo={d.motivo}
          nome="motivo"
          obrigatorio
          dica={medicamento.controlado ? d.motivoControlado : undefined}
          erro={erros.motivo}
        >
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={200}
            rows={2}
          />
        </Campo>
      </form>
    </Modal>
  );
}
