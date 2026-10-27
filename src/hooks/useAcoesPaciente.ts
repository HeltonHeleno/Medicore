import { useNavigate } from 'react-router-dom';
import { t } from '../i18n/pt-BR';
import {
  consultasFuturasDoPaciente,
  excluirPaciente,
  inativarPaciente,
  reativarPaciente,
} from '../services/pacientes';
import { useConfirmar, usePerguntar } from './useConfirmar';
import { useToast } from './useToast';

interface PacienteAlvo {
  id: string;
  nomeExibicao: string;
}

const p = t.pacientes;
const mensagemDe = (e: unknown) => (e instanceof Error ? e.message : t.erros.inesperadoTitulo);

/**
 * Fluxos P3, P4 e P5 com confirmação e aviso, usados na lista e no detalhe.
 * Cada função devolve `true` se a operação foi feita.
 */
export function useAcoesPaciente() {
  const perguntar = usePerguntar();
  const confirmar = useConfirmar();
  const toast = useToast();
  const navigate = useNavigate();

  /** P3: mostra quantas consultas futuras serão canceladas e pede um motivo opcional. */
  async function inativar(alvo: PacienteAlvo): Promise<boolean> {
    try {
      const futuras = await consultasFuturasDoPaciente(alvo.id);
      const { confirmado, texto } = await perguntar({
        titulo: p.inativarTitulo(alvo.nomeExibicao),
        mensagem: p.inativarMensagem(futuras.length),
        perigo: true,
        rotuloConfirmar: p.acoes.inativar,
        campoTexto: { rotulo: p.motivoInativacao, maximo: 200 },
      });
      if (!confirmado) return false;
      const canceladas = await inativarPaciente(alvo.id, texto || undefined);
      toast.sucesso(
        p.inativado(canceladas),
        canceladas > 0
          ? {
              acao: {
                rotulo: p.verCanceladas,
                aoClicar: () => navigate(`/consultas?pacienteId=${alvo.id}&status=cancelada`),
              },
            }
          : undefined,
      );
      return true;
    } catch (e) {
      toast.erro(mensagemDe(e));
      return false;
    }
  }

  /** P4: as consultas canceladas na inativação não voltam. */
  async function reativar(alvo: PacienteAlvo): Promise<boolean> {
    const ok = await confirmar({
      titulo: p.reativarTitulo(alvo.nomeExibicao),
      mensagem: p.reativarMensagem,
      rotuloConfirmar: p.acoes.reativar,
    });
    if (!ok) return false;
    try {
      await reativarPaciente(alvo.id);
      toast.sucesso(p.reativado);
      return true;
    } catch (e) {
      toast.erro(mensagemDe(e));
      return false;
    }
  }

  /** P5: exige digitar o nome; depois volta para a lista. */
  async function excluir(alvo: PacienteAlvo): Promise<boolean> {
    const ok = await confirmar({
      titulo: p.excluirTitulo,
      mensagem: p.excluirMensagem,
      perigo: true,
      exigirTexto: alvo.nomeExibicao,
      rotuloConfirmar: p.acoes.excluir,
    });
    if (!ok) return false;
    try {
      await excluirPaciente(alvo.id);
      toast.sucesso(p.excluido);
      navigate('/pacientes');
      return true;
    } catch (e) {
      toast.erro(mensagemDe(e));
      return false;
    }
  }

  return { inativar, reativar, excluir };
}
