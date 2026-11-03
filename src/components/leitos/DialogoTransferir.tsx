import { useEffect, useState } from 'react';
import { tl } from '../../i18n/pt-BR/leitos';
import { ErroConflito, ErroValidacao } from '../../services/erros';
import { leitosCompativeis, transferir } from '../../services/leitos';
import type { Internacao, InternacaoDetalhada, LeitoAvaliado } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { Campo } from '../ui/form/Campo';
import { Textarea } from '../ui/form/Textarea';
import { SkeletonLinhas } from '../ui/Skeleton';
import { ehExcecao } from './acoes-leito';
import { SeletorLeito } from './SeletorLeito';

interface DialogoTransferirProps {
  internacao: InternacaoDetalhada | null;
  aoFechar: () => void;
  /** Transferência gravada (o diálogo já fechou). */
  aoTransferir: (resultado: Internacao, de: string, para: string) => void;
  /** Erro que não é do formulário (E-05, E-16): o diálogo fecha e a tela avisa. */
  aoErro: (erro: unknown) => void;
}

/** L2: leito de destino (sem o atual), motivo com sugestões e justificativa da exceção. */
export function DialogoTransferir({
  internacao,
  aoFechar,
  aoTransferir,
  aoErro,
}: DialogoTransferirProps) {
  const d = tl.dialogos;
  const [avaliados, setAvaliados] = useState<LeitoAvaliado[] | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [leitoId, setLeitoId] = useState('');
  const [usarExcecao, setUsarExcecao] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const [idAntes, setIdAntes] = useState(internacao?.id);
  if (internacao?.id !== idAntes) {
    setIdAntes(internacao?.id);
    setAvaliados(null);
    setLeitoId('');
    setUsarExcecao(false);
    setJustificativa('');
    setMotivo('');
    setErros({});
    setEnviando(false);
  }

  useEffect(() => {
    if (!internacao) return;
    let ativo = true;
    void leitosCompativeis(
      { pacienteId: internacao.pacienteId, precaucao: internacao.precaucao },
      internacao.leitoId,
    ).then((lista) => ativo && setAvaliados(lista));
    return () => {
      ativo = false;
    };
  }, [internacao, recarga]);

  async function confirmar() {
    if (!internacao) return;
    setEnviando(true);
    setErros({});
    const escolhido = avaliados?.find((a) => a.leito.id === leitoId);
    try {
      const r = await transferir(
        internacao.id,
        {
          leitoDestinoId: leitoId,
          motivo: motivo.trim(),
          justificativa: escolhido && ehExcecao(escolhido) ? justificativa.trim() : undefined,
        },
        internacao.versao,
      );
      aoTransferir(r, internacao.leitoCodigo, escolhido?.leito.codigo ?? '');
    } catch (e) {
      setEnviando(false);
      if (e instanceof ErroValidacao) {
        setErros({
          ...e.campos,
          ...(e.campos.justificativa ? { justificativa: e.campos.justificativa } : {}),
        });
      } else if (e instanceof ErroConflito && e.codigo === 'leito_indisponivel') {
        // E-11: o destino foi ocupado por outra aba. Recarrega os leitos e limpa a escolha.
        setLeitoId('');
        setRecarga((n) => n + 1);
        setErros({ leitoDestinoId: e.message });
      } else {
        aoErro(e);
      }
    }
  }

  return (
    <Modal
      aberto={internacao !== null}
      aoFechar={aoFechar}
      titulo={internacao ? d.transferirTitulo(internacao.pacienteNome) : ''}
      descricao={internacao ? d.transferirDescricao(internacao.leitoCodigo) : undefined}
      tamanho="lg"
      rodape={
        <>
          <Button variante="contorno" onClick={aoFechar}>
            {tl.voltar}
          </Button>
          <Button disabled={enviando || !avaliados} onClick={confirmar}>
            {enviando ? tl.salvando : d.transferir}
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
        {avaliados ? (
          <SeletorLeito
            avaliados={avaliados}
            valor={leitoId}
            aoMudar={(id) => {
              setLeitoId(id);
              setErros((x) => ({ ...x, leitoDestinoId: '' }));
            }}
            rotulo={d.destino}
            nome="leitoDestinoId"
            permitirExcecao
            usarExcecao={usarExcecao}
            aoMudarUsarExcecao={setUsarExcecao}
            justificativa={justificativa}
            aoMudarJustificativa={setJustificativa}
            erroJustificativa={erros.justificativa}
            erro={erros.leitoDestinoId || undefined}
          />
        ) : (
          <SkeletonLinhas />
        )}
        <div className="flex flex-wrap gap-2" role="group" aria-label={d.sugestoes}>
          {tl.motivosTransferencia.map((s) => (
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
        <Campo
          rotulo={d.motivoTransferencia}
          nome="motivoTransferencia"
          obrigatorio
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
