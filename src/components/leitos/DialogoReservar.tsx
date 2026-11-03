import { useEffect, useState } from 'react';
import { nomeSetor } from '../../config/setores';
import { tl } from '../../i18n/pt-BR/leitos';
import { ErroConflito } from '../../services/erros';
import { leitosCompativeis, reservarLeito } from '../../services/leitos';
import type { LeitoAvaliado, SetorId, SolicitacaoDetalhada } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { SkeletonLinhas } from '../ui/Skeleton';
import { SeletorLeito } from './SeletorLeito';

interface DialogoReservarProps {
  solicitacao: SolicitacaoDetalhada | null;
  aoFechar: () => void;
  aoReservar: (codigo: string) => void;
  aoErro: (erro: unknown) => void;
}

/** L6 "Reservar": leitos filtrados pelo setor desejado e pela precaução do pedido. */
export function DialogoReservar({
  solicitacao,
  aoFechar,
  aoReservar,
  aoErro,
}: DialogoReservarProps) {
  const s = tl.solicitacoes;
  const [avaliados, setAvaliados] = useState<LeitoAvaliado[] | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [leitoId, setLeitoId] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);

  const [idAntes, setIdAntes] = useState(solicitacao?.id);
  if (solicitacao?.id !== idAntes) {
    setIdAntes(solicitacao?.id);
    setAvaliados(null);
    setLeitoId('');
    setErro(undefined);
    setEnviando(false);
  }

  useEffect(() => {
    if (!solicitacao) return;
    let ativo = true;
    void leitosCompativeis(
      {
        pacienteId: solicitacao.pacienteId,
        precaucao: solicitacao.precaucao,
        setorDesejado: solicitacao.setorDesejado as SetorId | undefined,
      },
      solicitacao.leitoReservadoId,
    ).then((lista) => ativo && setAvaliados(lista));
    return () => {
      ativo = false;
    };
  }, [solicitacao, recarga]);

  async function confirmar() {
    if (!solicitacao) return;
    if (!leitoId) {
      setErro(tl.seletor.nenhumCompativel);
      return;
    }
    setEnviando(true);
    setErro(undefined);
    try {
      await reservarLeito(solicitacao.id, leitoId, solicitacao.versao);
      aoReservar(avaliados?.find((a) => a.leito.id === leitoId)?.leito.codigo ?? '');
    } catch (e) {
      setEnviando(false);
      if (e instanceof ErroConflito && e.codigo === 'leito_indisponivel') {
        setLeitoId('');
        setRecarga((n) => n + 1);
        setErro(e.message);
      } else {
        aoErro(e);
      }
    }
  }

  return (
    <Modal
      aberto={solicitacao !== null}
      aoFechar={aoFechar}
      titulo={solicitacao ? s.reservarTitulo(solicitacao.pacienteNome) : ''}
      descricao={
        solicitacao
          ? s.destino(
              solicitacao.setorDesejado ? nomeSetor(solicitacao.setorDesejado) : tl.qualquerSetor,
              tl.precaucoes[solicitacao.precaucao],
            )
          : undefined
      }
      tamanho="lg"
      rodape={
        <>
          <Button variante="contorno" onClick={aoFechar}>
            {tl.voltar}
          </Button>
          <Button disabled={enviando || !avaliados} onClick={confirmar}>
            {enviando ? tl.salvando : s.reservar}
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
          nome="leitoReserva"
          erro={erro}
        />
      ) : (
        <SkeletonLinhas />
      )}
    </Modal>
  );
}
