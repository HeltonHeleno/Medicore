/**
 * Fase 25 (25.1.3) — Agenda no servidor (P9–P13, A1/A2, R-C1–R-C9, R-S1–R-S3).
 *
 * Mesmas regras de `apps/web/src/services/consultas.ts`. Duas garantias contra gravações
 * simultâneas: as agendas do médico e do paciente ficam travadas durante a transação (a segunda
 * gravação espera e vê a primeira, recebendo E-04 pela regra), e o `EXCLUDE` do banco continua
 * como última garantia para o médico.
 */
import { nomeDepartamento } from '@medicore/dominio/config/departamentos';
import type { filtrosAgenda } from '@medicore/dominio/contrato/cadastros';
import { LIMITE_AGENDA } from '@medicore/dominio/contrato/cadastros';
import { ANTECEDENCIA_MAX_DIAS, TOLERANCIA_PASSADO_MIN } from '@medicore/dominio/config/limites';
import { ErroConflito, ErroNaoEncontrado, type CodigoConflito } from '@medicore/dominio/erros';
import { t } from '@medicore/dominio/i18n/pt-BR';
import type { DadosAgendamento } from '@medicore/dominio/schemas/consulta';
import type {
  Consulta,
  ConsultaDetalhada,
  EventoConsulta,
  HorarioAgenda,
  Medico,
  Paciente,
  StatusConsulta,
} from '@medicore/dominio/types';
import {
  estaAtrasada,
  gerarHorarios,
  intervaloDe,
  motivoForaDaDisponibilidade,
  podeTransitar,
  proximoDiaLivre,
  sobrepoe,
} from '@medicore/dominio/utils/agenda';
import { nomeExibicaoMedico, nomeExibicaoPaciente } from '@medicore/dominio/utils/cadastros';
import { hojeNoFuso, instanteNoFuso, somarDias } from '@medicore/dominio/utils/datas';
import { gerarId } from '@medicore/dominio/utils/id';
import { agora } from '@medicore/dominio/utils/relogio';
import { and, asc, eq, gte, inArray, lt, ne, type SQL } from 'drizzle-orm';
import type { z } from 'zod';
import type { Banco } from '../banco/conexao';
import { deLinha } from '../banco/conversao';
import { consultas, medicos, pacientes } from '../banco/esquema';
import { registrarAtividade } from './atividades';
import {
  atualizarRegistro,
  conferirVersao,
  emTransacao,
  type Executor,
  inserirRegistro,
  lerOuFalhar,
  lerUm,
  momento,
  travar,
} from './comum';

export type FiltrosAgendaApi = z.output<typeof filtrosAgenda>;

const c = t.conflitos;

const fimDe = (consulta: Pick<Consulta, 'inicio' | 'duracaoMin'>) =>
  new Date(intervaloDe(consulta.inicio, consulta.duracaoMin).fim).toISOString();

const conflito = (codigo: CodigoConflito, mensagem: string, campo: string) =>
  new ErroConflito(codigo, mensagem, { campo });

/** Nomes resolvidos, fim e "aguardando registro" (R-C7). */
function detalhar(
  consulta: Consulta,
  paciente: Pick<Paciente, 'nome' | 'nomeSocial' | 'alergias'> | undefined,
  medico: Pick<Medico, 'nome' | 'tratamento'> | undefined,
): ConsultaDetalhada {
  const fim = fimDe(consulta);
  return {
    ...consulta,
    pacienteNome: paciente ? nomeExibicaoPaciente(paciente) : '—',
    ...(paciente?.alergias ? { pacienteAlergias: paciente.alergias } : {}),
    medicoNome: medico ? nomeExibicaoMedico(medico) : '—',
    departamentoNome: nomeDepartamento(consulta.departamentoId),
    fim,
    atrasada: estaAtrasada(consulta.status, fim, agora()),
  };
}

/** Consultas com os nomes do paciente e do médico, numa consulta só. */
async function buscarDetalhadas(tx: Executor, onde: SQL | undefined, limite?: number) {
  const consulta = tx
    .select({
      c: consultas,
      pNome: pacientes.nome,
      pNomeSocial: pacientes.nomeSocial,
      pAlergias: pacientes.alergias,
      mNome: medicos.nome,
      mTratamento: medicos.tratamento,
    })
    .from(consultas)
    .leftJoin(pacientes, eq(pacientes.id, consultas.pacienteId))
    .leftJoin(medicos, eq(medicos.id, consultas.medicoId))
    .where(onde)
    .orderBy(asc(consultas.inicio), asc(consultas.id));
  const linhas = await (limite ? consulta.limit(limite) : consulta);
  return linhas.map((l) =>
    detalhar(
      deLinha<Consulta>(consultas, l.c),
      l.pNome
        ? {
            nome: l.pNome,
            nomeSocial: l.pNomeSocial ?? undefined,
            alergias: l.pAlergias ?? undefined,
          }
        : undefined,
      l.mNome ? { nome: l.mNome, tratamento: l.mTratamento as Medico['tratamento'] } : undefined,
    ),
  );
}

async function detalharUma(tx: Executor, id: string): Promise<ConsultaDetalhada> {
  const [d] = await buscarDetalhadas(tx, eq(consultas.id, id));
  if (!d) throw new ErroNaoEncontrado(t.erros.consultaNaoEncontrada);
  return d;
}

const obterOuFalhar = (tx: Executor, id: string) =>
  lerOuFalhar<Consulta>(tx, consultas, id, t.erros.consultaNaoEncontrada, { bloquear: true });

/** Ocupação (consultas agendadas) de um médico ou paciente, sem a consulta indicada. */
async function ocupacoes(tx: Executor, filtro: SQL, ignorarId?: string) {
  const linhas = await tx
    .select({ inicio: consultas.inicio, duracaoMin: consultas.duracaoMin })
    .from(consultas)
    .where(
      and(
        eq(consultas.status, 'agendada'),
        filtro,
        ignorarId ? ne(consultas.id, ignorarId) : undefined,
      ),
    );
  return linhas.map((l) => intervaloDe(new Date(l.inicio).toISOString(), l.duracaoMin));
}

/** `FOR SHARE`: ninguém inativa o paciente nem o médico até o agendamento terminar. */
async function pacienteAtivo(tx: Executor, id: string): Promise<Paciente> {
  const paciente = await lerUm<Paciente>(tx, pacientes, id, { bloquear: 'compartilhado' });
  if (!paciente) throw new ErroNaoEncontrado(t.erros.pacienteNaoEncontrado);
  if (!paciente.ativo) throw conflito('paciente_inativo', t.erros.pacienteInativo, 'pacienteId');
  return paciente;
}

async function medicoAtivo(tx: Executor, id: string): Promise<Medico> {
  const medico = await lerUm<Medico>(tx, medicos, id, { bloquear: 'compartilhado' });
  if (!medico) throw new ErroNaoEncontrado(t.erros.medicoNaoEncontrado);
  if (!medico.ativo) throw conflito('medico_inativo', t.erros.medicoInativo, 'medicoId');
  return medico;
}

/** R-C1 a R-C4 e R-C8 (R-C9 já foi validada pelo esquema). Devolve o início em ISO. */
async function validarAgenda(
  tx: Executor,
  dados: DadosAgendamento,
  medico: Medico,
  pacienteId: string,
  ignorarId?: string,
): Promise<string> {
  const inicio = instanteNoFuso(dados.data, dados.hora).toISOString();
  if (new Date(inicio).getTime() < agora().getTime() - TOLERANCIA_PASSADO_MIN * 60000) {
    throw conflito('horario_passado', c.horarioPassado, 'hora');
  }
  if (dados.data > somarDias(hojeNoFuso(), ANTECEDENCIA_MAX_DIAS)) {
    throw conflito('antecedencia_maxima', c.antecedenciaMaxima(ANTECEDENCIA_MAX_DIAS), 'data');
  }
  const fora = motivoForaDaDisponibilidade(medico.disponibilidade, inicio, dados.duracaoMin);
  if (fora) {
    throw conflito('fora_expediente', fora === 'pausa' ? c.pausa : c.foraExpediente, 'hora');
  }
  const intervalo = intervaloDe(inicio, dados.duracaoMin);
  const doMedico = await ocupacoes(tx, eq(consultas.medicoId, medico.id), ignorarId);
  if (doMedico.some((o) => sobrepoe(o, intervalo))) {
    throw conflito('medico_ocupado', c.medicoOcupado, 'hora');
  }
  const doPaciente = await ocupacoes(tx, eq(consultas.pacienteId, pacienteId), ignorarId);
  if (doPaciente.some((o) => sobrepoe(o, intervalo))) {
    throw conflito('paciente_ocupado', c.pacienteOcupado, 'hora');
  }
  return inicio;
}

/** R-S1, R-S2 e R-S3 para uma mudança de status. */
function transitar(consulta: Consulta, novo: StatusConsulta) {
  if (podeTransitar(consulta.status, novo, agora(), consulta.inicio)) return;
  const antesDoInicio = consulta.status === 'agendada' && novo !== 'cancelada';
  throw new ErroConflito(
    'transicao_invalida',
    antesDoInicio ? c.antesDoInicio : c.transicaoInvalida,
  );
}

async function registrarStatus(
  tx: Executor,
  id: string,
  novo: 'concluida' | 'faltou',
): Promise<ConsultaDetalhada> {
  const consulta = await obterOuFalhar(tx, id);
  transitar(consulta, novo);
  const evento: EventoConsulta = { tipo: novo, em: momento() };
  await atualizarRegistro(tx, consultas, consulta, {
    status: novo,
    eventos: [...consulta.eventos, evento],
  });
  const detalhada = await detalharUma(tx, id);
  if (novo === 'concluida') {
    await registrarAtividade(
      tx,
      'consulta_concluida',
      t.textosAtividade.consultaConcluida(detalhada.pacienteNome),
      id,
    );
  } else {
    await registrarAtividade(
      tx,
      'consulta_faltou',
      t.textosAtividade.consultaFaltou(detalhada.pacienteNome),
      id,
    );
  }
  return detalhada;
}

// ───────────────────────── leitura ─────────────────────────

const meiaNoite = (dataIso: string) => instanteNoFuso(dataIso, '00:00').toISOString();

/** Agenda: consultas em ordem de início, já detalhadas (no máximo `LIMITE_AGENDA`). */
export function listarConsultas(
  banco: Executor,
  filtros: FiltrosAgendaApi,
): Promise<ConsultaDetalhada[]> {
  const onde = and(
    filtros.data ? gte(consultas.inicio, meiaNoite(filtros.data)) : undefined,
    filtros.data ? lt(consultas.inicio, meiaNoite(somarDias(filtros.data, 1))) : undefined,
    filtros.de ? gte(consultas.inicio, meiaNoite(filtros.de)) : undefined,
    filtros.ate ? lt(consultas.inicio, meiaNoite(somarDias(filtros.ate, 1))) : undefined,
    filtros.medicoId ? eq(consultas.medicoId, filtros.medicoId) : undefined,
    filtros.pacienteId ? eq(consultas.pacienteId, filtros.pacienteId) : undefined,
    filtros.departamentoId ? eq(consultas.departamentoId, filtros.departamentoId) : undefined,
    filtros.status ? eq(consultas.status, filtros.status) : undefined,
    // R-C7: "aguardando registro" = agendada que já terminou.
    filtros.pendentes
      ? and(eq(consultas.status, 'agendada'), lt(consultas.fim, momento()))
      : undefined,
  );
  return buscarDetalhadas(banco, onde, LIMITE_AGENDA);
}

export const obterConsulta = (banco: Executor, id: string) => detalharUma(banco, id);

async function calcularHorarios(
  tx: Executor,
  medicoId: string,
  data: string,
  duracaoMin: number,
  pacienteId?: string,
  ignorarConsultaId?: string,
): Promise<HorarioAgenda[]> {
  const medico = await lerUm<Medico>(tx, medicos, medicoId);
  if (!medico) throw new ErroNaoEncontrado(t.erros.medicoNaoEncontrado);
  return gerarHorarios({
    disponibilidade: medico.disponibilidade,
    data,
    duracaoMin,
    ocupacoesMedico: await ocupacoes(tx, eq(consultas.medicoId, medicoId), ignorarConsultaId),
    ocupacoesPaciente: pacienteId
      ? await ocupacoes(tx, eq(consultas.pacienteId, pacienteId), ignorarConsultaId)
      : undefined,
    agora: agora(),
  });
}

/** R-C5 / A1: grade do dia com o motivo de cada horário indisponível. */
export const horariosLivres = (
  banco: Executor,
  medicoId: string,
  data: string,
  duracaoMin: number,
  pacienteId?: string,
  ignorarConsultaId?: string,
) => calcularHorarios(banco, medicoId, data, duracaoMin, pacienteId, ignorarConsultaId);

/** A5: próximo dia, depois de `data`, com algum horário livre (respeitando R-C8). */
export async function proximoDiaDisponivel(
  banco: Executor,
  medicoId: string,
  data: string,
  duracaoMin: number,
  pacienteId?: string,
  ignorarConsultaId?: string,
): Promise<string | null> {
  const limite = somarDias(hojeNoFuso(), ANTECEDENCIA_MAX_DIAS);
  // O `proximoDiaLivre` do domínio é síncrono: carrega a grade de cada dia candidato antes.
  const livres = new Set<string>();
  for (let dia = somarDias(data, 1); dia <= limite; dia = somarDias(dia, 1)) {
    const grade = await calcularHorarios(
      banco,
      medicoId,
      dia,
      duracaoMin,
      pacienteId,
      ignorarConsultaId,
    );
    if (grade.some((h) => h.livre)) {
      livres.add(dia);
      break;
    }
  }
  return proximoDiaLivre(data, (dia) => dia <= limite && livres.has(dia));
}

// ───────────────────────── escrita ─────────────────────────

const chavesAgenda = (medicoId: string, pacienteId: string) => [
  `agenda:medico:${medicoId}`,
  `agenda:paciente:${pacienteId}`,
];

/** P9 */
export function agendarConsulta(banco: Banco, dados: DadosAgendamento): Promise<ConsultaDetalhada> {
  return emTransacao(banco, async (tx) => {
    await travar(tx, ...chavesAgenda(dados.medicoId, dados.pacienteId));
    const paciente = await pacienteAtivo(tx, dados.pacienteId);
    const medico = await medicoAtivo(tx, dados.medicoId);
    const inicio = await validarAgenda(tx, dados, medico, paciente.id);
    const agoraIso = momento();
    const consulta = await inserirRegistro<Consulta>(tx, consultas, {
      id: gerarId(),
      criadoEm: agoraIso,
      atualizadoEm: agoraIso,
      versao: 1,
      pacienteId: paciente.id,
      medicoId: medico.id,
      departamentoId: medico.departamentoId,
      inicio,
      fim: fimDe({ inicio, duracaoMin: dados.duracaoMin }),
      duracaoMin: dados.duracaoMin,
      tipo: dados.tipo,
      status: 'agendada',
      motivo: dados.motivo || undefined,
      eventos: [{ tipo: 'agendada', em: agoraIso }],
    });
    const detalhada = detalhar(consulta, paciente, medico);
    await registrarAtividade(
      tx,
      'consulta_agendada',
      t.textosAtividade.consultaAgendada(detalhada.pacienteNome, detalhada.medicoNome),
      consulta.id,
    );
    return detalhada;
  });
}

/** P10 / R-C6: muda data, hora, duração, tipo, motivo e, opcionalmente, o médico. */
export function reagendarConsulta(
  banco: Banco,
  id: string,
  dados: DadosAgendamento,
  versao: number,
): Promise<ConsultaDetalhada> {
  return emTransacao(banco, async (tx) => {
    const previa = await lerOuFalhar<Consulta>(tx, consultas, id, t.erros.consultaNaoEncontrada);
    await travar(tx, ...chavesAgenda(dados.medicoId, previa.pacienteId));
    // Trava o paciente antes da consulta: a mesma ordem da inativação do paciente (sem impasse).
    await lerUm<Paciente>(tx, pacientes, previa.pacienteId, { bloquear: 'compartilhado' });
    const consulta = await obterOuFalhar(tx, id);
    if (consulta.status !== 'agendada') {
      throw new ErroConflito('transicao_invalida', c.transicaoInvalida);
    }
    conferirVersao(consulta, versao);
    const paciente = await pacienteAtivo(tx, consulta.pacienteId);
    const medico = await medicoAtivo(tx, dados.medicoId);
    const inicio = await validarAgenda(tx, dados, medico, consulta.pacienteId, id);
    const agoraIso = momento();
    const eventos =
      inicio !== consulta.inicio || medico.id !== consulta.medicoId
        ? [
            ...consulta.eventos,
            { tipo: 'reagendada' as const, em: agoraIso, de: consulta.inicio, para: inicio },
          ]
        : consulta.eventos;
    const atualizada = await atualizarRegistro(tx, consultas, consulta, {
      medicoId: medico.id,
      departamentoId: medico.departamentoId,
      inicio,
      fim: fimDe({ inicio, duracaoMin: dados.duracaoMin }),
      duracaoMin: dados.duracaoMin,
      tipo: dados.tipo,
      motivo: dados.motivo,
      eventos,
    });
    const detalhada = detalhar(atualizada, paciente, medico);
    await registrarAtividade(
      tx,
      'consulta_reagendada',
      t.textosAtividade.consultaReagendada(detalhada.pacienteNome, detalhada.medicoNome),
      id,
    );
    return detalhada;
  });
}

/** P11: motivo já validado pelo esquema de cancelamento (5–300 caracteres). */
export function cancelarConsulta(
  banco: Banco,
  id: string,
  motivo: string,
  versao: number,
): Promise<ConsultaDetalhada> {
  return emTransacao(banco, async (tx) => {
    const consulta = await obterOuFalhar(tx, id);
    transitar(consulta, 'cancelada');
    conferirVersao(consulta, versao);
    await atualizarRegistro(tx, consultas, consulta, {
      status: 'cancelada',
      motivoCancelamento: motivo,
      eventos: [...consulta.eventos, { tipo: 'cancelada', em: momento(), detalhe: motivo }],
    });
    const detalhada = await detalharUma(tx, id);
    await registrarAtividade(
      tx,
      'consulta_cancelada',
      t.textosAtividade.consultaCancelada(detalhada.pacienteNome),
      id,
    );
    return detalhada;
  });
}

/** P12 */
export const concluirConsulta = (banco: Banco, id: string) =>
  emTransacao(banco, (tx) => registrarStatus(tx, id, 'concluida'));

/** P12 */
export const marcarFalta = (banco: Banco, id: string) =>
  emTransacao(banco, (tx) => registrarStatus(tx, id, 'faltou'));

/** P13: registra várias de uma vez; se uma falhar, nenhuma é alterada. */
export function registrarEmLote(
  banco: Banco,
  ids: string[],
  acao: 'concluida' | 'faltou',
): Promise<number> {
  return emTransacao(banco, async (tx) => {
    // Trava as consultas na mesma ordem em todas as transações (sem impasse).
    await tx
      .select({ id: consultas.id })
      .from(consultas)
      .where(inArray(consultas.id, ids))
      .orderBy(asc(consultas.id))
      .for('update');
    for (const id of ids) await registrarStatus(tx, id, acao);
    return ids.length;
  });
}
