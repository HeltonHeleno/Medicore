import { useContext } from 'react';
import { ContextoToast } from '../components/ui/feedback/contextos';

/** `const toast = useToast(); toast.sucesso('Paciente cadastrado')`. */
export function useToast() {
  const api = useContext(ContextoToast);
  if (!api) throw new Error('useToast precisa de <ToastProvider> acima.');
  return api;
}
