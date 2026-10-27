/**
 * Migrações de esquema dos dados guardados no navegador.
 *
 * Para mudar o formato de uma coleção no futuro:
 * 1. Aumente ESQUEMA_ATUAL.
 * 2. Acrescente em MIGRACOES uma entrada { para: N, executar } que leia as chaves antigas,
 *    transforme e grave as novas.
 * As migrações rodam em ordem, uma única vez, antes de qualquer coleção ser carregada.
 */
import { agora } from '../utils/relogio';

export const ESQUEMA_ATUAL = 1;

export interface AcessoStorage {
  ler: (chave: string) => string | null;
  gravar: (chave: string, valor: string) => void;
  chaveMeta: string;
}

export interface Migracao {
  /** Versão do esquema após executar esta migração. */
  para: number;
  executar: (acesso: AcessoStorage) => void;
}

/** Nenhuma migração ainda: a v1 é o formato inicial. */
export const MIGRACOES: Migracao[] = [];

interface Meta {
  esquema: number;
  semeadoEm: string;
}

function lerMeta(acesso: AcessoStorage): Meta | null {
  try {
    const bruto = acesso.ler(acesso.chaveMeta);
    return bruto ? (JSON.parse(bruto) as Meta) : null;
  } catch {
    return null;
  }
}

/** Executa as migrações pendentes e grava a versão final em `medicore:meta`. */
export function executarMigracoes(
  acesso: AcessoStorage,
  migracoes: Migracao[] = MIGRACOES,
  esquemaAtual: number = ESQUEMA_ATUAL,
): void {
  const meta = lerMeta(acesso);
  let versao = meta?.esquema ?? esquemaAtual; // sem meta = instalação nova, já no formato atual
  for (const m of [...migracoes].sort((a, b) => a.para - b.para)) {
    if (m.para > versao) {
      m.executar(acesso);
      versao = m.para;
    }
  }
  try {
    acesso.gravar(
      acesso.chaveMeta,
      JSON.stringify({ esquema: versao, semeadoEm: meta?.semeadoEm ?? agora().toISOString() }),
    );
  } catch {
    /* sem storage: segue em memória */
  }
}
