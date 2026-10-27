/**
 * Comportamento comum das funções públicas dos serviços: imitam uma API real
 * (assíncronas, com latência, devolvendo cópias) e respeitam VITE_SIMULAR_ERRO.
 */
import { t } from '../i18n/pt-BR';
import { delay } from './api';

const LATENCIA = import.meta.env.MODE === 'test' ? 0 : 300;
const SIMULAR_ERRO = import.meta.env.VITE_SIMULAR_ERRO === 'true';

export async function executar<T>(operacao: () => T): Promise<T> {
  await delay(LATENCIA);
  if (SIMULAR_ERRO) throw new Error(t.erro.simulado);
  return structuredClone(operacao());
}
