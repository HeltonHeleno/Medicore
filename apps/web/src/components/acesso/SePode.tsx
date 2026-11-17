import type { Acao } from '@medicore/dominio/permissoes';
import type { ReactNode } from 'react';
import { usePermissao } from '../../hooks/useSessao';

/** Fase 28 (BL-02.6) — Mostra o conteúdo só se o perfil puder fazer a ação (sem login: sempre). */
export function SePode({ acao, children }: { acao: Acao; children: ReactNode }) {
  return usePermissao(acao) ? children : null;
}
