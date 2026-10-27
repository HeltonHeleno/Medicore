import { createElement, useState } from 'react';
import { DialogoInativarMedico } from '../components/medicos/DialogoInativarMedico';
import { t } from '../i18n/pt-BR';
import { reativarMedico } from '../services/medicos';
import { useConfirmar } from './useConfirmar';
import { useToast } from './useToast';

interface MedicoAlvo {
  id: string;
  nomeExibicao: string;
}

/**
 * Ações P8 (inativar, com diálogo bloqueante) e reativar, usadas na lista e no detalhe.
 * Renderize `dialogo` na página.
 */
export function useAcoesMedico() {
  const [inativando, setInativando] = useState<MedicoAlvo | null>(null);
  const confirmar = useConfirmar();
  const toast = useToast();

  async function reativar(alvo: MedicoAlvo) {
    const ok = await confirmar({
      titulo: t.medicos.reativarTitulo(alvo.nomeExibicao),
      mensagem: t.medicos.reativarMensagem,
      rotuloConfirmar: t.medicos.acoes.reativar,
    });
    if (!ok) return;
    try {
      await reativarMedico(alvo.id);
      toast.sucesso(t.medicos.reativado);
    } catch (e) {
      toast.erro(e instanceof Error ? e.message : t.erros.inesperadoTitulo);
    }
  }

  const dialogo = createElement(DialogoInativarMedico, {
    medico: inativando,
    aoFechar: () => setInativando(null),
  });

  return { inativar: setInativando, reativar, dialogo };
}
