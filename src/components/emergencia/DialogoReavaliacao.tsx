import { useState } from 'react';
import { te } from '../../i18n/pt-BR/emergencia';
import { ErroValidacao } from '../../services/erros';
import { reavaliar } from '../../services/emergencia';
import type { AtendimentoDetalhado } from '../../types';
import { avaliarSinais } from '../../utils/sinais-vitais';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { Campo } from '../ui/form/Campo';
import { Textarea } from '../ui/form/Textarea';
import { CamposSinaisVitais } from './CamposSinaisVitais';
import { paraSinais, type CampoSinalOuPeso, type ValoresSinais } from './sinais';

const d = te.dialogos;

interface DialogoReavaliacaoProps {
  atendimento: AtendimentoDetalhado | null;
  aoFechar: () => void;
  /** `piorou`: algum sinal entrou na faixa de alerta (sugere retriagem, R-E16). */
  aoRegistrado: (piorou: boolean) => void;
  aoErro: (erro: unknown) => void;
}

/** E10: sinais vitais sem mudar a cor nem o prazo. */
export function DialogoReavaliacao({
  atendimento,
  aoFechar,
  aoRegistrado,
  aoErro,
}: DialogoReavaliacaoProps) {
  const [valores, setValores] = useState<ValoresSinais>({});
  const [observacao, setObservacao] = useState('');
  const [erros, setErros] = useState<Partial<Record<CampoSinalOuPeso | 'observacao', string>>>({});
  const [enviando, setEnviando] = useState(false);

  const [idAntes, setIdAntes] = useState(atendimento?.id);
  if (atendimento?.id !== idAntes) {
    setIdAntes(atendimento?.id);
    setValores({});
    setObservacao('');
    setErros({});
    setEnviando(false);
  }

  async function confirmar() {
    if (!atendimento) return;
    setEnviando(true);
    setErros({});
    const sinais = paraSinais(valores);
    try {
      await reavaliar(
        atendimento.id,
        { sinais, observacao: observacao.trim() || undefined },
        atendimento.versao,
      );
      const antes = new Set(atendimento.alertasSinais.map((x) => x.campo));
      const agora = avaliarSinais(sinais, atendimento.idade).alertas;
      aoRegistrado(agora.some((x) => !antes.has(x.campo)));
    } catch (e) {
      setEnviando(false);
      if (e instanceof ErroValidacao) {
        setErros(
          Object.fromEntries(
            Object.entries(e.campos).map(([k, v]) => [k.replace(/^sinais\./, ''), v]),
          ),
        );
      } else aoErro(e);
    }
  }

  return (
    <Modal
      aberto={atendimento !== null}
      aoFechar={aoFechar}
      titulo={atendimento ? d.reavaliacaoTitulo(atendimento.numero) : ''}
      descricao={d.reavaliacaoDescricao}
      tamanho="lg"
      rodape={
        <>
          <Button variante="contorno" onClick={aoFechar}>
            {te.voltar}
          </Button>
          <Button disabled={enviando} onClick={confirmar}>
            {enviando ? te.salvando : d.registrar}
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
        <CamposSinaisVitais
          valores={valores}
          aoMudar={(campo, texto) => setValores((v) => ({ ...v, [campo]: texto }))}
          erros={erros}
          idade={atendimento?.idade}
          prefixo="reavaliacao"
        />
        <Campo rotulo={d.observacaoReavaliacao} nome="observacao" erro={erros.observacao}>
          <Textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            maxLength={500}
            rows={2}
          />
        </Campo>
      </form>
    </Modal>
  );
}
