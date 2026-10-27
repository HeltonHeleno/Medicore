import { useContext } from 'react';
import { ContextoConfirmacao } from '../components/ui/feedback/contextos';

/** `const confirmar = useConfirmar(); if (await confirmar({ titulo, perigo: true })) …` */
export function useConfirmar() {
  const confirmar = useContext(ContextoConfirmacao);
  if (!confirmar) throw new Error('useConfirmar precisa de <ConfirmacaoProvider> acima.');
  return confirmar;
}
