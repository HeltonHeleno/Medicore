/**
 * Indicadores dos módulos operacionais para o Painel e para as telas (A12, A13, A14).
 * Só leitura. As funções `calcular*` são puras (recebem os dados) e são testadas assim;
 * as públicas leem os repositórios. O Painel carrega este arquivo sob demanda (D20).
 */
import { to } from '../i18n/pt-BR/operacoes';
import {
  AGUARDANDO_LEITO_ALERTA_H,
  HIGIENIZACAO_REF_MIN,
  JANELA_ESPERA_MEDIA_H,
  OBSERVACAO_ALERTA_H,
  RESERVA_DESTAQUE_H,
  SEM_TRIAGEM_ALERTA_MIN,
  UTI_ALERTA_OCUPACAO,
} from '../config/limites';
import { SETORES, SETORES_INTERNACAO } from '../config/setores';
import { t } from '../i18n/pt-BR';
import { te } from '../i18n/pt-BR/emergencia';
import type {
  AlertaOperacional,
  Atendimento,
  CampoSinal,
  CorRisco,
  Internacao,
  Leito,
  Lote,
  Medicamento,
  Paciente,
  PeriodoInternacao,
  PontoInternacao,
  PrioridadeAlerta,
  ResumoEstoque,
  ResumoMensal,
  SetorInternacaoId,
  SolicitacaoLeito,
} from '../types';
import { CORES_RISCO } from '../types/emergencia';
import {
  dataDoInstante,
  diaDaSemana,
  diferencaDias,
  hojeNoFuso,
  idade,
  somarDias,
} from '../utils/datas';
import { disponivelDe } from '../utils/fefo';
import { agora } from '../utils/relogio';
import { avaliarSinais } from '../utils/sinais-vitais';
import {
  diasParaVencer,
  estaVencido,
  formatarDuracao,
  minutosDesde,
  permanencia,
} from '../utils/tempos';
import { repoPacientes } from './colecoes';
import {
  repoAtendimentos,
  repoInternacoes,
  repoLeitos,
  repoLotes,
  repoMedicamentos,
  repoResumos,
  repoSolicitacoes,
} from './colecoes-operacoes';
import { executar } from './infra';
import { VENCENDO_DIAS } from '../config/limites';

const o = to;

// ───────────────────────── leitos (A13) ─────────────────────────

export interface OcupacaoSetor {
  setorId: SetorInternacaoId;
  nome: string;
  total: number;
  operacionais: number;
  ocupados: number;
  livres: number;
  higienizacao: number;
  reservados: number;
  bloqueados: number;
  /** Ocupados ÷ operacionais, arredondado (0–100). */
  percentual: number;
}

export interface IndicadoresLeitos {
  setores: OcupacaoSetor[];
  total: number;
  operacionais: number;
  ocupados: number;
  /** KPI "Leitos disponíveis": leitos livres dos setores de internação. */
  disponiveis: number;
  higienizacao: number;
  reservados: number;
  bloqueados: number;
  percentual: number;
  /** "UTI tendendo a X%" */
  previsaoUti: number;
  altasPrevistasHoje: number;
  /** Dias, internações encerradas nos últimos 30 dias (null sem base). */
  permanenciaMedia: number | null;
  /** M24: altas previstas para hoje e amanhã + leitos em higienização. */
  liberacoesPrevistas24h: number;
  /** Altas nos últimos 30 dias ÷ leitos operacionais. */
  giroLeito: number;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function calcularIndicadoresLeitos(
  d: {
    leitos: readonly Leito[];
    internacoes: readonly Internacao[];
    solicitacoes: readonly SolicitacaoLeito[];
  },
  momento: Date,
): IndicadoresLeitos {
  const hoje = dataDoInstante(momento);
  const setores: OcupacaoSetor[] = SETORES_INTERNACAO.map((id) => {
    const doSetor = d.leitos.filter((l) => l.setorId === id);
    const conta = (s: Leito['status']) => doSetor.filter((l) => l.status === s).length;
    const bloqueados = conta('bloqueado');
    const operacionais = doSetor.length - bloqueados;
    const ocupados = conta('ocupado');
    return {
      setorId: id,
      nome: SETORES.find((s) => s.id === id)!.nome,
      total: doSetor.length,
      operacionais,
      ocupados,
      livres: conta('livre'),
      higienizacao: conta('higienizacao'),
      reservados: conta('reservado'),
      bloqueados,
      percentual: pct(ocupados, operacionais),
    };
  });
  const soma = (k: keyof OcupacaoSetor) => setores.reduce((s, x) => s + (x[k] as number), 0);
  const uti = setores.find((s) => s.setorId === 'uti')!;
  const pendentesUti = d.solicitacoes.filter(
    (s) => s.status === 'pendente' && s.setorDesejado === 'uti',
  ).length;
  const ativas = d.internacoes.filter((i) => i.status === 'ativa' && !i.arquivado);
  const limite30 = momento.getTime() - 30 * 86_400_000;
  const encerradas30 = d.internacoes.filter(
    (i) => i.status === 'encerrada' && i.alta && new Date(i.alta.em).getTime() >= limite30,
  );
  const amanha = somarDias(hoje, 1);
  const operacionais = soma('operacionais');
  return {
    setores,
    total: soma('total'),
    operacionais,
    ocupados: soma('ocupados'),
    disponiveis: soma('livres'),
    higienizacao: soma('higienizacao'),
    reservados: soma('reservados'),
    bloqueados: soma('bloqueados'),
    percentual: pct(soma('ocupados'), operacionais),
    previsaoUti: pct(uti.ocupados + uti.reservados + pendentesUti, uti.operacionais),
    altasPrevistasHoje: ativas.filter((i) => i.previsaoAlta === hoje).length,
    permanenciaMedia:
      encerradas30.length > 0
        ? Math.round(
            (encerradas30.reduce((s, i) => s + permanencia(i.inicio, i.alta!.em), 0) /
              encerradas30.length) *
              10,
          ) / 10
        : null,
    liberacoesPrevistas24h:
      ativas.filter((i) => i.previsaoAlta === hoje || i.previsaoAlta === amanha).length +
      soma('higienizacao'),
    giroLeito: operacionais > 0 ? Math.round((encerradas30.length / operacionais) * 100) / 100 : 0,
  };
}

// ───────────────────────── emergência (A13, E8) ─────────────────────────

export interface IndicadoresEmergencia {
  abertos: number;
  /** Vermelho e laranja entre os abertos. */
  altaPrioridade: number;
  porCor: Record<CorRisco, { aguardando: number; acimaDoPrazo: number }>;
  acimaDoPrazo: number;
  /** Minutos da chegada ao chamado, por cor, nas últimas 24 h. */
  esperaMediaPorCor: Partial<Record<CorRisco, number>>;
  atendimentosHoje: number;
}

const chamado = (a: Atendimento) => a.eventos.find((e) => e.tipo === 'chamado')?.em;

export function calcularIndicadoresEmergencia(
  atendimentos: readonly Atendimento[],
  momento: Date,
): IndicadoresEmergencia {
  const hoje = dataDoInstante(momento);
  const abertos = atendimentos.filter((a) => a.status !== 'encerrado');
  const porCor = Object.fromEntries(
    CORES_RISCO.map((c) => [c, { aguardando: 0, acimaDoPrazo: 0 }]),
  ) as IndicadoresEmergencia['porCor'];
  let acima = 0;
  for (const a of abertos) {
    if (a.status !== 'aguardando_atendimento' || !a.risco) continue;
    porCor[a.risco].aguardando++;
    if (a.prazo && momento.getTime() > new Date(a.prazo).getTime()) {
      porCor[a.risco].acimaDoPrazo++;
      acima++;
    }
  }
  const limite = momento.getTime() - JANELA_ESPERA_MEDIA_H * 3_600_000;
  const esperas = new Map<CorRisco, number[]>();
  for (const a of atendimentos) {
    const em = chamado(a);
    if (!em || !a.risco || new Date(em).getTime() < limite) continue;
    esperas.set(a.risco, [...(esperas.get(a.risco) ?? []), minutosDesde(a.chegadaEm, em)]);
  }
  return {
    abertos: abertos.length,
    altaPrioridade: abertos.filter((a) => a.risco === 'vermelho' || a.risco === 'laranja').length,
    porCor,
    acimaDoPrazo: acima,
    esperaMediaPorCor: Object.fromEntries(
      [...esperas].map(([cor, lista]) => [
        cor,
        Math.round(lista.reduce((s, x) => s + x, 0) / lista.length),
      ]),
    ),
    atendimentosHoje: atendimentos.filter((a) => dataDoInstante(a.chegadaEm) === hoje).length,
  };
}

// ───────────────────────── alertas (A12) ─────────────────────────

const PESO_PRIORIDADE: Record<PrioridadeAlerta, number> = { alta: 0, media: 1, baixa: 2 };

export interface DadosAlertas {
  leitos: readonly Leito[];
  atendimentos: readonly Atendimento[];
  solicitacoes: readonly SolicitacaoLeito[];
  pacientes: ReadonlyMap<string, Paciente>;
}

export function calcularAlertas(d: DadosAlertas, momento: Date): AlertaOperacional[] {
  const alertas: AlertaOperacional[] = [];
  const codigo = new Map(d.leitos.map((l) => [l.id, l]));
  const nome = (a: Atendimento) => {
    const p = a.pacienteId ? d.pacientes.get(a.pacienteId) : undefined;
    return p ? p.nomeSocial || p.nome : a.provisorio?.descricao;
  };
  const anos = (a: Atendimento) => {
    const p = a.pacienteId ? d.pacientes.get(a.pacienteId) : undefined;
    return p ? idade(p.dataNascimento, dataDoInstante(momento)) : a.provisorio?.idadeAproximada;
  };
  const local = (a: Atendimento) => {
    const l = a.leitoObservacaoId ? codigo.get(a.leitoObservacaoId) : undefined;
    return l && a.status !== 'encerrado'
      ? o.localLeito(te.alertas.localEmergencia, l.codigo)
      : o.localEmergencia(a.numero);
  };
  const minutos = (desde: string) => minutosDesde(desde, momento);
  const add = (a: Omit<AlertaOperacional, 'id'> & { chave: string }) => {
    const { chave, ...resto } = a;
    alertas.push({ id: chave, ...resto });
  };

  for (const a of d.atendimentos) {
    if (a.status === 'encerrado') continue;
    const ref = { tipo: 'atendimento' as const, id: a.id };
    const base = { local: local(a), responsavel: nome(a), referencia: ref };
    if (a.status === 'aguardando_atendimento' && a.risco === 'vermelho') {
      add({
        chave: `vermelho-${a.id}`,
        titulo: te.alertas.vermelhoAguardando,
        prioridade: 'alta',
        desde: a.chegadaEm,
        ...base,
      });
    } else if (
      a.status === 'aguardando_atendimento' &&
      a.risco &&
      a.prazo &&
      momento.getTime() > new Date(a.prazo).getTime()
    ) {
      add({
        chave: `prazo-${a.id}`,
        titulo: te.alertas.acimaDoPrazo(te.cores[a.risco], minutos(a.prazo)),
        prioridade: a.risco === 'laranja' ? 'alta' : 'media',
        desde: a.prazo,
        ...base,
      });
    }
    if (a.status === 'aguardando_triagem' && minutos(a.chegadaEm) > SEM_TRIAGEM_ALERTA_MIN) {
      add({
        chave: `triagem-${a.id}`,
        titulo: te.alertas.semTriagem(minutos(a.chegadaEm)),
        prioridade: 'alta',
        desde: a.chegadaEm,
        ...base,
      });
    }
    if (a.status === 'em_observacao' && a.leitoObservacaoId) {
      const desde =
        [...a.eventos].reverse().find((e) => e.tipo === 'observacao')?.em ?? a.chegadaEm;
      if (minutos(desde) > OBSERVACAO_ALERTA_H * 60) {
        add({
          chave: `observacao-${a.id}`,
          titulo: te.alertas.observacaoLonga(codigo.get(a.leitoObservacaoId)?.codigo ?? '—'),
          prioridade: 'media',
          desde,
          ...base,
        });
      }
    }
    const registros = [
      ...a.triagens.map((x) => ({ em: x.em, s: x.sinais })),
      ...a.reavaliacoes.map((x) => ({ em: x.em, s: x.sinais })),
    ].sort((x, y) => x.em.localeCompare(y.em));
    const ultimo = registros[registros.length - 1];
    if (ultimo) {
      const campos = [
        ...new Set(
          avaliarSinais(ultimo.s, anos(a)).alertas.map(
            (x) => o.sinaisCurtos[x.campo as CampoSinal],
          ),
        ),
      ];
      if (campos.length > 0) {
        add({
          chave: `sinais-${a.id}`,
          titulo: te.alertas.sinaisAtencao(campos.join(', ')),
          prioridade: 'alta',
          desde: ultimo.em,
          ...base,
        });
      }
    }
    if (a.status === 'aguardando_leito') {
      const s = d.solicitacoes.find((x) => x.id === a.solicitacaoId);
      const desde = s?.criadoEm ?? a.chegadaEm;
      if (minutos(desde) > AGUARDANDO_LEITO_ALERTA_H * 60) {
        add({
          chave: `leito-${a.id}`,
          titulo: te.alertas.aguardandoLeito(formatarDuracao(minutos(desde))),
          prioridade: 'media',
          desde,
          ...base,
        });
      }
    }
  }

  const ind = calcularIndicadoresLeitos(
    { leitos: d.leitos, internacoes: [], solicitacoes: [] },
    momento,
  );
  const uti = ind.setores.find((s) => s.setorId === 'uti');
  if (uti && uti.percentual >= UTI_ALERTA_OCUPACAO) {
    add({
      chave: 'uti-ocupacao',
      titulo: te.alertas.utiOcupacao(uti.percentual),
      local: uti.nome,
      prioridade: 'media',
      desde: momento.toISOString(),
      referencia: { tipo: 'setor', id: 'uti' },
    });
  }
  for (const l of d.leitos) {
    const ref = { tipo: 'leito' as const, id: l.id };
    const setor = SETORES.find((s) => s.id === l.setorId)?.nome ?? l.setorId;
    if (
      l.status === 'higienizacao' &&
      minutos(l.desde) > 2 * HIGIENIZACAO_REF_MIN[l.higienizacao?.tipo ?? 'terminal']
    ) {
      add({
        chave: `higienizacao-${l.id}`,
        titulo: te.alertas.higienizacaoAtrasada(l.codigo),
        local: o.localLeito(setor, l.codigo),
        prioridade: 'baixa',
        desde: l.desde,
        referencia: ref,
      });
    }
    if (l.status === 'reservado' && minutos(l.desde) > RESERVA_DESTAQUE_H * 60) {
      add({
        chave: `reserva-${l.id}`,
        titulo: te.alertas.reservaLonga(formatarDuracao(minutos(l.desde)), l.codigo),
        local: o.localLeito(setor, l.codigo),
        prioridade: 'baixa',
        desde: l.desde,
        referencia: ref,
      });
    }
  }
  return alertas.sort(
    (a, b) =>
      PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade] ||
      a.desde.localeCompare(b.desde),
  );
}

// ───────────────────────── série de internações (A14) ─────────────────────────

export function calcularSerieInternacoes(
  internacoes: readonly Internacao[],
  resumos: readonly ResumoMensal[],
  periodo: PeriodoInternacao,
  momento: Date,
): PontoInternacao[] {
  const hoje = dataDoInstante(momento);
  const vivas = internacoes.filter((i) => !i.arquivado).map((i) => dataDoInstante(i.inicio));
  const naData = (dia: string) => vivas.filter((d) => d === dia).length;
  if (periodo === 'semana') {
    return Array.from({ length: 7 }, (_, k) => {
      const dia = somarDias(hoje, k - 6);
      return { rotulo: t.diasSemanaCurto[diaDaSemana(dia)], valor: naData(dia) };
    });
  }
  if (periodo === 'mes') {
    return Array.from({ length: 4 }, (_, k) => {
      const ini = somarDias(hoje, -27 + 7 * k);
      return {
        rotulo: o.semanaN(k + 1),
        valor: vivas.filter((d) => diferencaDias(ini, d) >= 0 && diferencaDias(ini, d) < 7).length,
      };
    });
  }
  const [ano, mes] = hoje.split('-').map(Number);
  const porMes = new Map(resumos.map((r) => [r.id, r.internacoes]));
  return Array.from({ length: 12 }, (_, k) => {
    const total = ano * 12 + (mes - 1) - 11 + k;
    const id = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
    return {
      rotulo: o.mesesCurtos[total % 12],
      valor: (porMes.get(id) ?? 0) + vivas.filter((d) => d.startsWith(id)).length,
    };
  });
}

// ───────────────────────── estoque (R-F6) ─────────────────────────

export function calcularResumoEstoque(
  medicamentos: readonly Medicamento[],
  lotes: readonly Lote[],
  hoje: string,
): ResumoEstoque {
  let baixo = 0;
  let zerado = 0;
  for (const m of medicamentos.filter((x) => x.ativo)) {
    const disponivel = disponivelDe(
      lotes.filter((l) => l.medicamentoId === m.id),
      hoje,
    );
    if (disponivel === 0) zerado++;
    else if (disponivel <= m.estoqueMinimo) baixo++;
  }
  const comSaldo = lotes.filter((l) => l.quantidadeAtual > 0);
  return {
    baixo,
    zerado,
    vencendo: comSaldo.filter(
      (l) => !estaVencido(l.validade, hoje) && diasParaVencer(l.validade, hoje) <= VENCENDO_DIAS,
    ).length,
    vencidos: comSaldo.filter((l) => estaVencido(l.validade, hoje)).length,
  };
}

// ───────────────────────── leitura pública ─────────────────────────

export interface IndicadoresOperacionais {
  leitos: IndicadoresLeitos;
  emergencia: IndicadoresEmergencia;
  estoque: ResumoEstoque;
  alertas: AlertaOperacional[];
}

const pacientesPorId = () => new Map(repoPacientes.todos().map((p) => [p.id, p]));

export const obterIndicadoresOperacionais = (): Promise<IndicadoresOperacionais> =>
  executar(() => {
    const momento = agora();
    const leitos = repoLeitos.todos();
    const atendimentos = repoAtendimentos.todos();
    const solicitacoes = repoSolicitacoes.todos();
    return {
      leitos: calcularIndicadoresLeitos(
        { leitos, internacoes: repoInternacoes.todos(), solicitacoes },
        momento,
      ),
      emergencia: calcularIndicadoresEmergencia(atendimentos, momento),
      estoque: calcularResumoEstoque(repoMedicamentos.todos(), repoLotes.todos(), hojeNoFuso()),
      alertas: calcularAlertas(
        { leitos, atendimentos, solicitacoes, pacientes: pacientesPorId() },
        momento,
      ),
    };
  });

/** Só os indicadores de leitos (resumo do mapa, 17.2). */
export const obterIndicadoresLeitos = (): Promise<IndicadoresLeitos> =>
  executar(() =>
    calcularIndicadoresLeitos(
      {
        leitos: repoLeitos.todos(),
        internacoes: repoInternacoes.todos(),
        solicitacoes: repoSolicitacoes.todos(),
      },
      agora(),
    ),
  );

/** Só os indicadores da emergência (resumo da fila, 18.2). */
export const obterIndicadoresEmergencia = (): Promise<IndicadoresEmergencia> =>
  executar(() => calcularIndicadoresEmergencia(repoAtendimentos.todos(), agora()));

/** Só o resumo do estoque (resumo da farmácia, 19.2). */
export const obterResumoEstoque = (): Promise<ResumoEstoque> =>
  executar(() => calcularResumoEstoque(repoMedicamentos.todos(), repoLotes.todos(), hojeNoFuso()));

export const listarAlertas = (): Promise<AlertaOperacional[]> =>
  executar(() =>
    calcularAlertas(
      {
        leitos: repoLeitos.todos(),
        atendimentos: repoAtendimentos.todos(),
        solicitacoes: repoSolicitacoes.todos(),
        pacientes: pacientesPorId(),
      },
      agora(),
    ),
  );

export const obterSerieInternacoes = (periodo: PeriodoInternacao): Promise<PontoInternacao[]> =>
  executar(() =>
    calcularSerieInternacoes(repoInternacoes.todos(), repoResumos.todos(), periodo, agora()),
  );
