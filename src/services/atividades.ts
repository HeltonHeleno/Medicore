/**
 * Linha do tempo do Painel. As atividades são gravadas pelos outros serviços,
 * dentro da mesma transação da operação; só as 200 mais recentes são mantidas.
 */
import { MAX_ATIVIDADES } from '../config/limites';
import type { Atividade, TipoAtividade } from '../types';
import { gerarId } from '../utils/id';
import { agora } from '../utils/relogio';
import { repoAtividades } from './colecoes';
import { executar } from './infra';

const maisRecentes = (lista: readonly Atividade[]) =>
  [...lista].sort((a, b) => b.em.localeCompare(a.em) || b.id.localeCompare(a.id));

/** Uso interno dos serviços (síncrono, para caber na transação). */
export function registrarAtividade(
  tipo: TipoAtividade,
  descricao: string,
  referenciaId?: string,
): Atividade {
  const atividade: Atividade = {
    id: gerarId(),
    tipo,
    descricao,
    em: agora().toISOString(),
    ...(referenciaId ? { referenciaId } : {}),
  };
  repoAtividades.inserir(atividade);
  const todas = repoAtividades.todos();
  if (todas.length > MAX_ATIVIDADES) {
    repoAtividades.substituirTodos(maisRecentes(todas).slice(0, MAX_ATIVIDADES));
  }
  return atividade;
}

/** Atividades da mais recente para a mais antiga. */
export const listarAtividades = ({ limite = 10 }: { limite?: number } = {}) =>
  executar(() => maisRecentes(repoAtividades.todos()).slice(0, limite));
