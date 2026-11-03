import { Info } from 'lucide-react';
import { useState } from 'react';
import { nomeSetor } from '../../config/setores';
import { te } from '../../i18n/pt-BR/emergencia';
import { tl } from '../../i18n/pt-BR/leitos';
import { PRECAUCOES, SETORES_INTERNACAO_IDS } from '../../schemas/internacao';
import { ErroConflito, ErroValidacao } from '../../services/erros';
import { solicitarLeito } from '../../services/emergencia';
import type { AtendimentoDetalhado, Precaucao } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { Campo } from '../ui/form/Campo';
import { Select } from '../ui/form/Select';
import { Textarea } from '../ui/form/Textarea';

const d = te.dialogos;
type SetorInternacao = (typeof SETORES_INTERNACAO_IDS)[number];

interface DialogoPedirLeitoProps {
  atendimento: AtendimentoDetalhado | null;
  aoFechar: () => void;
  aoPedido: () => void;
  /** Provisório: o pedido exige cadastro (R-E9); oferece identificar antes. */
  aoIdentificar: (a: AtendimentoDetalhado) => void;
  aoErro: (erro: unknown) => void;
}

/** E6: setor, precaução e motivo (padrão: a queixa). O pedido vai para o mapa de leitos. */
export function DialogoPedirLeito({
  atendimento,
  aoFechar,
  aoPedido,
  aoIdentificar,
  aoErro,
}: DialogoPedirLeitoProps) {
  const [setor, setSetor] = useState<SetorInternacao>('enfermaria');
  const [precaucao, setPrecaucao] = useState<Precaucao>('padrao');
  const [motivo, setMotivo] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const [idAntes, setIdAntes] = useState(atendimento?.id);
  if (atendimento?.id !== idAntes) {
    setIdAntes(atendimento?.id);
    setSetor('enfermaria');
    setPrecaucao('padrao');
    setMotivo(atendimento?.queixa ?? '');
    setErros({});
    setEnviando(false);
  }
  const provisorio = !!atendimento && !atendimento.pacienteId;

  async function confirmar() {
    if (!atendimento) return;
    setEnviando(true);
    setErros({});
    try {
      await solicitarLeito(
        atendimento.id,
        { setorDesejado: setor, precaucao, motivo },
        atendimento.versao,
      );
      aoPedido();
    } catch (e) {
      setEnviando(false);
      if (e instanceof ErroValidacao) setErros(e.campos);
      else if (e instanceof ErroConflito && e.campo === 'pacienteId')
        setErros({ pacienteId: e.message });
      else aoErro(e);
    }
  }

  return (
    <Modal
      aberto={atendimento !== null}
      aoFechar={aoFechar}
      titulo={atendimento ? d.pedirLeitoTitulo(atendimento.numero) : ''}
      descricao={provisorio ? undefined : d.pedirLeitoDescricao}
      rodape={
        provisorio ? (
          <>
            <Button variante="contorno" onClick={aoFechar}>
              {te.voltar}
            </Button>
            <Button onClick={() => aoIdentificar(atendimento)}>{te.acoes.identificar}</Button>
          </>
        ) : (
          <>
            <Button variante="contorno" onClick={aoFechar}>
              {te.voltar}
            </Button>
            <Button disabled={enviando} onClick={confirmar}>
              {enviando ? te.salvando : d.pedir}
            </Button>
          </>
        )
      }
    >
      {provisorio ? (
        <p className="flex items-start gap-2.5 text-[14px]">
          <Info size={18} aria-hidden className="mt-0.5 shrink-0 text-text-muted" />
          {te.acoes.pedirLeitoProvisorio}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void confirmar();
          }}
          className="space-y-4"
        >
          {erros.pacienteId && (
            <p role="alert" className="text-[13.5px] font-medium text-danger">
              {erros.pacienteId}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo={d.setor} nome="setorDesejado" obrigatorio erro={erros.setorDesejado}>
              <Select
                vazia={false}
                value={setor}
                onChange={(e) => setSetor(e.target.value as SetorInternacao)}
                opcoes={SETORES_INTERNACAO_IDS.map((s) => ({ valor: s, rotulo: nomeSetor(s) }))}
              />
            </Campo>
            <Campo rotulo={d.precaucao} nome="precaucao" obrigatorio erro={erros.precaucao}>
              <Select
                vazia={false}
                value={precaucao}
                onChange={(e) => setPrecaucao(e.target.value as Precaucao)}
                opcoes={PRECAUCOES.map((p) => ({ valor: p, rotulo: tl.precaucoes[p] }))}
              />
            </Campo>
          </div>
          <Campo rotulo={d.motivo} nome="motivo" obrigatorio erro={erros.motivo}>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={300}
              rows={3}
            />
          </Campo>
        </form>
      )}
    </Modal>
  );
}
