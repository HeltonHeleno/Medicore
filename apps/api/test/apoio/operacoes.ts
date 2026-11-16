/**
 * Fase 26 (26.T.1) — Os testes de serviço de leitos, emergência e farmácia do navegador rodando
 * contra a API e o banco, com as mesmas asserções.
 *
 * `usarOperacoes(instante)` faz o mesmo que o `prepararOperacoes` do navegador e devolve:
 * - `cliente`: as funções dos serviços do navegador (cadastros e módulos), pela rota HTTP;
 * - `repoLeitos`, `repoInternacoes`…: leitura **síncrona** de um retrato do banco, relido depois de
 *   cada chamada do cliente. É o lugar dos `repoX.obter/todos()` dos testes do navegador: a ordem é
 *   a de gravação, como a dos repositórios do navegador;
 * - os ajudantes de `apps/web/src/__tests__/utils/operacoes.ts` (`pacienteLivre`, `leitoLivre`,
 *   `esperarConsistente`…), sobre o retrato;
 * - `gravarComoOutraAba`: grava direto no banco, como "outra pessoa" (antes era outra aba).
 */
import { criarClienteOperacoes } from '@medicore/dominio/cliente/operacoes';
import type {
  Atendimento,
  Atividade,
  Consulta,
  Dispensacao,
  Internacao,
  Leito,
  Lote,
  Medicamento,
  Medico,
  Movimentacao,
  Paciente,
  ResumoMensal,
  SetorId,
  SolicitacaoLeito,
} from '@medicore/dominio/types';
import { verificarConsistencia } from '@medicore/dominio/utils/consistencia';
import { idade } from '@medicore/dominio/utils/datas';
import { agora } from '@medicore/dominio/utils/relogio';
import { getTableColumns, sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { beforeEach, expect } from 'vitest';
import { deLinha } from '../../src/banco/conversao';
import * as e from '../../src/banco/esquema';
import { linhaAtendimento, linhaConsulta } from '../../src/banco/semear';
import { paraBanco } from '../../src/servicos/comum';
import { transporteInject, usarApi } from './cliente';

type Item = { id: string } & Record<string, unknown>;

/** Nome da coleção do navegador → tabela. */
const TABELAS = {
  pacientes: e.pacientes,
  medicos: e.medicos,
  consultas: e.consultas,
  atividades: e.atividades,
  leitos: e.leitos,
  atendimentos: e.atendimentos,
  solicitacoes_leito: e.solicitacoes,
  internacoes: e.internacoes,
  medicamentos: e.medicamentos,
  lotes: e.lotes,
  dispensacoes: e.dispensacoes,
  movimentacoes: e.movimentacoes,
  resumos_mensais: e.resumos,
} as const;
type Colecao = keyof typeof TABELAS;

const paraLinha = (colecao: Colecao, item: Item): Record<string, unknown> =>
  colecao === 'consultas'
    ? linhaConsulta(item as never)
    : colecao === 'atendimentos'
      ? linhaAtendimento(item as never)
      : item;

/** Retrato das tabelas, na ordem de gravação (as alterações mantêm o lugar, como num `Map`). */
class Retrato {
  private readonly ordem = new Map<Colecao, string[]>();
  private readonly itens = new Map<Colecao, Map<string, Item>>();
  private pendentes: (() => Promise<void>)[] = [];
  private readonly banco: () => ReturnType<ReturnType<typeof usarApi>['api']>['banco']['dono'];

  constructor(banco: () => ReturnType<ReturnType<typeof usarApi>['api']>['banco']['dono']) {
    this.banco = banco;
  }

  limpar() {
    this.ordem.clear();
    this.itens.clear();
    this.pendentes = [];
  }

  async atualizar(): Promise<void> {
    for (const [colecao, tabela] of Object.entries(TABELAS) as [Colecao, PgTable][]) {
      const linhas = (await this.banco()
        .select()
        .from(tabela)
        .orderBy(sql`ctid`)) as Record<string, unknown>[];
      const novos = new Map(linhas.map((l) => [l.id as string, deLinha<Item>(tabela, l)]));
      const anterior = this.ordem.get(colecao) ?? [];
      const ordem = anterior.filter((id) => novos.has(id));
      const conhecidos = new Set(ordem);
      for (const id of novos.keys()) if (!conhecidos.has(id)) ordem.push(id);
      this.ordem.set(colecao, ordem);
      this.itens.set(colecao, novos);
    }
  }

  todos<T>(colecao: Colecao): T[] {
    const itens = this.itens.get(colecao)!;
    return (this.ordem.get(colecao) ?? []).map((id) => itens.get(id)!) as unknown as T[];
  }

  obter<T>(colecao: Colecao, id: string): T | undefined {
    return this.itens.get(colecao)?.get(id) as T | undefined;
  }

  /** Troca o conteúdo da coleção já no retrato; o banco recebe antes da próxima chamada da API. */
  substituir(colecao: Colecao, lista: Item[]): void {
    const tabela = TABELAS[colecao];
    const antes = new Map(this.todos<Item>(colecao).map((x) => [x.id, x]));
    const depois = new Map(lista.map((x) => [x.id, x]));
    const colunas = Object.keys(getTableColumns(tabela));
    const linhaCompleta = (x: Item) => {
      const linha = paraLinha(colecao, x);
      return paraBanco(Object.fromEntries(colunas.map((c) => [c, linha[c]])));
    };
    const removidos = [...antes.keys()].filter((id) => !depois.has(id));
    const inseridos = lista.filter((x) => !antes.has(x.id));
    const alterados = lista.filter(
      (x) => antes.has(x.id) && JSON.stringify(antes.get(x.id)) !== JSON.stringify(x),
    );
    this.pendentes.push(async () => {
      const id = (getTableColumns(tabela) as Record<string, unknown>).id;
      for (const x of alterados) {
        await this.banco()
          .update(tabela)
          .set(linhaCompleta(x) as never)
          .where(sql`${id} = ${x.id}`);
      }
      if (inseridos.length) {
        await this.banco()
          .insert(tabela)
          .values(inseridos.map(linhaCompleta) as never);
      }
      for (const r of removidos)
        await this.banco()
          .delete(tabela)
          .where(sql`${id} = ${r}`);
    });
    this.ordem.set(colecao, [
      ...(this.ordem.get(colecao) ?? []).filter((id) => depois.has(id)),
      ...inseridos.map((x) => x.id),
    ]);
    this.itens.set(colecao, depois);
  }

  async gravarPendentes(): Promise<void> {
    const lista = this.pendentes;
    this.pendentes = [];
    for (const p of lista) await p();
  }
}

export interface RepoRetrato<T> {
  readonly nome: string;
  todos(): T[];
  obter(id: string): T | undefined;
  substituirTodos(lista: T[]): void;
}

export function usarOperacoes(instante: string) {
  const base = usarApi(instante);
  const retrato = new Retrato(() => base.api().banco.dono);

  beforeEach(async () => {
    retrato.limpar();
    await retrato.atualizar();
  });

  const operacoes = criarClienteOperacoes(transporteInject(base.api));
  const brutos = { ...base.cliente, ...operacoes };
  /** Cada chamada grava o que "outra pessoa" mudou antes e relê o retrato depois. */
  const cliente = Object.fromEntries(
    Object.entries(brutos).map(([nome, fn]) => [
      nome,
      async (...args: unknown[]) => {
        await retrato.gravarPendentes();
        try {
          return await (fn as (...a: unknown[]) => Promise<unknown>)(...args);
        } finally {
          await retrato.atualizar();
        }
      },
    ]),
  ) as typeof brutos;

  const repo = <T>(colecao: Colecao): RepoRetrato<T> => ({
    nome: colecao,
    todos: () => retrato.todos<T>(colecao),
    obter: (id) => retrato.obter<T>(colecao, id),
    substituirTodos: (lista) => retrato.substituir(colecao, lista as unknown as Item[]),
  });

  const repos = {
    repoPacientes: repo<Paciente>('pacientes'),
    repoMedicos: repo<Medico>('medicos'),
    repoConsultas: repo<Consulta>('consultas'),
    repoAtividades: repo<Atividade>('atividades'),
    repoLeitos: repo<Leito>('leitos'),
    repoInternacoes: repo<Internacao>('internacoes'),
    repoSolicitacoes: repo<SolicitacaoLeito>('solicitacoes_leito'),
    repoAtendimentos: repo<Atendimento>('atendimentos'),
    repoMedicamentos: repo<Medicamento>('medicamentos'),
    repoLotes: repo<Lote>('lotes'),
    repoMovimentacoes: repo<Movimentacao>('movimentacoes'),
    repoDispensacoes: repo<Dispensacao>('dispensacoes'),
    repoResumos: repo<ResumoMensal>('resumos_mensais'),
  };

  // ─────────── os ajudantes de `utils/operacoes.ts` do navegador ───────────

  const retratoAtual = () => ({
    leitos: repos.repoLeitos.todos(),
    internacoes: repos.repoInternacoes.todos(),
    solicitacoes: repos.repoSolicitacoes.todos(),
    atendimentos: repos.repoAtendimentos.todos(),
    lotes: repos.repoLotes.todos(),
    movimentacoes: repos.repoMovimentacoes.todos(),
    dispensacoes: repos.repoDispensacoes.todos(),
    pacientes: repos.repoPacientes.todos(),
    consultas: repos.repoConsultas.todos(),
  });

  /** 15.8.3: falha mostrando as violações das invariantes INV-1 a INV-10. */
  function esperarConsistente() {
    const violacoes = verificarConsistencia(retratoAtual(), agora().getTime());
    expect(violacoes, JSON.stringify(violacoes, null, 1)).toEqual([]);
  }

  /** Paciente ativo sem internação ativa, sem atendimento aberto e sem pedido de leito. */
  function pacienteLivre(
    opcoes: { menor?: boolean; comAlergia?: string; pular?: number } = {},
  ): Paciente {
    const ocupados = new Set([
      ...repos.repoInternacoes
        .todos()
        .filter((i) => i.status === 'ativa')
        .map((i) => i.pacienteId),
      ...repos.repoAtendimentos
        .todos()
        .filter((a) => a.status !== 'encerrado' && a.pacienteId)
        .map((a) => a.pacienteId!),
      ...repos.repoSolicitacoes
        .todos()
        .filter((s) => s.status === 'pendente' || s.status === 'reservada')
        .map((s) => s.pacienteId),
    ]);
    const lista = repos.repoPacientes
      .todos()
      .filter(
        (p) =>
          p.ativo &&
          !ocupados.has(p.id) &&
          (opcoes.menor ? idade(p.dataNascimento) < 18 : idade(p.dataNascimento) >= 18) &&
          (opcoes.comAlergia === undefined || (p.alergias ?? '').includes(opcoes.comAlergia)),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const p = lista[opcoes.pular ?? 0];
    if (!p) throw new Error('Sem paciente livre nos dados de exemplo');
    return p;
  }

  /** Leito livre de um setor e perfil (o primeiro pelo código). */
  function leitoLivre(
    setorId: SetorId,
    opcoes: { perfil?: Leito['perfil']; isolamento?: boolean; pular?: number } = {},
  ): Leito {
    const lista = repos.repoLeitos
      .todos()
      .filter(
        (l) =>
          l.setorId === setorId &&
          l.status === 'livre' &&
          l.perfil === (opcoes.perfil ?? 'adulto') &&
          (opcoes.isolamento === undefined || l.isolamento === opcoes.isolamento),
      )
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
    const l = lista[opcoes.pular ?? 0];
    if (!l) throw new Error(`Sem leito livre em ${setorId}`);
    return l;
  }

  const leitoPorCodigo = (codigo: string) =>
    repos.repoLeitos.todos().find((l) => l.codigo === codigo)!;

  /** Grava direto no banco, sem passar pela API ("outra pessoa", antes "outra aba"). */
  function gravarComoOutraAba<T extends { id: string }>(
    colecao: string,
    mudar: (itens: T[]) => T[],
  ) {
    const atual = retrato.todos<T>(colecao as Colecao).map((x) => structuredClone(x));
    retrato.substituir(colecao as Colecao, mudar(atual) as unknown as Item[]);
  }

  return {
    ...base,
    cliente,
    ...repos,
    retratoAtual,
    esperarConsistente,
    pacienteLivre,
    leitoLivre,
    leitoPorCodigo,
    medicoClinico: () => repos.repoMedicos.obter('med-helena-duarte')!,
    gravarComoOutraAba,
    agoraIso: () => agora().toISOString(),
    /** Grava agora o que foi mudado direto no retrato (antes de ler o banco por fora da API). */
    gravarPendentes: () => retrato.gravarPendentes(),
    /** Relê o retrato (depois de uma rotina rodar por fora do cliente). */
    reler: () => retrato.atualizar(),
  };
}

export const MEDICO_INATIVO = 'med-sergio-tavares';
export const MEDICO_EMERGENCIA = 'med-marcos-ribeiro';
