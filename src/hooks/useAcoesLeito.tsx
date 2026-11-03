import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AcaoLeito } from '../components/leitos/acoes-leito';
import { DialogoAlta } from '../components/leitos/DialogoAlta';
import { DialogoBloqueio } from '../components/leitos/DialogoBloqueio';
import { DialogoMotivo } from '../components/leitos/DialogoMotivo';
import { DialogoTransferir } from '../components/leitos/DialogoTransferir';
import { t } from '../i18n/pt-BR';
import { tl } from '../i18n/pt-BR/leitos';
import { ErroConcorrencia, ErroConflito } from '../services/erros';
import {
  bloquear,
  cancelarReserva,
  concluirHigienizacao,
  desbloquear,
  desfazerAlta,
  obterInternacao,
  obterLeito,
  obterSolicitacao,
  reverterHigienizacao,
} from '../services/leitos';
import type { InternacaoDetalhada, Leito, LeitoDetalhado } from '../types';
import { horaDoInstante } from '../utils/datas';
import { useConfirmar } from './useConfirmar';
import { useToast } from './useToast';

const d = tl.dialogos;
const DESFAZER_MS = 10_000;

/**
 * Ações de leito e de internação (matriz de ações por estado), com a `versao` carregada.
 * - E-16 (situação mudou) e E-05 (versão antiga): a ação é descartada, a tela se atualiza
 *   sozinha (`useColecao`) e um aviso explica o que houve (M34).
 * - Renderize `dialogos` na página.
 */
export function useAcoesLeito() {
  const toast = useToast();
  const confirmar = useConfirmar();
  const navigate = useNavigate();
  const [bloqueando, setBloqueando] = useState<Leito | null>(null);
  const [transferindo, setTransferindo] = useState<InternacaoDetalhada | null>(null);
  const [darAlta, setDarAlta] = useState<InternacaoDetalhada | null>(null);
  const [desfazendo, setDesfazendo] = useState<InternacaoDetalhada | null>(null);

  const tratarErro = useCallback(
    (e: unknown) => {
      if (e instanceof ErroConcorrencia) toast.aviso(d.mudouSituacao);
      else if (e instanceof ErroConflito && e.codigo === 'transicao_invalida')
        toast.aviso(e.message);
      else if (e instanceof ErroConflito && e.codigo === 'janela_correcao_expirada')
        toast.aviso(e.message);
      else toast.erro(e instanceof Error ? e.message : t.erros.inesperadoTitulo);
    },
    [toast],
  );

  /** L4: concluir uma higienização, com "Desfazer" por 10 s (volta mantendo o `desde`). */
  const concluir = useCallback(
    async (leito: Leito) => {
      const anterior = {
        desde: leito.desde,
        tipo: leito.higienizacao?.tipo ?? 'terminal',
      } as const;
      try {
        const r = await concluirHigienizacao([{ id: leito.id, versao: leito.versao }]);
        if (r.ignorados.length > 0) {
          toast.aviso(tl.avisos.leitosQueMudaram(r.ignorados.length));
          return;
        }
        toast.sucesso(tl.avisos.higienizacaoConcluida(1), {
          duracao: DESFAZER_MS,
          acao: {
            rotulo: tl.desfazer,
            aoClicar: () =>
              void obterLeito(leito.id)
                .then((atual) => reverterHigienizacao(leito.id, atual.versao, anterior))
                .catch(tratarErro),
          },
        });
      } catch (e) {
        tratarErro(e);
      }
    },
    [toast, tratarErro],
  );

  /** L4: "Concluir todas do setor", numa transação; os leitos que mudaram são pulados. */
  const concluirSetor = useCallback(
    async (setorNome: string, leitos: readonly Leito[]) => {
      const ok = await confirmar({
        titulo: tl.mapa.concluirSetorTitulo(setorNome),
        mensagem: tl.mapa.concluirSetorMensagem(leitos.map((l) => l.codigo).join(', ')),
        rotuloConfirmar: tl.mapa.concluir,
      });
      if (!ok) return;
      try {
        const r = await concluirHigienizacao(leitos.map((l) => ({ id: l.id, versao: l.versao })));
        const texto = [
          r.concluidos.length > 0 ? tl.avisos.higienizacaoConcluida(r.concluidos.length) : '',
          r.ignorados.length > 0 ? tl.avisos.leitosQueMudaram(r.ignorados.length) : '',
        ]
          .filter(Boolean)
          .join('. ');
        if (r.ignorados.length > 0) toast.aviso(texto);
        else toast.sucesso(texto);
      } catch (e) {
        tratarErro(e);
      }
    },
    [confirmar, toast, tratarErro],
  );

  const abrirInternacao = useCallback(
    async (id: string | undefined, abrir: (i: InternacaoDetalhada) => void) => {
      if (!id) return;
      try {
        abrir(await obterInternacao(id));
      } catch (e) {
        tratarErro(e);
      }
    },
    [tratarErro],
  );

  const desbloquearLeito = useCallback(
    async (leito: Leito) => {
      const ok = await confirmar({
        titulo: d.desbloquearTitulo(leito.codigo),
        mensagem: d.desbloquearMensagem,
        rotuloConfirmar: d.desbloquear,
      });
      if (!ok) return;
      try {
        await desbloquear(leito.id, leito.versao);
        toast.sucesso(d.desbloqueado(leito.codigo));
      } catch (e) {
        tratarErro(e);
      }
    },
    [confirmar, toast, tratarErro],
  );

  const cancelarReservaDoLeito = useCallback(
    async (leito: Leito) => {
      if (!leito.solicitacaoId) return;
      const ok = await confirmar({
        titulo: tl.solicitacoes.cancelarReservaTitulo(leito.codigo),
        mensagem: tl.solicitacoes.cancelarReservaMensagem,
        rotuloConfirmar: tl.solicitacoes.cancelarReserva,
        perigo: true,
      });
      if (!ok) return;
      try {
        const s = await obterSolicitacao(leito.solicitacaoId);
        await cancelarReserva(s.id, s.versao);
        toast.sucesso(tl.solicitacoes.reservaCancelada);
      } catch (e) {
        tratarErro(e);
      }
    },
    [confirmar, toast, tratarErro],
  );

  /** Ação escolhida no cartão do leito ou no detalhe do leito. */
  const executar = useCallback(
    (acao: AcaoLeito, leito: LeitoDetalhado) => {
      switch (acao) {
        case 'concluir':
          return void concluir(leito);
        case 'bloquear':
          return setBloqueando(leito);
        case 'desbloquear':
          return void desbloquearLeito(leito);
        case 'transferir':
          return void abrirInternacao(leito.internacaoId, setTransferindo);
        case 'darAlta':
          return void abrirInternacao(leito.internacaoId, setDarAlta);
        case 'cancelarReserva':
          return void cancelarReservaDoLeito(leito);
        case 'internar':
          return navigate(
            leito.status === 'reservado' && leito.solicitacaoId
              ? `/leitos/internar?solicitacaoId=${leito.solicitacaoId}`
              : `/leitos/internar?leitoId=${leito.id}`,
          );
      }
    },
    [abrirInternacao, cancelarReservaDoLeito, concluir, desbloquearLeito, navigate],
  );

  const dialogos = (
    <>
      <DialogoBloqueio
        leito={bloqueando}
        aoFechar={() => setBloqueando(null)}
        aoConfirmar={async (dados) => {
          const l = bloqueando!;
          try {
            await bloquear(l.id, dados, l.versao);
          } catch (e) {
            if (
              e instanceof ErroConcorrencia ||
              (e instanceof ErroConflito && e.codigo === 'transicao_invalida')
            ) {
              setBloqueando(null);
              tratarErro(e);
              return;
            }
            throw e;
          }
          setBloqueando(null);
          toast.sucesso(d.bloqueado(l.codigo));
        }}
      />
      <DialogoTransferir
        internacao={transferindo}
        aoFechar={() => setTransferindo(null)}
        aoTransferir={(_, de, para) => {
          setTransferindo(null);
          toast.sucesso(tl.avisos.transferido(de, para));
        }}
        aoErro={(e) => {
          setTransferindo(null);
          tratarErro(e);
        }}
      />
      <DialogoAlta
        internacao={darAlta}
        aoFechar={() => setDarAlta(null)}
        aoRegistrar={(r) => {
          const i = darAlta!;
          setDarAlta(null);
          const extra =
            r.consultasCanceladas > 0 ? ` ${d.consultasCanceladas(r.consultasCanceladas)}` : '';
          toast.sucesso(`${tl.avisos.altaRegistrada(r.leitoCodigo)}.${extra}`, {
            acao: {
              rotulo: tl.desfazer,
              aoClicar: () => void abrirInternacao(i.id, setDesfazendo),
            },
          });
        }}
        aoErro={(e) => {
          setDarAlta(null);
          tratarErro(e);
        }}
      />
      <DialogoMotivo
        aberto={desfazendo !== null}
        titulo={desfazendo ? d.desfazerTitulo(desfazendo.pacienteNome) : ''}
        descricao={
          desfazendo?.desfazerAltaAte
            ? `${d.desfazerDescricao} ${tl.detalhe.desfazerAte(horaDoInstante(desfazendo.desfazerAltaAte))}`
            : d.desfazerDescricao
        }
        rotulo={d.motivoCorrecao}
        rotuloConfirmar={d.desfazer}
        aoFechar={() => setDesfazendo(null)}
        aoConfirmar={async (motivo) => {
          const i = desfazendo!;
          const r = await desfazerAlta(i.id, motivo, i.versao);
          setDesfazendo(null);
          toast.sucesso(
            r.obitoDesfeito
              ? `${tl.avisos.altaDesfeita} ${d.consultasNaoVoltam}`
              : tl.avisos.altaDesfeita,
          );
        }}
      />
    </>
  );

  return {
    executar,
    concluirSetor,
    transferir: setTransferindo,
    darAlta: setDarAlta,
    desfazerAlta: setDesfazendo,
    tratarErro,
    dialogos,
  };
}
