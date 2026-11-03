/**
 * Inicialização dos módulos operacionais, carregada sob demanda pelo `main.tsx` depois da
 * primeira pintura (fora do pacote inicial):
 * - A15: retenção e rotina diária (no máximo uma vez por dia);
 * - A17: em desenvolvimento, confere as invariantes INV-1 a INV-10 e mostra no console.
 *   Em produção nada é corrigido sozinho (BL-05: monitoramento).
 */
import { verificarConsistencia } from '../utils/consistencia';
import { agora } from '../utils/relogio';
import { retratoAtual } from './colecoes-operacoes';
import { executarRetencao } from './retencao';

export function iniciarOperacoes(): void {
  try {
    executarRetencao();
  } catch {
    /* sem espaço ou dados ilegíveis: tenta de novo na próxima abertura */
  }
  if (import.meta.env.DEV) {
    const violacoes = verificarConsistencia(retratoAtual(), agora().getTime());
    if (violacoes.length > 0) {
      console.warn('[MediCore] Invariantes violadas (A17):', violacoes);
    }
  }
}
