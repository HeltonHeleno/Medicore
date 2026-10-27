/**
 * Repositório local (D2): coleções em memória persistidas no localStorage.
 *
 * Garantias (seção "Persistência" da especificação):
 * - Transação (M4): várias alterações em várias coleções são gravadas juntas ou nenhuma é.
 * - Cota (M5): se o navegador recusar gravar, tudo é desfeito e lança ErroArmazenamento (E-06).
 * - Dados corrompidos: são guardados em backup, a coleção é recriada pelo seed e há aviso (E-07).
 * - Abas (M6): alterações feitas em outra aba chegam pelo evento `storage` e notificam as telas.
 * - Itens guardados são congelados (imutáveis): alterar = substituir por um novo objeto.
 */
import { ALERTA_ARMAZENAMENTO, LIMITE_ARMAZENAMENTO_BYTES } from '../config/limites';
import { agora } from '../utils/relogio';
import { ErroArmazenamento } from './erros';
import { executarMigracoes } from './migracoes';

export const PREFIXO = 'medicore:';
export const CHAVE_META = `${PREFIXO}meta`;

export type Aviso = 'dados_corrompidos' | 'armazenamento_quase_cheio';
type Ouvinte = (colecoesAlteradas: ReadonlySet<string>) => void;
type OuvinteAviso = (aviso: Aviso) => void;

interface Colecao {
  nome: string;
  chave: string;
  semear: () => { id: string }[];
  itens: Map<string, { id: string }> | null; // null = ainda não carregada
}

// ───────────────────────── estado do módulo ─────────────────────────

const colecoes = new Map<string, Colecao>();
const ouvintes = new Set<Ouvinte>();
const ouvintesAviso = new Set<OuvinteAviso>();
let emTransacao: {
  copias: Map<string, Map<string, { id: string }> | null>;
  sujas: Set<string>;
} | null = null;
let avisoCotaDado = false;
let migracoesExecutadas = false;

// ───────────────────────── localStorage tolerante ─────────────────────────

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // acesso bloqueado (privacidade do navegador)
  }
}

function lerChave(chave: string): string | null {
  try {
    return storage()?.getItem(chave) ?? null;
  } catch {
    return null;
  }
}

function ehErroDeCota(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)
  );
}

/** Grava; sem storage disponível, segue só em memória. Cota estourada → ErroArmazenamento. */
function gravarChave(chave: string, valor: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(chave, valor);
  } catch (e) {
    if (ehErroDeCota(e)) throw new ErroArmazenamento();
    throw e;
  }
}

function avisar(aviso: Aviso) {
  for (const o of ouvintesAviso) o(aviso);
}

function congelar<T>(obj: T): T {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj as object)) congelar(v);
  }
  return obj;
}

// ───────────────────────── carga ─────────────────────────

function garantirMigracoes() {
  if (migracoesExecutadas) return;
  migracoesExecutadas = true;
  executarMigracoes({ ler: lerChave, gravar: gravarChave, chaveMeta: CHAVE_META });
}

function carregar(c: Colecao): Map<string, { id: string }> {
  if (c.itens) return c.itens;
  garantirMigracoes();

  const bruto = lerChave(c.chave);
  let lista: { id: string }[] | null = null;

  if (bruto !== null) {
    try {
      const dados = JSON.parse(bruto);
      if (Array.isArray(dados) && dados.every((x) => x && typeof x.id === 'string')) lista = dados;
    } catch {
      /* tratado abaixo */
    }
    if (!lista) {
      // E-07: guarda o conteúdo ilegível para análise e recria a coleção.
      try {
        gravarChave(`${PREFIXO}backup:${agora().toISOString()}:${c.nome}`, bruto);
      } catch {
        /* sem espaço para backup: segue mesmo assim */
      }
      avisar('dados_corrompidos');
    }
  }

  if (!lista) {
    lista = c.semear();
    try {
      gravarChave(c.chave, JSON.stringify(lista));
    } catch {
      /* sem espaço: os dados de exemplo ficam só em memória nesta sessão */
    }
  }

  c.itens = new Map(lista.map((item) => [item.id, congelar(item)]));
  return c.itens;
}

// ───────────────────────── transação e notificação ─────────────────────────

function notificar(alteradas: ReadonlySet<string>) {
  if (alteradas.size === 0) return;
  for (const o of ouvintes) o(alteradas);
}

/** Bytes usados pelas chaves do MediCore (UTF-16: 2 bytes por caractere). */
export function usoArmazenamento(): number {
  const s = storage();
  if (!s) return 0;
  let total = 0;
  try {
    for (let i = 0; i < s.length; i++) {
      const chave = s.key(i);
      if (chave?.startsWith(PREFIXO)) total += (chave.length + (s.getItem(chave)?.length ?? 0)) * 2;
    }
  } catch {
    return 0;
  }
  return total;
}

function verificarCota() {
  if (avisoCotaDado) return;
  if (usoArmazenamento() > LIMITE_ARMAZENAMENTO_BYTES * ALERTA_ARMAZENAMENTO) {
    avisoCotaDado = true;
    avisar('armazenamento_quase_cheio');
  }
}

/**
 * Executa `fn` como uma unidade: se qualquer coisa lançar erro (regra de negócio,
 * cota, outro), todas as coleções voltam ao estado anterior, na memória e no storage.
 * Transações aninhadas viram parte da transação de fora.
 * Os ouvintes são notificados uma única vez, só se tudo der certo.
 */
export function transacao<R>(fn: () => R): R {
  if (emTransacao) return fn();

  emTransacao = { copias: new Map(), sujas: new Set() };
  const atual = emTransacao;
  try {
    const resultado = fn();

    // Grava as coleções alteradas; guarda o JSON anterior para desfazer se falhar no meio.
    const gravadas: { chave: string; anterior: string | null }[] = [];
    try {
      for (const nome of atual.sujas) {
        const c = colecoes.get(nome)!;
        gravadas.push({ chave: c.chave, anterior: lerChave(c.chave) });
        gravarChave(c.chave, JSON.stringify([...c.itens!.values()]));
      }
    } catch (e) {
      for (const g of gravadas.reverse()) {
        try {
          if (g.anterior !== null) gravarChave(g.chave, g.anterior);
        } catch {
          /* melhor esforço */
        }
      }
      throw e;
    }

    emTransacao = null;
    notificar(atual.sujas);
    verificarCota();
    return resultado;
  } catch (e) {
    for (const [nome, copia] of atual.copias) colecoes.get(nome)!.itens = copia;
    emTransacao = null;
    throw e;
  }
}

/** Marca a coleção como alterada (e tira a cópia para desfazer, na primeira vez). */
function tocar(c: Colecao, executar: (itens: Map<string, { id: string }>) => void) {
  transacao(() => {
    const itens = carregar(c);
    if (!emTransacao!.copias.has(c.nome)) emTransacao!.copias.set(c.nome, new Map(itens));
    emTransacao!.sujas.add(c.nome);
    executar(itens);
  });
}

// ───────────────────────── API pública ─────────────────────────

export interface Repositorio<T extends { id: string }> {
  readonly nome: string;
  todos(): readonly T[];
  obter(id: string): T | undefined;
  /** Insere; se o item tiver `versao`, começa em 1; `criadoEm`/`atualizadoEm` são preenchidos. */
  inserir(item: T): T;
  /** Substitui campos; incrementa `versao` e atualiza `atualizadoEm` quando existirem. */
  atualizar(id: string, mudancas: Partial<T>): T;
  remover(id: string): void;
  /** Troca todos os itens (usado por seeds, migrações e limpeza de atividades). */
  substituirTodos(itens: T[]): void;
}

export function criarRepositorio<T extends { id: string }>(
  nome: string,
  semear: () => T[],
): Repositorio<T> {
  const chave = `${PREFIXO}${nome}:v1`;
  const existente = colecoes.get(nome);
  const c: Colecao = existente ?? { nome, chave, semear, itens: null };
  c.semear = semear;
  colecoes.set(nome, c);

  return {
    nome,
    todos: () => [...carregar(c).values()] as T[],
    obter: (id) => carregar(c).get(id) as T | undefined,
    inserir(item) {
      const momento = agora().toISOString();
      const novo = { ...item } as Record<string, unknown>;
      if ('versao' in novo) novo.versao = 1;
      if ('criadoEm' in novo || 'versao' in novo) {
        novo.criadoEm = novo.criadoEm || momento;
        novo.atualizadoEm = momento;
      }
      congelar(novo);
      tocar(c, (itens) => itens.set(item.id, novo as T));
      return novo as T;
    },
    atualizar(id, mudancas) {
      let resultado: T | undefined;
      tocar(c, (itens) => {
        const anterior = itens.get(id) as Record<string, unknown> | undefined;
        if (!anterior) throw new Error(`Registro ${id} não existe em ${nome}`);
        const novo: Record<string, unknown> = { ...anterior, ...mudancas, id };
        if (typeof anterior.versao === 'number') novo.versao = anterior.versao + 1;
        if ('atualizadoEm' in anterior) novo.atualizadoEm = agora().toISOString();
        congelar(novo);
        itens.set(id, novo as unknown as T);
        resultado = novo as unknown as T;
      });
      return resultado!;
    },
    remover(id) {
      tocar(c, (itens) => itens.delete(id));
    },
    substituirTodos(lista) {
      tocar(c, (itens) => {
        itens.clear();
        for (const item of lista) itens.set(item.id, congelar({ ...item }));
      });
    },
  };
}

/** Assina alterações (desta aba e de outras). Devolve a função para cancelar. */
export function assinar(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

/** Assina avisos não bloqueantes (E-07, alerta de 80%). */
export function assinarAvisos(ouvinte: OuvinteAviso): () => void {
  ouvintesAviso.add(ouvinte);
  return () => ouvintesAviso.delete(ouvinte);
}

/**
 * Apaga todas as chaves `medicore:*` (exceto o tema) e esvazia a memória:
 * no próximo acesso, cada coleção é semeada de novo. Usado nos testes e em
 * "Restaurar dados de exemplo".
 */
export function resetar(): void {
  const s = storage();
  if (s) {
    try {
      const chaves: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k?.startsWith(PREFIXO)) chaves.push(k);
      }
      chaves.forEach((k) => s.removeItem(k));
    } catch {
      /* sem storage */
    }
  }
  for (const c of colecoes.values()) c.itens = null;
  migracoesExecutadas = false;
  avisoCotaDado = false;
  notificar(new Set(colecoes.keys()));
}

/** Só para testes: esquece a memória sem tocar no storage (simula recarregar a página). */
export function descarregarMemoria(): void {
  for (const c of colecoes.values()) c.itens = null;
  migracoesExecutadas = false;
}

// ───────────────────────── sincronização entre abas (M6) ─────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (evento) => {
    if (evento.key === null) {
      // Outra aba limpou o storage inteiro.
      for (const c of colecoes.values()) c.itens = null;
      notificar(new Set(colecoes.keys()));
      return;
    }
    if (!evento.key.startsWith(PREFIXO)) return;
    for (const c of colecoes.values()) {
      if (c.chave === evento.key && c.itens) {
        c.itens = null; // recarrega na próxima leitura, já com os dados da outra aba
        notificar(new Set([c.nome]));
      }
    }
  });
}
