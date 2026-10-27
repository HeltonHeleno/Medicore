import { useCallback, useContext } from 'react';
import { ContextoConfirmacao } from '../components/ui/feedback/contextos';
import type { OpcoesConfirmacao } from '../components/ui/feedback/contextos';

function usePerguntarInterno() {
  const perguntar = useContext(ContextoConfirmacao);
  if (!perguntar) throw new Error('useConfirmar precisa de <ConfirmacaoProvider> acima.');
  return perguntar;
}

/** `const confirmar = useConfirmar(); if (await confirmar({ titulo, perigo: true })) …` */
export function useConfirmar() {
  const perguntar = usePerguntarInterno();
  return useCallback(
    (opcoes: OpcoesConfirmacao) => perguntar(opcoes).then((r) => r.confirmado),
    [perguntar],
  );
}

/** Como `useConfirmar`, mas devolve também o texto do `campoTexto` (ex.: motivo). */
export function usePerguntar() {
  return usePerguntarInterno();
}
