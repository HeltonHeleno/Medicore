/**
 * A15 — retenção dos históricos e rotina diária (D15, M30).
 *
 * Fase 26 (26.2.2, 26.2.3): cópia de `apps/web/src/services/retencao.ts` para o servidor. Roda pelo
 * agendador (`rotinas/agendador.ts`), uma vez por dia, numa transação. Diferenças do navegador:
 * - **sem tetos por coleção** (D15: o limite era do navegador); só a idade conta;
 * - **movimentações nunca saem** (R-F9: o usuário da aplicação não tem `DELETE` nelas; o livro de
 *   controlados precisa delas). Por isso os lotes também ficam (toda entrada é uma movimentação) e o
 *   `saldoArquivado` não muda;
 * - a data da última execução vem do agendador (tabela `rotinas`), não do `localStorage`.
 *
 * Passos:
 * 1. itens fechados mais antigos que a retenção (ou acima do teto da coleção) são somados nos
 *    resumos mensais e saem;
 * 2. o que ainda é referenciado por um item que fica vira **registro arquivado** (versão reduzida,
 *    mesma coleção, `arquivado: true`), para nunca quebrar uma referência;
 * 3. movimentações removidas são somadas em `lote.saldoArquivado` (mantém a INV-7);
 * 4. rotina do dia: atividade `lote_vencido` para os lotes que venceram desde a última execução
 *    e `estoque_baixo` quando o vencimento derrubou o disponível abaixo do mínimo.
 */
import { RETENCAO_DIAS } from '@medicore/dominio/config/limites';
import { inArray } from 'drizzle-orm';
import { movimentacoes as tabelaMovimentacoes } from '../../banco/esquema';
import { t } from '@medicore/dominio/i18n/pt-BR';
import { tf } from '@medicore/dominio/i18n/pt-BR/farmacia';
import type {
  Atendimento,
  CorRisco,
  Dispensacao,
  Internacao,
  ResumoMensal,
  SolicitacaoLeito,
} from '@medicore/dominio/types';
import { dataDoInstante, hojeNoFuso, somarDias } from '@medicore/dominio/utils/datas';
import { disponivelDe } from '@medicore/dominio/utils/fefo';
import { agora } from '@medicore/dominio/utils/relogio';
import { minutosDesde } from '@medicore/dominio/utils/tempos';
import { registrarAtividade } from './repos';
import {
  repoAtendimentos,
  repoDispensacoes,
  repoInternacoes,
  repoLotes,
  repoMedicamentos,
  repoMovimentacoes,
  repoResumos,
  repoSolicitacoes,
} from './repos';
import { transacao } from './repos';

const DIA = 86_400_000;
const mes = (iso: string) => dataDoInstante(iso).slice(0, 7);

export interface ResultadoRetencao {
  removidos: Record<string, number>;
  arquivados: Record<string, number>;
  lotesVencidos: number;
}

/** Fecha o mês: soma num resumo mensal (cria se não existir). */
function somador() {
  const resumos = new Map(repoResumos.todos().map((r) => [r.id, structuredClone(r)]));
  const de = (id: string): ResumoMensal => {
    if (!resumos.has(id)) {
      resumos.set(id, {
        id,
        internacoes: 0,
        altasPorTipo: {},
        atendimentosPorCor: {},
        atendimentosPorDesfecho: {},
        esperaPorCor: {},
        dispensacoes: 0,
        saidasPorMedicamento: {},
      });
    }
    return resumos.get(id)!;
  };
  return {
    internacao(i: Internacao) {
      de(mes(i.inicio)).internacoes++;
      if (i.alta) {
        const r = de(mes(i.alta.em));
        r.altasPorTipo[i.alta.tipo] = (r.altasPorTipo[i.alta.tipo] ?? 0) + 1;
      }
    },
    atendimento(a: Atendimento) {
      const r = de(mes(a.chegadaEm));
      if (a.risco) r.atendimentosPorCor[a.risco] = (r.atendimentosPorCor[a.risco] ?? 0) + 1;
      if (a.desfecho)
        r.atendimentosPorDesfecho[a.desfecho.tipo] =
          (r.atendimentosPorDesfecho[a.desfecho.tipo] ?? 0) + 1;
      const chamado = a.eventos.find((e) => e.tipo === 'chamado')?.em;
      if (chamado && a.risco) {
        const atual = r.esperaPorCor[a.risco as CorRisco] ?? { soma: 0, n: 0 };
        r.esperaPorCor[a.risco] = {
          soma: atual.soma + minutosDesde(a.chegadaEm, chamado),
          n: atual.n + 1,
        };
      }
    },
    dispensacao(d: Dispensacao) {
      const r = de(mes(d.em));
      r.dispensacoes++;
      for (const i of d.itens) {
        r.saidasPorMedicamento[i.medicamentoId] =
          (r.saidasPorMedicamento[i.medicamentoId] ?? 0) + i.quantidade - i.devolvido;
      }
    },
    gravar(mesesManter: number) {
      const [ano, m] = hojeNoFuso().split('-').map(Number);
      const total = ano * 12 + (m - 1) - mesesManter;
      const limite = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
      const lista = [...resumos.values()]
        .filter((r) => r.id >= limite)
        .sort((a, b) => a.id.localeCompare(b.id));
      repoResumos.substituirTodos(lista);
    },
  };
}

/** Versões reduzidas (M30): só o que outras telas e referências precisam. */
const arquivarInternacao = (i: Internacao): Internacao => ({
  ...i,
  motivo: '',
  eventos: [],
  arquivado: true,
});
const arquivarAtendimento = (a: Atendimento): Atendimento => ({
  ...a,
  queixa: '',
  triagens: [],
  reavaliacoes: [],
  eventos: a.eventos.filter((e) => e.tipo === 'chamado'),
  arquivado: true,
});
const arquivarSolicitacao = (s: SolicitacaoLeito): SolicitacaoLeito => ({
  ...s,
  motivo: '',
  arquivado: true,
});
const arquivarDispensacao = (d: Dispensacao): Dispensacao => ({
  ...d,
  itens: [],
  alertasConfirmados: [],
  arquivado: true,
});

/** `ultima`: o dia (no fuso do hospital) da última execução, guardado pelo agendador. */
export function executarRetencao(opcoes: { ultima?: string } = {}): ResultadoRetencao {
  const hoje = hojeNoFuso();
  const ultima = opcoes.ultima;

  const resultado = transacao((): ResultadoRetencao => {
    const agoraMs = agora().getTime();
    const antes = (iso: string | undefined, dias: number) =>
      !!iso && new Date(iso).getTime() < agoraMs - dias * DIA;
    const soma = somador();

    const internacoes = repoInternacoes.todos();
    const atendimentos = repoAtendimentos.todos();
    const solicitacoes = repoSolicitacoes.todos();
    const dispensacoes = repoDispensacoes.todos();

    // 1. Candidatos a sair: fechados e antigos (no servidor não há teto por coleção).
    const fimInt = (i: Internacao) => i.alta?.em ?? i.inicio;
    const fimAte = (a: Atendimento) => a.desfecho?.em ?? a.chegadaEm;
    const fimSol = (s: SolicitacaoLeito) => s.canceladaEm ?? s.atualizadoEm;
    const intFechadas = internacoes.filter((i) => i.status === 'encerrada');
    const ateFechados = atendimentos.filter((a) => a.status === 'encerrado');
    const solFechadas = solicitacoes.filter(
      (s) => s.status === 'atendida' || s.status === 'cancelada',
    );
    const sai = {
      internacoes: new Set([
        ...intFechadas.filter((i) => antes(fimInt(i), RETENCAO_DIAS.internacoes)),
      ]),
      atendimentos: new Set([
        ...ateFechados.filter((a) => antes(fimAte(a), RETENCAO_DIAS.atendimentos)),
      ]),
      solicitacoes: new Set([
        ...solFechadas.filter((s) => antes(fimSol(s), RETENCAO_DIAS.solicitacoes_leito)),
      ]),
      dispensacoes: new Set([
        ...dispensacoes.filter((d) => antes(d.em, RETENCAO_DIAS.dispensacoes)),
      ]),
    };

    const idsDispensacoes = [...sai.dispensacoes].map((d) => d.id);
    const movimentacoesDasDispensacoes = idsDispensacoes.length
      ? repoMovimentacoes.onde(
          `dispensacoes:${idsDispensacoes.join(',')}`,
          () => inArray(tabelaMovimentacoes.dispensacaoId, idsDispensacoes),
          (m) => !!m.dispensacaoId && idsDispensacoes.includes(m.dispensacaoId),
        )
      : [];

    // 2. O que fica (inclusive arquivado) ainda pode apontar para um candidato: arquiva em vez
    //    de remover. Repete até estabilizar, porque o arquivado continua apontando.
    const arquiva = {
      internacoes: new Set<Internacao>(),
      atendimentos: new Set<Atendimento>(),
      solicitacoes: new Set<SolicitacaoLeito>(),
      dispensacoes: new Set<Dispensacao>(),
    };
    const fica = <T>(item: T, removidos: Set<T>, arquivados: Set<T>) =>
      !removidos.has(item) || arquivados.has(item);
    let mudou = true;
    while (mudou) {
      mudou = false;
      const ref = {
        int: new Set<string>(),
        ate: new Set<string>(),
        sol: new Set<string>(),
        dis: new Set<string>(),
      };
      for (const i of internacoes) {
        if (!fica(i, sai.internacoes, arquiva.internacoes)) continue;
        if (i.atendimentoId) ref.ate.add(i.atendimentoId);
        if (i.solicitacaoId) ref.sol.add(i.solicitacaoId);
      }
      for (const a of atendimentos) {
        if (!fica(a, sai.atendimentos, arquiva.atendimentos)) continue;
        if (a.desfecho?.internacaoId) ref.int.add(a.desfecho.internacaoId);
        if (a.solicitacaoId) ref.sol.add(a.solicitacaoId);
      }
      for (const s of solicitacoes) {
        if (!fica(s, sai.solicitacoes, arquiva.solicitacoes)) continue;
        if (s.atendimentoId) ref.ate.add(s.atendimentoId);
        if (s.internacaoId) ref.int.add(s.internacaoId);
      }
      for (const d of dispensacoes) {
        if (!fica(d, sai.dispensacoes, arquiva.dispensacoes)) continue;
        (d.destino.tipo === 'internacao' ? ref.int : ref.ate).add(d.destino.id);
      }
      // As movimentações ficam sempre (R-F9): a dispensação que elas apontam é arquivada.
      for (const m of movimentacoesDasDispensacoes)
        if (m.dispensacaoId) ref.dis.add(m.dispensacaoId);
      const marcar = <T extends { id: string }>(
        candidatos: Set<T>,
        arquivados: Set<T>,
        referenciados: Set<string>,
      ) => {
        for (const x of candidatos) {
          if (referenciados.has(x.id) && !arquivados.has(x)) {
            arquivados.add(x);
            mudou = true;
          }
        }
      };
      marcar(sai.internacoes, arquiva.internacoes, ref.int);
      marcar(sai.atendimentos, arquiva.atendimentos, ref.ate);
      marcar(sai.solicitacoes, arquiva.solicitacoes, ref.sol);
      marcar(sai.dispensacoes, arquiva.dispensacoes, ref.dis);
    }

    // 3. Soma nos resumos (uma vez: o que já estava arquivado foi somado antes) e grava.
    const aplicar = <T extends { id: string; arquivado?: boolean }>(
      todos: readonly T[],
      candidatos: Set<T>,
      arquivados: Set<T>,
      somar: (x: T) => void,
      reduzir: (x: T) => T,
      substituir: (lista: T[]) => void,
    ) => {
      if (candidatos.size === 0) return { removidos: 0, arquivados: 0 };
      let removidos = 0;
      let novosArquivados = 0;
      const lista: T[] = [];
      for (const x of todos) {
        if (!candidatos.has(x)) {
          lista.push(x);
          continue;
        }
        if (!x.arquivado) somar(x);
        if (arquivados.has(x)) {
          if (!x.arquivado) novosArquivados++;
          lista.push(x.arquivado ? x : reduzir(x));
        } else removidos++;
      }
      substituir(lista);
      return { removidos, arquivados: novosArquivados };
    };
    const r = {
      internacoes: aplicar(
        internacoes,
        sai.internacoes,
        arquiva.internacoes,
        soma.internacao,
        arquivarInternacao,
        (l) => repoInternacoes.substituirTodos(l),
      ),
      atendimentos: aplicar(
        atendimentos,
        sai.atendimentos,
        arquiva.atendimentos,
        soma.atendimento,
        arquivarAtendimento,
        (l) => repoAtendimentos.substituirTodos(l),
      ),
      solicitacoes_leito: aplicar(
        solicitacoes,
        sai.solicitacoes,
        arquiva.solicitacoes,
        () => {},
        arquivarSolicitacao,
        (l) => repoSolicitacoes.substituirTodos(l),
      ),
      dispensacoes: aplicar(
        dispensacoes,
        sai.dispensacoes,
        arquiva.dispensacoes,
        soma.dispensacao,
        arquivarDispensacao,
        (l) => repoDispensacoes.substituirTodos(l),
      ),
    };

    soma.gravar(RETENCAO_DIAS.resumos_mensais);

    // 4. Rotina do dia: lotes que venceram desde a última execução.
    const desde = ultima && ultima < hoje ? ultima : somarDias(hoje, -1);
    let lotesVencidos = 0;
    const meds = new Map(repoMedicamentos.todos().map((m) => [m.id, m]));
    const medsAfetados = new Set<string>();
    for (const l of repoLotes.todos()) {
      if (l.quantidadeAtual > 0 && l.validade >= desde && l.validade < hoje) {
        const m = meds.get(l.medicamentoId);
        if (!m) continue;
        lotesVencidos++;
        medsAfetados.add(m.id);
        registrarAtividade(
          'lote_vencido',
          t.textosAtividade.loteVencido(
            l.numero,
            `${m.nome} ${m.concentracao}`,
            l.quantidadeAtual,
            tf.unidades[m.unidade](l.quantidadeAtual),
          ),
          l.id,
        );
      }
    }
    for (const id of medsAfetados) {
      const m = meds.get(id)!;
      const lotes = repoLotes.todos().filter((l) => l.medicamentoId === id);
      if (
        disponivelDe(lotes, desde) > m.estoqueMinimo &&
        disponivelDe(lotes, hoje) <= m.estoqueMinimo
      ) {
        registrarAtividade(
          'estoque_baixo',
          t.textosAtividade.estoqueBaixo(`${m.nome} ${m.concentracao}`),
          id,
        );
      }
    }

    return {
      removidos: {
        internacoes: r.internacoes.removidos,
        atendimentos: r.atendimentos.removidos,
        solicitacoes_leito: r.solicitacoes_leito.removidos,
        dispensacoes: r.dispensacoes.removidos,
      },
      arquivados: {
        internacoes: r.internacoes.arquivados,
        atendimentos: r.atendimentos.arquivados,
        solicitacoes_leito: r.solicitacoes_leito.arquivados,
        dispensacoes: r.dispensacoes.arquivados,
      },
      lotesVencidos,
    };
  });
  return resultado;
}
