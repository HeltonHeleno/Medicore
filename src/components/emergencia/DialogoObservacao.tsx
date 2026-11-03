import { useEffect, useState } from 'react';
import { te } from '../../i18n/pt-BR/emergencia';
import { tl } from '../../i18n/pt-BR/leitos';
import { ErroConflito, ErroValidacao } from '../../services/erros';
import { colocarEmObservacao, leitosParaObservacao } from '../../services/emergencia';
import type { AtendimentoDetalhado, LeitoAvaliado } from '../../types';
import { SeletorLeito } from '../leitos/SeletorLeito';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { SkeletonLinhas } from '../ui/Skeleton';

const d = te.dialogos;

interface DialogoObservacaoProps {
  atendimento: AtendimentoDetalhado | null;
  aoFechar: () => void;
  aoConfirmar: (codigo: string) => void;
  aoErro: (erro: unknown) => void;
}

/** E4: leito do setor Observação, com perfil compatível (R-E12). */
export function DialogoObservacao({
  atendimento,
  aoFechar,
  aoConfirmar,
  aoErro,
}: DialogoObservacaoProps) {
  const [avaliados, setAvaliados] = useState<LeitoAvaliado[] | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [leitoId, setLeitoId] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);

  const [idAntes, setIdAntes] = useState(atendimento?.id);
  if (atendimento?.id !== idAntes) {
    setIdAntes(atendimento?.id);
    setAvaliados(null);
    setLeitoId('');
    setErro(undefined);
    setEnviando(false);
  }

  useEffect(() => {
    if (!atendimento) return;
    let ativo = true;
    void leitosParaObservacao(atendimento.id).then((lista) => {
      if (!ativo) return;
      setAvaliados(lista);
      setLeitoId((atual) => atual || (lista.find((x) => x.sugerido)?.leito.id ?? ''));
    });
    return () => {
      ativo = false;
    };
  }, [atendimento, recarga]);

  async function confirmar() {
    if (!atendimento) return;
    if (!leitoId) {
      setErro(tl.seletor.nenhumCompativel);
      return;
    }
    setEnviando(true);
    setErro(undefined);
    try {
      await colocarEmObservacao(atendimento.id, leitoId, atendimento.versao);
      aoConfirmar(avaliados?.find((a) => a.leito.id === leitoId)?.leito.codigo ?? '');
    } catch (e) {
      setEnviando(false);
      if (e instanceof ErroConflito && e.codigo === 'leito_indisponivel') {
        // E-11: outro paciente ocupou o leito; recarrega a lista e limpa a escolha.
        setLeitoId('');
        setRecarga((n) => n + 1);
        setErro(e.message);
      } else if (e instanceof ErroValidacao) {
        setErro(Object.values(e.campos)[0] ?? e.message);
      } else {
        aoErro(e);
      }
    }
  }

  return (
    <Modal
      aberto={atendimento !== null}
      aoFechar={aoFechar}
      titulo={atendimento ? d.observacaoTitulo(atendimento.numero) : ''}
      descricao={atendimento?.nomeExibicao}
      tamanho="lg"
      rodape={
        <>
          <Button variante="contorno" onClick={aoFechar}>
            {te.voltar}
          </Button>
          <Button disabled={enviando || !avaliados} onClick={confirmar}>
            {enviando ? te.salvando : te.acoes.observacao}
          </Button>
        </>
      }
    >
      {avaliados ? (
        <SeletorLeito
          avaliados={avaliados}
          valor={leitoId}
          aoMudar={(id) => {
            setLeitoId(id);
            setErro(undefined);
          }}
          rotulo={d.leitoObservacao}
          nome="leitoObservacao"
          erro={erro}
        />
      ) : (
        <SkeletonLinhas />
      )}
    </Modal>
  );
}
