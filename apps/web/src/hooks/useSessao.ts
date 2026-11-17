/**
 * Fase 28 (BL-02.6) — A sessão e as permissões na tela.
 *
 * - Modo navegador (sem login): tudo liberado, como sempre.
 * - Modo API: o que o perfil não pode fazer não aparece (o servidor também recusa, com E-20).
 */
import { pode, type Acao } from '@medicore/dominio/permissoes';
import { useCallback, useSyncExternalStore } from 'react';
import { assinarSessao, COM_LOGIN, sessaoAtual, sessaoTerminou } from '../services/acesso';

export const useSessao = () => useSyncExternalStore(assinarSessao, sessaoAtual);

/** E-19: a sessão terminou com a tela aberta. */
export const useSessaoTerminou = () => useSyncExternalStore(assinarSessao, sessaoTerminou);

/** `const podeFazer = usePode(); podeFazer('internacao.alta')`. */
export function usePode(): (acao: Acao) => boolean {
  const sessao = useSessao();
  return useCallback(
    (acao: Acao) => !COM_LOGIN || (!!sessao && pode(sessao.usuario.perfis, acao)),
    [sessao],
  );
}

export const usePermissao = (acao: Acao): boolean => usePode()(acao);
