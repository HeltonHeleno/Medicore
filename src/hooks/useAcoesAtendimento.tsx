import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AcaoAtendimento } from '../components/emergencia/acoes-atendimento';
import { DialogoChamar } from '../components/emergencia/DialogoChamar';
import { DialogoDesfecho } from '../components/emergencia/DialogoDesfecho';
import { DialogoObservacao } from '../components/emergencia/DialogoObservacao';
import { DialogoPedirLeito } from '../components/emergencia/DialogoPedirLeito';
import { DialogoReabrir } from '../components/emergencia/DialogoReabrir';
import { DialogoReavaliacao } from '../components/emergencia/DialogoReavaliacao';
import { DialogoVincular } from '../components/emergencia/DialogoVincular';
import type { OpcaoPaciente } from '../components/pacientes/ComboboxPaciente';
import { t } from '../i18n/pt-BR';
import { te } from '../i18n/pt-BR/emergencia';
import { obterAtendimento, retomarAtendimento } from '../services/emergencia';
import { ErroConcorrencia, ErroConflito } from '../services/erros';
import type { AtendimentoDetalhado } from '../types';
import { useConfirmar } from './useConfirmar';
import { useToast } from './useToast';

const d = te.dialogos;

/**
 * Ações do atendimento (matriz de ações por estado), sempre com a `versao` carregada.
 * E-16 (situação mudou) e E-05 (versão antiga) descartam a ação, a tela se atualiza sozinha
 * e um aviso explica (M34). Renderize `dialogos` na página.
 */
export function useAcoesAtendimento() {
  const toast = useToast();
  const confirmar = useConfirmar();
  const navigate = useNavigate();
  const [chamando, setChamando] = useState<AtendimentoDetalhado | null>(null);
  const [observando, setObservando] = useState<AtendimentoDetalhado | null>(null);
  const [pedindo, setPedindo] = useState<AtendimentoDetalhado | null>(null);
  const [encerrando, setEncerrando] = useState<AtendimentoDetalhado | null>(null);
  const [vinculando, setVinculando] = useState<{
    a: AtendimentoDetalhado;
    inicial: OpcaoPaciente | null;
  } | null>(null);
  const [reavaliando, setReavaliando] = useState<AtendimentoDetalhado | null>(null);
  const [reabrindo, setReabrindo] = useState<AtendimentoDetalhado | null>(null);

  const tratarErro = useCallback(
    (e: unknown) => {
      if (e instanceof ErroConcorrencia) toast.aviso(d.mudouSituacao);
      else if (
        e instanceof ErroConflito &&
        (e.codigo === 'transicao_invalida' || e.codigo === 'janela_correcao_expirada')
      )
        toast.aviso(e.message);
      else toast.erro(e instanceof Error ? e.message : t.erros.inesperadoTitulo);
    },
    [toast],
  );

  /** Abre um diálogo com o atendimento relido (a versão da tela pode estar velha). */
  const comAtual = useCallback(
    async (id: string, abrir: (a: AtendimentoDetalhado) => void) => {
      try {
        abrir(await obterAtendimento(id));
      } catch (e) {
        tratarErro(e);
      }
    },
    [tratarErro],
  );

  const retomar = useCallback(
    async (a: AtendimentoDetalhado) => {
      try {
        await retomarAtendimento(a.id, a.versao);
        toast.sucesso(d.retomado);
      } catch (e) {
        tratarErro(e);
      }
    },
    [toast, tratarErro],
  );

  const executar = useCallback(
    (acao: AcaoAtendimento, a: AtendimentoDetalhado) => {
      switch (acao) {
        case 'triar':
          return navigate(`/emergencia/${a.id}/triagem`);
        case 'chamar':
          return setChamando(a);
        case 'observacao':
          return setObservando(a);
        case 'retomar':
          return void retomar(a);
        case 'pedirLeito':
          return setPedindo(a);
        case 'encerrar':
          return setEncerrando(a);
        case 'identificar':
          return setVinculando({ a, inicial: null });
        case 'sinais':
          return setReavaliando(a);
        case 'reabrir':
          return setReabrindo(a);
      }
    },
    [navigate, retomar],
  );

  /** Volta do cadastro novo (E7): abre a confirmação com o paciente já escolhido. */
  const identificarCom = useCallback(
    (a: AtendimentoDetalhado, inicial: OpcaoPaciente) => setVinculando({ a, inicial }),
    [],
  );

  const fecharComErro = (fechar: () => void) => (e: unknown) => {
    fechar();
    tratarErro(e);
  };

  const dialogos = (
    <>
      <DialogoChamar
        atendimento={chamando}
        aoFechar={() => setChamando(null)}
        aoChamado={(medico) => {
          const a = chamando!;
          setChamando(null);
          toast.sucesso(d.chamado(a.numero, medico));
        }}
        aoErro={fecharComErro(() => setChamando(null))}
      />
      <DialogoObservacao
        atendimento={observando}
        aoFechar={() => setObservando(null)}
        aoConfirmar={(codigo) => {
          setObservando(null);
          toast.sucesso(d.emObservacao(codigo));
        }}
        aoErro={fecharComErro(() => setObservando(null))}
      />
      <DialogoPedirLeito
        atendimento={pedindo}
        aoFechar={() => setPedindo(null)}
        aoPedido={() => {
          setPedindo(null);
          toast.sucesso(d.leitoPedido);
        }}
        aoIdentificar={(a) => {
          setPedindo(null);
          setVinculando({ a, inicial: null });
        }}
        aoErro={fecharComErro(() => setPedindo(null))}
      />
      <DialogoDesfecho
        atendimento={encerrando}
        aoFechar={() => setEncerrando(null)}
        aoEncerrar={(r, tipo) => {
          const a = encerrando!;
          setEncerrando(null);
          const extra =
            r.consultasCanceladas > 0 ? ` ${d.consultasCanceladas(r.consultasCanceladas)}` : '';
          toast.sucesso(`${te.avisos.encerrado(a.numero, te.desfechos[tipo])}.${extra}`, {
            acao: {
              rotulo: te.desfazer,
              aoClicar: () => void comAtual(a.id, setReabrindo),
            },
          });
        }}
        aoErro={fecharComErro(() => setEncerrando(null))}
      />
      <DialogoVincular
        key={vinculando?.inicial?.id ?? 'novo'}
        atendimento={vinculando?.a ?? null}
        inicial={vinculando?.inicial ?? null}
        aoFechar={() => setVinculando(null)}
        aoVinculado={(nome) => {
          const a = vinculando!.a;
          setVinculando(null);
          toast.sucesso(d.vinculado(a.numero, nome));
        }}
        aoErro={fecharComErro(() => setVinculando(null))}
      />
      <DialogoReavaliacao
        atendimento={reavaliando}
        aoFechar={() => setReavaliando(null)}
        aoRegistrado={(piorou) => {
          const a = reavaliando!;
          setReavaliando(null);
          toast.sucesso(d.reavaliado);
          if (!piorou) return;
          void confirmar({
            titulo: d.fazerRetriagem,
            mensagem: d.sugerirRetriagem,
            rotuloConfirmar: d.fazerRetriagem,
            rotuloCancelar: te.voltar,
          }).then((sim) => sim && navigate(`/emergencia/${a.id}/triagem`));
        }}
        aoErro={fecharComErro(() => setReavaliando(null))}
      />
      <DialogoReabrir
        atendimento={reabrindo}
        aoFechar={() => setReabrindo(null)}
        aoReaberto={(obito) => {
          const a = reabrindo!;
          setReabrindo(null);
          toast.sucesso(
            obito ? `${d.reaberto(a.numero)}. ${d.consultasNaoVoltam}` : d.reaberto(a.numero),
          );
        }}
        aoErro={fecharComErro(() => setReabrindo(null))}
      />
    </>
  );

  return { executar, identificarCom, tratarErro, dialogos };
}
