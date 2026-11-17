/**
 * Fase 28 (BL-02.4) — Com login (modo API), o sistema só abre com sessão (`ComLogin.tsx`, carregado
 * à parte: o modo navegador não leva o código do login no pacote).
 */
import { lazy, Suspense, type ReactNode } from 'react';
import { COM_LOGIN } from '../../services/acesso';
import { CarregandoPagina } from '../ui/CarregandoPagina';

const ComLogin = lazy(() => import('./ComLogin'));

export function ProtegerSessao({ children }: { children: ReactNode }) {
  if (!COM_LOGIN) return children;
  return (
    <Suspense fallback={<CarregandoPagina />}>
      <ComLogin>{children}</ComLogin>
    </Suspense>
  );
}
