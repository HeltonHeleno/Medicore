/**
 * Fase 27 (D26) — No modo API, este arquivo toma o lugar de `services/repositorio.ts`: os dados
 * ficam no servidor e o navegador só avisa as telas quando precisam recarregar.
 *
 * - Depois de cada gravação aceita pela API (desta aba), todas as coleções "mudaram".
 * - A cada 30 s, com a aba visível, as coleções dos módulos operacionais "mudaram": a fila, o mapa,
 *   o estoque e o Painel mostram o que outras pessoas fizeram (até o tempo real do BL-06).
 * - Nada de dados no `localStorage` (só tema e preferências).
 */
import { NOMES_OPERACOES } from '../nomes-colecoes-operacoes';
import { aoConcluirGravacao } from './rede';

type Ouvinte = (colecoesAlteradas: ReadonlySet<string>) => void;

export const CADASTROS = ['pacientes', 'medicos', 'consultas', 'atividades'] as const;
export const OPERACIONAIS: readonly string[] = Object.values(NOMES_OPERACOES);
export const INTERVALO_RECARGA_MS = 30_000;

const ouvintes = new Set<Ouvinte>();
let relogio: ReturnType<typeof setInterval> | null = null;

function avisar(alteradas: ReadonlySet<string>) {
  for (const o of ouvintes) o(alteradas);
}

const visivel = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';

/** Mesmo contrato do repositório local: o ouvinte recebe os nomes das coleções alteradas. */
export function assinar(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  if (!relogio) {
    relogio = setInterval(() => {
      if (visivel()) avisar(new Set(OPERACIONAIS));
    }, INTERVALO_RECARGA_MS);
  }
  return () => {
    ouvintes.delete(ouvinte);
    if (ouvintes.size === 0 && relogio) {
      clearInterval(relogio);
      relogio = null;
    }
  };
}

/** Gravação própria aceita: tudo recarrega (D26). */
export function notificarGravacao(): void {
  avisar(new Set([...CADASTROS, ...OPERACIONAIS]));
}

aoConcluirGravacao(notificarGravacao);
