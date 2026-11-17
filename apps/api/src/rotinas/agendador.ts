/**
 * Fase 26 (BL-01.6, 26.2) — Rotinas do servidor: nada depende de alguém abrir o sistema.
 *
 * - **Retenção e rotina do dia** (A15, 26.2.2 e 26.2.3): soma o que é antigo nos resumos mensais,
 *   arquiva o que ainda é referenciado e grava as atividades `lote_vencido` e `estoque_baixo`.
 * - **Invariantes** (A17, 26.2.4, BL-05.4): confere INV-1 a INV-10 no banco; cada violação vira
 *   um evento de erro no monitoramento, com a invariante e os ids. Nada é corrigido sozinho.
 *
 * Uma execução por dia (no fuso do hospital), mesmo com várias instâncias da API: cada rotina
 * "pega" o dia com `UPDATE rotinas SET ultimo_dia = hoje WHERE ultimo_dia < hoje` — a linha travada
 * garante que só uma instância consiga. Se a rotina falhar, o dia é devolvido e ela tenta de novo
 * na próxima volta do relógio.
 *
 * O relógio confere a cada 15 minutos (e logo ao subir): a primeira volta depois da meia-noite roda
 * as rotinas do dia, de madrugada.
 */
import { verificarConsistencia, type Violacao } from '@medicore/dominio/utils/consistencia';
import { hojeNoFuso } from '@medicore/dominio/utils/datas';
import { agora } from '@medicore/dominio/utils/relogio';
import { sql } from 'drizzle-orm';
import type { Banco } from '../banco/conexao';
import { rotinas } from '../banco/esquema';
import type { RegistrarErro } from '../monitoramento';
import { semear } from '../banco/semear';
import {
  repoAtendimentos,
  repoConsultas,
  repoDispensacoes,
  repoInternacoes,
  repoLeitos,
  repoLotes,
  repoMovimentacoes,
  repoPacientes,
  repoSolicitacoes,
} from '../servicos/operacoes/repos';
import { executarRetencao, type ResultadoRetencao } from '../servicos/operacoes/retencao';
import { gravar, ler } from '../servicos/operacoes/unidade';

export type NomeRotina = 'demonstracao' | 'retencao' | 'invariantes';
export const ROTINAS: readonly NomeRotina[] = ['retencao', 'invariantes'];
export const INTERVALO_MS = 15 * 60_000;

/** Uma invariante violada (A17), como erro para o monitoramento. */
export class ErroInvariante extends Error {
  readonly violacao: Violacao;
  constructor(violacao: Violacao) {
    super(`Invariante ${violacao.inv} violada (${violacao.ids.length} registro(s))`);
    this.name = 'ErroInvariante';
    this.violacao = violacao;
  }
}

/**
 * Pega o dia para a rotina. Devolve o último dia em que ela rodou (`null` na primeira vez), ou
 * `false` se ela já rodou hoje (ou outra instância acabou de pegar).
 */
async function pegarDia(
  banco: Banco,
  nome: NomeRotina,
  hoje: string,
): Promise<string | null | false> {
  await banco.insert(rotinas).values({ nome }).onConflictDoNothing();
  const linhas = await banco.execute<{ anterior: string | null }>(sql`
    update ${rotinas} r
       set ultimo_dia = ${hoje}::date, executada_em = now()
      from (select ultimo_dia from ${rotinas} where nome = ${nome} for update) a
     where r.nome = ${nome} and (r.ultimo_dia is null or r.ultimo_dia < ${hoje}::date)
    returning to_char(a.ultimo_dia, 'YYYY-MM-DD') as anterior`);
  const linha = linhas.rows[0];
  return linha ? linha.anterior : false;
}

async function devolverDia(banco: Banco, nome: NomeRotina, anterior: string | null) {
  await banco.execute(
    sql`update ${rotinas} set ultimo_dia = ${anterior}::date where nome = ${nome}`,
  );
}

async function guardarResultado(banco: Banco, nome: NomeRotina, resultado: object) {
  await banco.execute(
    sql`update ${rotinas} set resultado = ${JSON.stringify(resultado)}::jsonb where nome = ${nome}`,
  );
}

/** Retrato das tabelas para a A17 (lê tudo, num instante só). */
const retrato = () => ({
  leitos: repoLeitos.todos(),
  internacoes: repoInternacoes.todos(),
  solicitacoes: repoSolicitacoes.todos(),
  atendimentos: repoAtendimentos.todos(),
  lotes: repoLotes.todos(),
  movimentacoes: repoMovimentacoes.todos(),
  dispensacoes: repoDispensacoes.todos(),
  pacientes: repoPacientes.todos(),
  consultas: repoConsultas.todos(),
});

/** A17 no banco. Cada violação vai para o monitoramento com a invariante e os ids. */
export async function verificarInvariantes(
  banco: Banco,
  registrarErro: RegistrarErro,
): Promise<Violacao[]> {
  const violacoes = await ler(banco, () => verificarConsistencia(retrato(), agora().getTime()));
  for (const v of violacoes) {
    registrarErro(new ErroInvariante(v), {
      tags: { rotina: 'invariantes', invariante: v.inv },
      contextos: { invariante: { inv: v.inv, ids: v.ids, descricao: v.descricao } },
    });
  }
  return violacoes;
}

/** A15 e a rotina do dia, numa transação (trava as duas áreas: leitos/emergência e estoque). */
export const executarRetencaoNoBanco = (
  banco: Banco,
  ultima?: string,
): Promise<ResultadoRetencao> =>
  gravar(banco, ['internacao', 'estoque'], () => executarRetencao({ ultima }));

export interface ResultadoRotinas {
  demonstracao?: 'restaurada' | 'ja_executada';
  retencao?: ResultadoRetencao | 'ja_executada';
  invariantes?: { violacoes: number } | 'ja_executada';
}

export interface OpcoesRotinas {
  /**
   * Fase 27 (27.2.2) — Só no ambiente de demonstração: a conexão do dono das tabelas. Todo dia, antes
   * das outras rotinas, os dados de exemplo voltam (o "Restaurar dados de exemplo" do navegador).
   */
  restaurarDemonstracao?: Banco;
}

/** Roda as rotinas que ainda não rodaram hoje. Uma rotina que falha não impede a outra. */
export async function executarRotinasDoDia(
  banco: Banco,
  registrarErro: RegistrarErro,
  opcoes: OpcoesRotinas = {},
): Promise<ResultadoRotinas> {
  const hoje = hojeNoFuso();
  const resultado: ResultadoRotinas = {};
  if (opcoes.restaurarDemonstracao) {
    const anterior = await pegarDia(banco, 'demonstracao', hoje);
    if (anterior === false) resultado.demonstracao = 'ja_executada';
    else {
      try {
        await semear(opcoes.restaurarDemonstracao, { substituir: true });
        resultado.demonstracao = 'restaurada';
      } catch (erro) {
        await devolverDia(banco, 'demonstracao', anterior);
        registrarErro(erro, { tags: { rotina: 'demonstracao' } });
      }
    }
  }
  for (const nome of ROTINAS) {
    const anterior = await pegarDia(banco, nome, hoje);
    if (anterior === false) {
      resultado[nome] = 'ja_executada';
      continue;
    }
    try {
      if (nome === 'retencao') {
        const r = await executarRetencaoNoBanco(banco, anterior ?? undefined);
        resultado.retencao = r;
        await guardarResultado(banco, nome, r);
      } else {
        const violacoes = await verificarInvariantes(banco, registrarErro);
        resultado.invariantes = { violacoes: violacoes.length };
        await guardarResultado(banco, nome, resultado.invariantes);
      }
    } catch (erro) {
      await devolverDia(banco, nome, anterior);
      registrarErro(erro, { tags: { rotina: nome } });
    }
  }
  return resultado;
}

/** Liga o relógio das rotinas. Devolve a função que desliga (no encerramento da API). */
export function iniciarAgendador(
  banco: Banco,
  registrarErro: RegistrarErro,
  intervaloMs = INTERVALO_MS,
  opcoes: OpcoesRotinas = {},
): () => void {
  let rodando = false;
  const volta = async () => {
    if (rodando) return;
    rodando = true;
    try {
      await executarRotinasDoDia(banco, registrarErro, opcoes);
    } catch (erro) {
      registrarErro(erro, { tags: { rotina: 'agendador' } });
    } finally {
      rodando = false;
    }
  };
  const inicial = setTimeout(() => void volta(), 5_000);
  const relogio = setInterval(() => void volta(), intervaloMs);
  relogio.unref();
  inicial.unref();
  return () => {
    clearTimeout(inicial);
    clearInterval(relogio);
  };
}
