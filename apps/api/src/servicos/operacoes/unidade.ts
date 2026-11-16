/**
 * Fase 26 (BL-01.5, R-API3) — Unidade de trabalho dos módulos operacionais.
 *
 * As regras de leitos, emergência e farmácia são as mesmas dos serviços do navegador, que são
 * **síncronos** (rodam sobre coleções em memória). Para não reescrever (e arriscar) cada regra, a API
 * roda o mesmo código sobre repositórios em memória **preenchidos a partir do banco dentro de uma
 * transação**:
 *
 * 1. A operação roda; quando pede um dado que ainda não foi lido (`repoLeitos.todos()`,
 *    `repoPacientes.obter(id)`…), ela é interrompida (`Faltando`), o dado é lido do banco e a operação
 *    roda de novo, do começo. Nada foi gravado: as mudanças ficam em memória até o fim.
 * 2. Quando ela termina sem faltar nada, as mudanças (inserções, alterações e remoções) são gravadas
 *    na mesma transação, e a transação é confirmada.
 *
 * Isolamento:
 * - Gravações: `SERIALIZABLE`. Em conflito de serialização (ou impasse), a operação inteira roda de
 *   novo, até 3 vezes, antes de devolver E-16 (R-API3). Além disso, as gravações de cada área
 *   (`internacao`: leitos e emergência; `estoque`: farmácia) travam a tabela principal da área
 *   (`LOCK TABLE leitos | lotes IN SHARE ROW EXCLUSIVE MODE`) antes de ler qualquer coisa: duas
 *   gravações da mesma área esperam uma pela outra, em vez de virarem novas tentativas. As leituras
 *   não esperam (o modo não bloqueia `SELECT`).
 *
 *   A trava precisa ser um `LOCK TABLE` e vir antes da primeira leitura: no `SERIALIZABLE`, o retrato
 *   da transação é tirado no primeiro `SELECT` — uma trava pedida por `SELECT pg_advisory_xact_lock`
 *   tiraria o retrato **antes** de esperar, e a transação leria dados velhos.
 * - Os lotes são lidos com `FOR UPDATE` e os pacientes com `FOR SHARE` (ninguém inativa o paciente no
 *   meio de uma internação; a inativação, que é do cadastro, espera).
 * - Leituras: `REPEATABLE READ READ ONLY`: tudo o que a tela recebe é do mesmo instante.
 */
import { to } from '@medicore/dominio/i18n/pt-BR/operacoes';
import { ErroConflito } from '@medicore/dominio/erros';
import { agora } from '@medicore/dominio/utils/relogio';
import { asc, getTableColumns, getTableName, inArray, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Banco } from '../../banco/conexao';
import { deLinha } from '../../banco/conversao';
import * as e from '../../banco/esquema';
import { linhaAtendimento, linhaConsulta } from '../../banco/semear';
import { type Executor, paraBanco } from '../comum';

export type Area = 'internacao' | 'estoque';
type Modo = 'leitura' | 'gravacao';

/** Quantas vezes uma gravação roda de novo depois de um conflito de serialização (R-API3). */
export const NOVAS_TENTATIVAS = 3;

/** A operação pediu um dado que ainda não foi lido. */
class Faltando {
  readonly carregar: (tx: Executor) => Promise<void>;
  constructor(carregar: (tx: Executor) => Promise<void>) {
    this.carregar = carregar;
  }
}

/** Linhas lidas do banco, guardadas entre as rodadas da mesma transação. */
interface Lido<T> {
  linhas: Map<string, T>;
  /** Ids pedidos que não existem. */
  ausentes: Set<string>;
  inteira: boolean;
  consultas: Set<string>;
}

type Item = { id: string } & Record<string, unknown>;

interface ConfigRepo {
  tabela: PgTable;
  /** `inteira`: lê a tabela toda no primeiro uso. `parcial`: lê por id ou por consulta. */
  leitura: 'inteira' | 'parcial';
  ordem: (t: PgTable) => SQL[];
  /** Ids que valem ser lidos junto quando um id falta (evita uma rodada por paciente). */
  junto?: (u: Unidade) => Iterable<string>;
  travaGravacao?: 'update' | 'share';
}

const colunas = (t: PgTable) => getTableColumns(t) as Record<string, unknown>;
const porCriacao = (t: PgTable) => [
  asc((colunas(t).criadoEm as never) ?? sql`1`),
  asc(colunas(t).id as never),
];
const porMomento = (t: PgTable) => [asc(colunas(t).em as never), asc(colunas(t).id as never)];

const CONFIG = {
  pacientes: {
    tabela: e.pacientes,
    leitura: 'parcial',
    ordem: porCriacao,
    travaGravacao: 'share',
    junto: (u) => u.idsReferenciados('pacienteId'),
  },
  medicos: { tabela: e.medicos, leitura: 'inteira', ordem: porCriacao },
  consultas: { tabela: e.consultas, leitura: 'parcial', ordem: porCriacao },
  atividades: { tabela: e.atividades, leitura: 'parcial', ordem: porMomento },
  leitos: { tabela: e.leitos, leitura: 'inteira', ordem: porCriacao },
  atendimentos: { tabela: e.atendimentos, leitura: 'inteira', ordem: porCriacao },
  solicitacoes: { tabela: e.solicitacoes, leitura: 'inteira', ordem: porCriacao },
  internacoes: { tabela: e.internacoes, leitura: 'inteira', ordem: porCriacao },
  medicamentos: { tabela: e.medicamentos, leitura: 'inteira', ordem: porCriacao },
  lotes: { tabela: e.lotes, leitura: 'inteira', ordem: porCriacao, travaGravacao: 'update' },
  dispensacoes: { tabela: e.dispensacoes, leitura: 'inteira', ordem: porCriacao },
  movimentacoes: { tabela: e.movimentacoes, leitura: 'parcial', ordem: porMomento },
  resumos: { tabela: e.resumos, leitura: 'inteira', ordem: (t) => [asc(colunas(t).id as never)] },
} satisfies Record<string, ConfigRepo>;

export type NomeRepo = keyof typeof CONFIG;
/** Ordem das chaves estrangeiras: inserções nesta ordem, remoções na inversa. */
const ORDEM = Object.keys(e.TABELAS) as NomeRepo[];

/** Linha do domínio → valores das colunas (com as colunas que só existem no banco). */
function paraLinha(nome: NomeRepo, item: Item): Record<string, unknown> {
  if (nome === 'consultas') return linhaConsulta(item as never);
  if (nome === 'atendimentos') return linhaAtendimento(item as never);
  return item;
}

function congelar<T>(obj: T): T {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj as object)) congelar(v);
  }
  return obj;
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Repositório em memória de uma rodada, sobre as linhas já lidas. Mesma interface do navegador. */
export class RepoMemoria<T extends { id: string }> {
  private readonly mudados = new Map<string, Item | null>();
  private readonly inseridos: string[] = [];
  private substituido = false;

  readonly nome: NomeRepo;
  private readonly u: Unidade;

  constructor(nome: NomeRepo, u: Unidade) {
    this.nome = nome;
    this.u = u;
  }

  private get config(): ConfigRepo {
    return CONFIG[this.nome];
  }

  private get lido(): Lido<Item> {
    return this.u.lido(this.nome);
  }

  private exigirInteira(): void {
    if (!this.lido.inteira) {
      throw new Faltando(async (tx) => {
        const linhas = (await this.u.selecionar(this.nome, tx)) as Record<string, unknown>[];
        this.u.guardar(this.nome, linhas);
        this.lido.inteira = true;
      });
    }
  }

  private base(id: string): Item | undefined {
    if (this.mudados.has(id)) return this.mudados.get(id) ?? undefined;
    return this.lido.linhas.get(id);
  }

  todos(): readonly T[] {
    this.exigirInteira();
    const lista: Item[] = [];
    for (const [id, item] of this.lido.linhas) {
      const atual = this.mudados.has(id) ? this.mudados.get(id) : item;
      if (atual) lista.push(atual);
    }
    for (const id of this.inseridos) {
      const item = this.mudados.get(id);
      if (item && !this.lido.linhas.has(id)) lista.push(item);
    }
    return lista as unknown as T[];
  }

  obter(id: string): T | undefined {
    if (this.config.leitura === 'inteira') this.exigirInteira();
    if (this.mudados.has(id)) return (this.mudados.get(id) ?? undefined) as T | undefined;
    const lido = this.lido;
    if (lido.linhas.has(id)) return lido.linhas.get(id) as unknown as T;
    if (lido.inteira || lido.ausentes.has(id)) return undefined;
    throw new Faltando(async (tx) => {
      const ids = new Set([id, ...(this.config.junto?.(this.u) ?? [])]);
      for (const conhecido of lido.linhas.keys()) ids.delete(conhecido);
      for (const ausente of lido.ausentes) ids.delete(ausente);
      ids.add(id);
      const t = this.config.tabela;
      const linhas = (await this.u.selecionar(
        this.nome,
        tx,
        inArray(colunas(t).id as never, [...ids]),
      )) as Record<string, unknown>[];
      this.u.guardar(this.nome, linhas);
      for (const i of ids) if (!lido.linhas.has(i)) lido.ausentes.add(i);
    });
  }

  /**
   * Linhas que atendem a uma condição (para as tabelas lidas aos poucos: as consultas futuras de um
   * paciente, as movimentações de um medicamento). `chave` identifica a condição.
   */
  onde(chave: string, condicao: (t: PgTable) => SQL, filtro: (item: T) => boolean): T[] {
    const lido = this.lido;
    if (!lido.inteira && !lido.consultas.has(chave)) {
      throw new Faltando(async (tx) => {
        const linhas = (await this.u.selecionar(
          this.nome,
          tx,
          condicao(this.config.tabela),
        )) as Record<string, unknown>[];
        this.u.guardar(this.nome, linhas);
        lido.consultas.add(chave);
      });
    }
    const lista: Item[] = [];
    const vistos = new Set<string>();
    for (const [id, item] of lido.linhas) {
      vistos.add(id);
      const atual = this.mudados.has(id) ? this.mudados.get(id) : item;
      if (atual && filtro(atual as unknown as T)) lista.push(atual);
    }
    for (const id of this.inseridos) {
      const item = this.mudados.get(id);
      if (item && !vistos.has(id) && filtro(item as unknown as T)) lista.push(item);
    }
    return lista as unknown as T[];
  }

  /** Insere; se o item tiver `versao`, começa em 1; `criadoEm`/`atualizadoEm` são preenchidos. */
  inserir(item: T): T {
    const momento = agora().toISOString();
    const novo = { ...item } as Item;
    if ('versao' in novo) novo.versao = 1;
    if ('criadoEm' in novo || 'versao' in novo) {
      novo.criadoEm = novo.criadoEm || momento;
      novo.atualizadoEm = momento;
    }
    congelar(novo);
    this.mudados.set(novo.id, novo);
    this.inseridos.push(novo.id);
    return novo as unknown as T;
  }

  /** Substitui campos; incrementa `versao` e atualiza `atualizadoEm` quando existirem. */
  atualizar(id: string, mudancas: Partial<T>): T {
    const anterior = this.obter(id) as Item | undefined;
    if (!anterior) throw new Error(`Registro ${id} não existe em ${this.nome}`);
    const novo: Item = { ...anterior, ...(mudancas as object), id };
    for (const [k, v] of Object.entries(novo)) if (v === undefined) delete novo[k];
    if (typeof anterior.versao === 'number') novo.versao = anterior.versao + 1;
    if ('atualizadoEm' in anterior) novo.atualizadoEm = agora().toISOString();
    congelar(novo);
    this.mudados.set(id, novo);
    return novo as unknown as T;
  }

  remover(id: string): void {
    this.obter(id);
    this.mudados.set(id, null);
  }

  /** Troca todos os itens (usado pela retenção). */
  substituirTodos(lista: T[]): void {
    const atuais = new Set(this.todos().map((x) => x.id));
    const novos = new Set(lista.map((x) => x.id));
    for (const id of atuais) if (!novos.has(id)) this.mudados.set(id, null);
    for (const item of lista) {
      if (this.base(item.id) === (item as unknown as Item)) continue;
      if (!this.lido.linhas.has(item.id) && !this.inseridos.includes(item.id)) {
        this.inseridos.push(item.id);
      }
      this.mudados.set(item.id, congelar({ ...item } as unknown as Item));
    }
    this.substituido = true;
  }

  get alterado(): boolean {
    return this.mudados.size > 0 || this.substituido;
  }

  /** Grava as mudanças desta rodada. */
  async gravarInsercoes(tx: Executor): Promise<void> {
    const t = this.config.tabela;
    const novos = this.inseridos
      .filter((id) => !this.lido.linhas.has(id))
      .map((id) => this.mudados.get(id))
      .filter((x): x is Item => !!x)
      .map((x) => paraBanco(this.filtrar(paraLinha(this.nome, x))));
    for (let i = 0; i < novos.length; i += 200) {
      await tx.insert(t).values(novos.slice(i, i + 200) as never);
    }
  }

  async gravarAlteracoes(tx: Executor): Promise<void> {
    const t = this.config.tabela;
    const id = colunas(t).id;
    for (const [chave, novo] of this.mudados) {
      const antigo = this.lido.linhas.get(chave);
      if (!antigo || !novo) continue;
      const linhaNova = paraLinha(this.nome, novo);
      const linhaAntiga = paraLinha(this.nome, antigo);
      const mudancas: Record<string, unknown> = {};
      for (const k of new Set([...Object.keys(linhaNova), ...Object.keys(linhaAntiga)])) {
        if (!igual(linhaNova[k], linhaAntiga[k])) mudancas[k] = linhaNova[k];
      }
      if (Object.keys(mudancas).length === 0) continue;
      await tx
        .update(t)
        .set(paraBanco(this.filtrar(mudancas)) as never)
        .where(sql`${id} = ${chave}`);
    }
  }

  async gravarRemocoes(tx: Executor): Promise<void> {
    const t = this.config.tabela;
    const ids = [...this.mudados]
      .filter(([id, item]) => item === null && this.lido.linhas.has(id))
      .map(([id]) => id);
    if (ids.length) await tx.delete(t).where(inArray(colunas(t).id as never, ids));
  }

  /** Só as colunas da tabela; um campo do domínio sem coluna é erro de programação. */
  private filtrar(linha: Record<string, unknown>): Record<string, unknown> {
    const cols = colunas(this.config.tabela);
    for (const k of Object.keys(linha)) {
      if (!(k in cols))
        throw new Error(`Campo ${k} não existe em ${getTableName(this.config.tabela)}`);
    }
    return linha;
  }
}

/** Uma transação: o que já foi lido do banco e os repositórios da rodada atual. */
export class Unidade {
  private readonly lidos = new Map<NomeRepo, Lido<Item>>();
  private repos = new Map<NomeRepo, RepoMemoria<{ id: string }>>();

  readonly modo: Modo;

  constructor(modo: Modo) {
    this.modo = modo;
  }

  lido(nome: NomeRepo): Lido<Item> {
    let l = this.lidos.get(nome);
    if (!l) {
      l = { linhas: new Map(), ausentes: new Set(), inteira: false, consultas: new Set() };
      this.lidos.set(nome, l);
    }
    return l;
  }

  repo<T extends { id: string }>(nome: NomeRepo): RepoMemoria<T> {
    let r = this.repos.get(nome);
    if (!r) {
      r = new RepoMemoria(nome, this);
      this.repos.set(nome, r);
    }
    return r as unknown as RepoMemoria<T>;
  }

  /** Começa uma rodada nova: o que foi lido fica, as mudanças da rodada anterior somem. */
  novaRodada(): void {
    this.repos = new Map();
  }

  async selecionar(nome: NomeRepo, tx: Executor, onde?: SQL): Promise<unknown[]> {
    const c = CONFIG[nome] as ConfigRepo;
    const base = tx.select().from(c.tabela as never);
    const filtrada = onde ? base.where(onde) : base;
    const ordenada = filtrada.orderBy(...c.ordem(c.tabela));
    if (this.modo === 'gravacao' && c.travaGravacao === 'update') return ordenada.for('update');
    if (this.modo === 'gravacao' && c.travaGravacao === 'share') return ordenada.for('share');
    return ordenada;
  }

  guardar(nome: NomeRepo, linhas: Record<string, unknown>[]): void {
    const l = this.lido(nome);
    const tabela = CONFIG[nome].tabela;
    for (const linha of linhas) {
      // Congelar pega, nas gravações, uma regra que alterasse um registro sem `atualizar`; nas
      // leituras não há o que gravar, e congelar cada linha custa caro.
      const lida = deLinha<Item>(tabela, linha);
      const item = this.modo === 'gravacao' ? congelar(lida) : lida;
      if (!l.linhas.has(item.id)) l.linhas.set(item.id, item);
      l.ausentes.delete(item.id);
    }
  }

  /** Ids de um campo (`pacienteId`) nas tabelas já lidas. */
  *idsReferenciados(campo: string): Iterable<string> {
    for (const [nome, l] of this.lidos) {
      if (nome === 'pacientes') continue;
      for (const item of l.linhas.values()) {
        const v = item[campo];
        if (typeof v === 'string') yield v;
      }
    }
  }

  get alterada(): boolean {
    return [...this.repos.values()].some((r) => r.alterado);
  }

  async gravar(tx: Executor): Promise<void> {
    const repos = ORDEM.map((n) => this.repos.get(n)).filter((r) => r?.alterado);
    for (const r of repos) await r!.gravarInsercoes(tx);
    for (const r of repos) await r!.gravarAlteracoes(tx);
    for (const r of [...repos].reverse()) await r!.gravarRemocoes(tx);
  }
}

// ───────────────────────── execução ─────────────────────────

let atual: Unidade | null = null;

/** A unidade da operação que está rodando (as operações são síncronas: só existe uma por vez). */
export function unidadeAtual(): Unidade {
  if (!atual) throw new Error('Operação fora de uma unidade de trabalho (use `ler` ou `gravar`).');
  return atual;
}

/** Erros do banco que pedem rodar a transação de novo (40001 serialização, 40P01 impasse). */
export function ehRepetivel(erro: unknown): boolean {
  let e: unknown = erro;
  for (let i = 0; i < 4 && e; i++) {
    const codigo = (e as { code?: unknown }).code;
    if (codigo === '40001' || codigo === '40P01') return true;
    // A8: número do atendimento repetido no dia (duas chegadas ao mesmo tempo): numera de novo.
    if (
      codigo === '23505' &&
      (e as { constraint?: string }).constraint === 'atendimentos_numero_no_dia'
    )
      return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

/** Contagem das novas tentativas (para os testes de concorrência e o monitoramento). */
export const estatisticas = { novasTentativas: 0, esgotadas: 0 };

/** A tabela que representa cada área (ver o cabeçalho). Em ordem fixa, para não haver impasse. */
const TABELA_DA_AREA: Record<Area, string> = { internacao: 'leitos', estoque: 'lotes' };

async function travarAreas(tx: Executor, areas: Area[]): Promise<void> {
  for (const area of [...new Set(areas)].sort()) {
    await tx.execute(sql.raw(`lock table "${TABELA_DA_AREA[area]}" in share row exclusive mode`));
  }
}

async function rodar<T>(banco: Banco, modo: Modo, areas: Area[], operacao: () => T): Promise<T> {
  for (let tentativa = 0; ; tentativa++) {
    try {
      return await banco.transaction(
        async (txBruta) => {
          const tx = txBruta as unknown as Executor;
          await travarAreas(tx, areas);
          const u = new Unidade(modo);
          for (let rodada = 0; rodada < 10_000; rodada++) {
            u.novaRodada();
            let resultado: T;
            atual = u;
            try {
              resultado = operacao();
            } catch (erro) {
              if (erro instanceof Faltando) {
                atual = null;
                await erro.carregar(tx);
                continue;
              }
              throw erro;
            } finally {
              atual = null;
            }
            if (modo === 'gravacao') await u.gravar(tx);
            else if (u.alterada) throw new Error('Leitura tentou alterar dados.');
            return resultado;
          }
          throw new Error('A operação não terminou de ler os dados.');
        },
        modo === 'gravacao'
          ? { isolationLevel: 'serializable' }
          : { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    } catch (erro) {
      if (!ehRepetivel(erro)) throw erro;
      if (tentativa < NOVAS_TENTATIVAS) {
        estatisticas.novasTentativas++;
        continue;
      }
      estatisticas.esgotadas++;
      // E-16: depois de 3 novas tentativas, a situação mudou demais; a tela recarrega.
      throw new ErroConflito('transicao_invalida', to.situacaoMudou);
    }
  }
}

/** Leitura: um retrato só, sem travas. */
export const ler = <T>(banco: Banco, operacao: () => T) => rodar(banco, 'leitura', [], operacao);

/** Gravação: `SERIALIZABLE`, com a trava lógica das áreas e nova tentativa em conflito (R-API3). */
export const gravar = <T>(banco: Banco, areas: Area | Area[], operacao: () => T) =>
  rodar(banco, 'gravacao', Array.isArray(areas) ? areas : [areas], operacao);
