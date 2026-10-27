import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DialogoCancelamento } from '../components/consultas/DialogoCancelamento';
import { t } from '../i18n/pt-BR';
import {
  cancelarConsulta,
  concluirConsulta,
  marcarFalta,
  registrarEmLote,
} from '../services/consultas';
import { ErroValidacao } from '../services/erros';
import type { ConsultaDetalhada } from '../types';
import { useConfirmar } from './useConfirmar';
import { useToast } from './useToast';

const a = t.agenda;
const mensagemDe = (e: unknown) => (e instanceof Error ? e.message : t.erros.inesperadoTitulo);

/**
 * Ações P11–P13 com confirmação e aviso, usadas na agenda e no detalhe.
 * Renderize `dialogo` (o modal de cancelamento) na página.
 */
export function useAcoesConsulta() {
  const confirmar = useConfirmar();
  const toast = useToast();
  const navigate = useNavigate();
  const [cancelando, setCancelando] = useState<ConsultaDetalhada | null>(null);

  async function registrar(c: ConsultaDetalhada, acao: 'concluida' | 'faltou') {
    const ok = await confirmar({
      titulo:
        acao === 'concluida' ? a.concluirTitulo(c.pacienteNome) : a.faltouTitulo(c.pacienteNome),
      rotuloConfirmar: acao === 'concluida' ? a.acoes.concluir : a.acoes.faltou,
    });
    if (!ok) return false;
    try {
      if (acao === 'concluida') await concluirConsulta(c.id);
      else await marcarFalta(c.id);
      toast.sucesso(acao === 'concluida' ? a.concluida : a.faltaRegistrada);
      return true;
    } catch (e) {
      toast.erro(mensagemDe(e));
      return false;
    }
  }

  /** P13: tudo ou nada (uma transação). */
  async function registrarLote(ids: string[], acao: 'concluida' | 'faltou') {
    const ok = await confirmar({
      titulo:
        acao === 'concluida' ? a.lote.concluirTitulo(ids.length) : a.lote.faltouTitulo(ids.length),
      rotuloConfirmar: acao === 'concluida' ? a.lote.concluir : a.lote.faltou,
    });
    if (!ok) return false;
    try {
      const n = await registrarEmLote(ids, acao);
      toast.sucesso(acao === 'concluida' ? a.lote.concluidas(n) : a.lote.faltas(n));
      return true;
    } catch (e) {
      toast.erro(mensagemDe(e));
      return false;
    }
  }

  const dialogo = (
    <DialogoCancelamento
      consulta={cancelando}
      aoFechar={() => setCancelando(null)}
      aoConfirmar={async (motivo) => {
        const c = cancelando!;
        try {
          await cancelarConsulta(c.id, motivo, c.versao);
        } catch (e) {
          if (e instanceof ErroValidacao) throw new Error(e.campos.motivo ?? e.message);
          throw e;
        }
        setCancelando(null);
        toast.sucesso(a.cancelada, {
          acao: {
            rotulo: a.acoes.agendarNovamente,
            aoClicar: () =>
              navigate(`/consultas/nova?pacienteId=${c.pacienteId}&medicoId=${c.medicoId}`),
          },
        });
      }}
    />
  );

  return {
    concluir: (c: ConsultaDetalhada) => registrar(c, 'concluida'),
    faltou: (c: ConsultaDetalhada) => registrar(c, 'faltou'),
    cancelar: setCancelando,
    registrarLote,
    dialogo,
  };
}
