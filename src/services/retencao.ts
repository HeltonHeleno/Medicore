/**
 * A15 — retenção dos históricos e rotina diária (D15, M30).
 *
 * Roda ao abrir o sistema, no máximo uma vez por dia (`medicore:meta.retencaoEm`), numa
 * transação:
 * 1. itens fechados mais antigos que a retenção (ou acima do teto da coleção) são somados nos
 *    resumos mensais e saem;
 * 2. o que ainda é referenciado por um item que fica vira **registro arquivado** (versão reduzida,
 *    mesma coleção, `arquivado: true`), para nunca quebrar uma referência;
 * 3. movimentações removidas são somadas em `lote.saldoArquivado` (mantém a INV-7);
 * 4. rotina do dia: atividade `lote_vencido` para os lotes que venceram desde a última execução
 *    e `estoque_baixo` quando o vencimento derrubou o disponível abaixo do mínimo.
 */
import { RETENCAO_DIAS, TETO_COLECAO } from '../config/limites';
import { t } from '../i18n/pt-BR';
import { tf } from '../i18n/pt-BR/farmacia';
import type {
  Atendimento,
  CorRisco,
  Dispensacao,
  Internacao,
  Movimentacao,
  ResumoMensal,
  SolicitacaoLeito,
  TipoMovimentacao,
} from '../types';
import { dataDoInstante, hojeNoFuso, somarDias } from '../utils/datas';
import { disponivelDe } from '../utils/fefo';
import { agora } from '../utils/relogio';
import { minutosDesde } from '../utils/tempos';
import { registrarAtividade } from './atividades';
import {
  repoAtendimentos,
  repoDispensacoes,
  repoInternacoes,
  repoLotes,
  repoMedicamentos,
  repoMovimentacoes,
  repoResumos,
  repoSolicitacoes,
} from './colecoes-operacoes';
import { gravarMeta, lerMeta, transacao } from './repositorio';

const DIA = 86_400_000;
const POSITIVOS: readonly TipoMovimentacao[] = ['entrada', 'devolucao', 'ajuste_positivo'];
const sinal = (m: Movimentacao) => (POSITIVOS.includes(m.tipo) ? 1 : -1) * m.quantidade;
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
      repoResumos.substituirTodos(lista.slice(-TETO_COLECAO.resumos_mensais));
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

/** Mais antigos primeiro, até caber no teto (só entre os já fechados). */
function excedentes<T>(
  fechados: readonly T[],
  total: number,
  teto: number,
  data: (x: T) => string,
): Set<T> {
  if (total <= teto) return new Set();
  return new Set(
    [...fechados].sort((a, b) => data(a).localeCompare(data(b))).slice(0, total - teto),
  );
}

export function executarRetencao(opcoes: { forcar?: boolean } = {}): ResultadoRetencao | null {
  const hoje = hojeNoFuso();
  const ultima = lerMeta<string>('retencaoEm');
  if (!opcoes.forcar && ultima === hoje) return null;

  const resultado = transacao((): ResultadoRetencao => {
    const agoraMs = agora().getTime();
    const antes = (iso: string | undefined, dias: number) =>
      !!iso && new Date(iso).getTime() < agoraMs - dias * DIA;
    const soma = somador();

    const internacoes = repoInternacoes.todos();
    const atendimentos = repoAtendimentos.todos();
    const solicitacoes = repoSolicitacoes.todos();
    const dispensacoes = repoDispensacoes.todos();
    const movimentacoes = repoMovimentacoes.todos();

    // 1. Candidatos a sair: fechados e antigos, ou excedentes do teto.
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
        ...excedentes(intFechadas, internacoes.length, TETO_COLECAO.internacoes, fimInt),
      ]),
      atendimentos: new Set([
        ...ateFechados.filter((a) => antes(fimAte(a), RETENCAO_DIAS.atendimentos)),
        ...excedentes(ateFechados, atendimentos.length, TETO_COLECAO.atendimentos, fimAte),
      ]),
      solicitacoes: new Set([
        ...solFechadas.filter((s) => antes(fimSol(s), RETENCAO_DIAS.solicitacoes_leito)),
        ...excedentes(solFechadas, solicitacoes.length, TETO_COLECAO.solicitacoes_leito, fimSol),
      ]),
      dispensacoes: new Set([
        ...dispensacoes.filter((d) => antes(d.em, RETENCAO_DIAS.dispensacoes)),
        ...excedentes(dispensacoes, dispensacoes.length, TETO_COLECAO.dispensacoes, (d) => d.em),
      ]),
      movimentacoes: new Set([
        ...movimentacoes.filter((m) => antes(m.em, RETENCAO_DIAS.movimentacoes)),
        ...excedentes(movimentacoes, movimentacoes.length, TETO_COLECAO.movimentacoes, (m) => m.em),
      ]),
    };

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
      for (const m of movimentacoes)
        if (!sai.movimentacoes.has(m) && m.dispensacaoId) ref.dis.add(m.dispensacaoId);
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

    // Movimentações: o saldo removido vai para o lote (INV-7).
    let movsRemovidas = 0;
    if (sai.movimentacoes.size > 0) {
      const porLote = new Map<string, number>();
      for (const m of sai.movimentacoes)
        porLote.set(m.loteId, (porLote.get(m.loteId) ?? 0) + sinal(m));
      for (const [loteId, valor] of porLote) {
        const lote = repoLotes.obter(loteId);
        if (lote)
          repoLotes.atualizar(loteId, { saldoArquivado: (lote.saldoArquivado ?? 0) + valor });
      }
      repoMovimentacoes.substituirTodos(movimentacoes.filter((m) => !sai.movimentacoes.has(m)));
      movsRemovidas = sai.movimentacoes.size;
    }

    // Lotes zerados há mais de 90 dias, sem movimentação nem dispensação que aponte para eles.
    const movsFicam = repoMovimentacoes.todos();
    const loteEmUso = new Set(movsFicam.map((m) => m.loteId));
    for (const d of repoDispensacoes.todos())
      for (const i of d.itens) for (const a of i.lotes) loteEmUso.add(a.loteId);
    const lotesAntes = repoLotes.todos();
    const lotesFicam = lotesAntes.filter(
      (l) =>
        l.quantidadeAtual > 0 || loteEmUso.has(l.id) || !antes(l.atualizadoEm, RETENCAO_DIAS.lotes),
    );
    if (lotesFicam.length < lotesAntes.length) repoLotes.substituirTodos(lotesFicam);

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
        movimentacoes: movsRemovidas,
        lotes: lotesAntes.length - lotesFicam.length,
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
  gravarMeta('retencaoEm', hoje);
  return resultado;
}
