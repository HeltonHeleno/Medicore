/**
 * A17 — verificação das invariantes INV-1 a INV-10 (M15).
 * Função pura sobre um retrato das coleções: usada nos testes depois de cada operação,
 * no teste de operações aleatórias e ao abrir o sistema em desenvolvimento.
 */
import { to } from '../i18n/pt-BR/operacoes';
import type {
  Atendimento,
  Consulta,
  Dispensacao,
  Internacao,
  Leito,
  Lote,
  Movimentacao,
  Paciente,
  SolicitacaoLeito,
  TipoMovimentacao,
} from '../types';

export interface RetratoOperacoes {
  leitos: readonly Leito[];
  internacoes: readonly Internacao[];
  solicitacoes: readonly SolicitacaoLeito[];
  atendimentos: readonly Atendimento[];
  lotes: readonly Lote[];
  movimentacoes: readonly Movimentacao[];
  dispensacoes: readonly Dispensacao[];
  pacientes: readonly Paciente[];
  consultas: readonly Consulta[];
}

export interface Violacao {
  inv: string;
  ids: string[];
  descricao: string;
}

const SINAL: Record<TipoMovimentacao, 1 | -1> = {
  entrada: 1,
  devolucao: 1,
  ajuste_positivo: 1,
  dispensacao: -1,
  ajuste_negativo: -1,
  perda: -1,
  descarte_vencido: -1,
};

const aberto = (a: Atendimento) => a.status !== 'encerrado';
const ativa = (i: Internacao) => i.status === 'ativa';
const solicitacaoAberta = (s: SolicitacaoLeito) =>
  s.status === 'pendente' || s.status === 'reservada';

/** INV-1: leito ocupado ⇔ exatamente uma ocupação (internação ativa ou atendimento aberto). */
function inv1(r: RetratoOperacoes): Violacao[] {
  const v: Violacao[] = [];
  for (const leito of r.leitos) {
    const internacoes = r.internacoes.filter((i) => ativa(i) && i.leitoId === leito.id);
    const atendimentos = r.atendimentos.filter(
      (a) => aberto(a) && a.leitoObservacaoId === leito.id,
    );
    const total = internacoes.length + atendimentos.length;
    if (leito.status === 'ocupado') {
      const aponta =
        (internacoes.length === 1 && leito.internacaoId === internacoes[0].id) ||
        (atendimentos.length === 1 && leito.atendimentoId === atendimentos[0].id);
      if (total !== 1 || !aponta) {
        v.push({
          inv: 'INV-1',
          ids: [leito.id, ...internacoes.map((i) => i.id), ...atendimentos.map((a) => a.id)],
          descricao: to.inv.ocupado(leito.codigo, total),
        });
      }
    } else if (total > 0) {
      v.push({
        inv: 'INV-1',
        ids: [leito.id, ...internacoes.map((i) => i.id), ...atendimentos.map((a) => a.id)],
        descricao: to.inv.statusComOcupacao(leito.codigo, leito.status),
      });
    }
  }
  return v;
}

/** INV-2: leito reservado ⇔ exatamente uma solicitação reservada para ele. */
function inv2(r: RetratoOperacoes): Violacao[] {
  const v: Violacao[] = [];
  for (const leito of r.leitos) {
    const reservas = r.solicitacoes.filter(
      (s) => s.status === 'reservada' && s.leitoReservadoId === leito.id,
    );
    if (leito.status === 'reservado') {
      if (reservas.length !== 1 || leito.solicitacaoId !== reservas[0].id) {
        v.push({
          inv: 'INV-2',
          ids: [leito.id, ...reservas.map((s) => s.id)],
          descricao: to.inv.reservado(leito.codigo, reservas.length),
        });
      }
    } else if (reservas.length > 0) {
      v.push({
        inv: 'INV-2',
        ids: [leito.id, ...reservas.map((s) => s.id)],
        descricao: to.inv.reservaEmOutroStatus(leito.codigo, leito.status),
      });
    }
  }
  for (const s of r.solicitacoes) {
    if (s.status === 'reservada' && !r.leitos.some((l) => l.id === s.leitoReservadoId)) {
      v.push({ inv: 'INV-2', ids: [s.id], descricao: to.inv.reservaSemLeito });
    }
  }
  return v;
}

/** INV-3: leito livre, em higienização ou bloqueado não aponta para ninguém. */
function inv3(r: RetratoOperacoes): Violacao[] {
  return r.leitos
    .filter(
      (l) =>
        (l.status === 'livre' || l.status === 'higienizacao' || l.status === 'bloqueado') &&
        (l.internacaoId || l.atendimentoId || l.solicitacaoId),
    )
    .map((l) => ({
      inv: 'INV-3',
      ids: [l.id],
      descricao: to.inv.apontaSemOcupacao(l.codigo, l.status),
    }));
}

/** INV-4: por paciente, no máximo uma de cada; nunca internação ativa e atendimento aberto. */
function inv4(r: RetratoOperacoes): Violacao[] {
  const v: Violacao[] = [];
  const conta = new Map<string, { i: string[]; a: string[]; s: string[] }>();
  const de = (id: string) => {
    if (!conta.has(id)) conta.set(id, { i: [], a: [], s: [] });
    return conta.get(id)!;
  };
  r.internacoes.filter(ativa).forEach((i) => de(i.pacienteId).i.push(i.id));
  r.atendimentos
    .filter((a) => aberto(a) && a.pacienteId)
    .forEach((a) => de(a.pacienteId!).a.push(a.id));
  r.solicitacoes.filter(solicitacaoAberta).forEach((s) => de(s.pacienteId).s.push(s.id));
  for (const [pacienteId, c] of conta) {
    if (c.i.length > 1 || c.a.length > 1 || c.s.length > 1 || (c.i.length > 0 && c.a.length > 0)) {
      v.push({
        inv: 'INV-4',
        ids: [pacienteId, ...c.i, ...c.a, ...c.s],
        descricao: to.inv.porPaciente(c.i.length, c.a.length, c.s.length),
      });
    }
  }
  return v;
}

/** INV-5: atendimento aguardando leito ⇔ há solicitação aberta dele. */
function inv5(r: RetratoOperacoes): Violacao[] {
  const v: Violacao[] = [];
  for (const a of r.atendimentos) {
    const abertas = r.solicitacoes.filter((s) => solicitacaoAberta(s) && s.atendimentoId === a.id);
    if (a.status === 'aguardando_leito') {
      if (abertas.length !== 1 || a.solicitacaoId !== abertas[0].id) {
        v.push({
          inv: 'INV-5',
          ids: [a.id, ...abertas.map((s) => s.id)],
          descricao: to.inv.aguardandoLeito(a.numero, abertas.length),
        });
      }
    } else if (abertas.length > 0) {
      v.push({
        inv: 'INV-5',
        ids: [a.id, ...abertas.map((s) => s.id)],
        descricao: to.inv.pedidoAberto(a.numero, a.status),
      });
    }
  }
  return v;
}

/** INV-6: desfecho "internação" ⇔ a internação existe e aponta para o atendimento. */
function inv6(r: RetratoOperacoes): Violacao[] {
  const v: Violacao[] = [];
  for (const a of r.atendimentos) {
    if (a.status !== 'encerrado' || a.desfecho?.tipo !== 'internacao') continue;
    const i = r.internacoes.find((x) => x.id === a.desfecho!.internacaoId);
    if (!i || i.atendimentoId !== a.id) {
      v.push({
        inv: 'INV-6',
        ids: [a.id],
        descricao: to.inv.desfechoSemInternacao(a.numero),
      });
    }
  }
  for (const i of r.internacoes) {
    if (!i.atendimentoId || i.arquivado) continue;
    const a = r.atendimentos.find((x) => x.id === i.atendimentoId);
    if (!a || a.desfecho?.tipo !== 'internacao' || a.desfecho.internacaoId !== i.id) {
      v.push({
        inv: 'INV-6',
        ids: [i.id, i.atendimentoId],
        descricao: to.inv.internacaoSemDesfecho,
      });
    }
  }
  return v;
}

/** INV-7: saldo do lote = saldo arquivado + movimentações. INV-8: nunca negativo. */
function inv7e8(r: RetratoOperacoes): Violacao[] {
  const v: Violacao[] = [];
  const soma = new Map<string, number>();
  for (const m of r.movimentacoes) {
    soma.set(m.loteId, (soma.get(m.loteId) ?? 0) + SINAL[m.tipo] * m.quantidade);
  }
  for (const l of r.lotes) {
    const esperado = (l.saldoArquivado ?? 0) + (soma.get(l.id) ?? 0);
    if (esperado !== l.quantidadeAtual) {
      v.push({
        inv: 'INV-7',
        ids: [l.id],
        descricao: to.inv.saldo(l.numero, l.quantidadeAtual, esperado),
      });
    }
    if (l.quantidadeAtual < 0) {
      v.push({ inv: 'INV-8', ids: [l.id], descricao: to.inv.saldoNegativo(l.numero) });
    }
  }
  return v;
}

/** INV-9: lotes do medicamento certo e soma dos lotes = quantidade do item. */
function inv9(r: RetratoOperacoes): Violacao[] {
  const v: Violacao[] = [];
  const lotes = new Map(r.lotes.map((l) => [l.id, l]));
  for (const d of r.dispensacoes) {
    if (d.arquivado) continue;
    d.itens.forEach((item, i) => {
      const soma = item.lotes.reduce((s, a) => s + a.quantidade, 0);
      const loteErrado = item.lotes.some((a) => {
        const lote = lotes.get(a.loteId);
        return lote !== undefined && lote.medicamentoId !== item.medicamentoId;
      });
      if (
        soma !== item.quantidade ||
        loteErrado ||
        item.devolvido < 0 ||
        item.devolvido > item.quantidade
      ) {
        v.push({
          inv: 'INV-9',
          ids: [d.id],
          descricao: to.inv.itemDispensacao(d.id, i + 1),
        });
      }
    });
  }
  return v;
}

/** INV-10: paciente com óbito não tem internação, atendimento nem consulta futura. */
function inv10(r: RetratoOperacoes, agoraMs: number): Violacao[] {
  const v: Violacao[] = [];
  for (const p of r.pacientes) {
    if (!p.obito) continue;
    const pendente =
      p.ativo ||
      r.internacoes.some((i) => ativa(i) && i.pacienteId === p.id) ||
      r.atendimentos.some((a) => aberto(a) && a.pacienteId === p.id) ||
      r.consultas.some(
        (c) =>
          c.pacienteId === p.id &&
          c.status === 'agendada' &&
          new Date(c.inicio).getTime() >= agoraMs,
      );
    if (pendente) {
      v.push({
        inv: 'INV-10',
        ids: [p.id],
        descricao: to.inv.obito,
      });
    }
  }
  return v;
}

export function verificarConsistencia(
  r: RetratoOperacoes,
  agoraMs: number = Date.now(),
): Violacao[] {
  return [
    ...inv1(r),
    ...inv2(r),
    ...inv3(r),
    ...inv4(r),
    ...inv5(r),
    ...inv6(r),
    ...inv7e8(r),
    ...inv9(r),
    ...inv10(r, agoraMs),
  ];
}
