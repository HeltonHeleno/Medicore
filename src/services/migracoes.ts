/**
 * Migrações de esquema dos dados guardados no navegador.
 *
 * Para mudar o formato de uma coleção no futuro:
 * 1. Aumente ESQUEMA_ATUAL.
 * 2. Acrescente em MIGRACOES uma entrada { para: N, executar } que leia as chaves antigas,
 *    transforme e grave as novas.
 * As migrações rodam em ordem, uma única vez, antes de qualquer coleção ser carregada.
 */
import { gerarPacientesExtras } from '../data/seeds/pacientes-extras';
import type { Paciente } from '../types';
import { agora } from '../utils/relogio';

export const ESQUEMA_ATUAL = 2;

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

/**
 * v2 (Fase 15, D13 / A16): acrescenta à instalação 1.1.0 os 90 pacientes de exemplo extras,
 * para que os módulos de leitos e emergência tenham pacientes suficientes. Não muda nenhum
 * formato; só soma os que faltam (pelo id), sem repetir CPF. Fica numa migração para rodar
 * antes de qualquer coleção ser carregada (e não no meio da semeadura de outra coleção).
 */
export const migracaoPacientesExtras: Migracao = {
  para: 2,
  executar(acesso) {
    const chave = 'medicore:pacientes:v1';
    const bruto = acesso.ler(chave);
    if (bruto === null) return; // ainda não semeado: a semente já inclui os extras
    let lista: Paciente[];
    try {
      lista = JSON.parse(bruto) as Paciente[];
      if (!Array.isArray(lista)) return;
    } catch {
      return; // ilegível: o repositório trata (E-07)
    }
    const ids = new Set(lista.map((p) => p.id));
    const usados = new Set(
      lista.flatMap((p) => [p.cpf, ...(p.responsavel ? [p.responsavel.cpf] : [])]),
    );
    const extras = gerarPacientesExtras(usados, agora().toISOString()).filter(
      (p) => !ids.has(p.id),
    );
    if (extras.length > 0) acesso.gravar(chave, JSON.stringify([...lista, ...extras]));
  },
};

export const MIGRACOES: Migracao[] = [migracaoPacientesExtras];

interface Meta {
  esquema: number;
  semeadoEm: string;
  /** Outros campos (ex.: `retencaoEm`) são mantidos. */
  [campo: string]: unknown;
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
      JSON.stringify({
        ...meta,
        esquema: versao,
        semeadoEm: meta?.semeadoEm ?? agora().toISOString(),
      }),
    );
  } catch {
    /* sem storage: segue em memória */
  }
}
