/**
 * Serviço de consultas (processos P9–P13). Revalida todas as regras de agenda
 * ao gravar, mesmo que a tela só ofereça horários livres (R-C5).
 */
import { ANTECEDENCIA_MAX_DIAS, TOLERANCIA_PASSADO_MIN } from '../config/limites';
import { t } from '../i18n/pt-BR';
import {
  esquemaAgendamento,
  esquemaCancelamento,
  type DadosAgendamento,
  type EntradaAgendamento,
} from '../schemas/consulta';
import type {
  Consulta,
  ConsultaDetalhada,
  EventoConsulta,
  FiltrosAgenda,
  HorarioAgenda,
  Medico,
  Paciente,
  StatusConsulta,
} from '../types';
import {
  estaAtrasada,
  gerarHorarios,
  intervaloDe,
  motivoForaDaDisponibilidade,
  podeTransitar,
  proximoDiaLivre,
  sobrepoe,
} from '../utils/agenda';
import { dataDoInstante, hojeNoFuso, instanteNoFuso, somarDias } from '../utils/datas';
import { gerarId } from '../utils/id';
import { agora } from '../utils/relogio';
import { registrarAtividade } from './atividades';
import { repoConsultas, repoMedicos, repoPacientes } from './colecoes';
import {
  ErroConcorrencia,
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
  type CodigoConflito,
} from './erros';
import { executar } from './infra';
import { nomeDepartamento, nomeExibicaoMedico } from './medicos';
import { nomeExibicaoPaciente } from './pacientes';
import { transacao } from './repositorio';

const c = t.conflitos;

// ───────────────────────── auxiliares ─────────────────────────

const fimDe = (consulta: Pick<Consulta, 'inicio' | 'duracaoMin'>) =>
  new Date(intervaloDe(consulta.inicio, consulta.duracaoMin).fim).toISOString();

/** Monta a versão para exibição: nomes resolvidos, fim e "aguardando registro" (R-C7). */
export function detalhar(consulta: Consulta): ConsultaDetalhada {
  const paciente = repoPacientes.obter(consulta.pacienteId);
  const medico = repoMedicos.obter(consulta.medicoId);
  const fim = fimDe(consulta);
  return {
    ...consulta,
    pacienteNome: paciente ? nomeExibicaoPaciente(paciente) : '—',
    pacienteAlergias: paciente?.alergias,
    medicoNome: medico ? nomeExibicaoMedico(medico) : '—',
    departamentoNome: nomeDepartamento(consulta.departamentoId),
    fim,
    atrasada: estaAtrasada(consulta.status, fim, agora()),
  };
}

function obterOuFalhar(id: string): Consulta {
  const consulta = repoConsultas.obter(id);
  if (!consulta) throw new ErroNaoEncontrado(t.erros.consultaNaoEncontrada);
  return consulta;
}

function validar(entrada: EntradaAgendamento): DadosAgendamento {
  const r = esquemaAgendamento.safeParse(entrada);
  if (!r.success) throw ErroValidacao.deZod(r.error);
  return r.data;
}

const conflito = (codigo: CodigoConflito, mensagem: string, campo: string) =>
  new ErroConflito(codigo, mensagem, { campo });

/** Ocupação (consultas agendadas) de um médico ou paciente, sem a consulta indicada. */
function ocupacoes(filtro: (consulta: Consulta) => boolean, ignorarId?: string) {
  return repoConsultas
    .todos()
    .filter((x) => x.status === 'agendada' && x.id !== ignorarId && filtro(x))
    .map((x) => intervaloDe(x.inicio, x.duracaoMin));
}

function pacienteAtivo(id: string): Paciente {
  const paciente = repoPacientes.obter(id);
  if (!paciente) throw new ErroNaoEncontrado(t.erros.pacienteNaoEncontrado);
  if (!paciente.ativo) throw conflito('paciente_inativo', t.erros.pacienteInativo, 'pacienteId');
  return paciente;
}

function medicoAtivo(id: string): Medico {
  const medico = repoMedicos.obter(id);
  if (!medico) throw new ErroNaoEncontrado(t.erros.medicoNaoEncontrado);
  if (!medico.ativo) throw conflito('medico_inativo', t.erros.medicoInativo, 'medicoId');
  return medico;
}

/** R-C1 a R-C4 e R-C8 (R-C9 já foi validada pelo esquema). Devolve o início em ISO. */
function validarAgenda(
  dados: DadosAgendamento,
  medico: Medico,
  pacienteId: string,
  ignorarId?: string,
): string {
  const inicio = instanteNoFuso(dados.data, dados.hora).toISOString();
  const momento = agora();

  // R-C1
  if (new Date(inicio).getTime() < momento.getTime() - TOLERANCIA_PASSADO_MIN * 60000) {
    throw conflito('horario_passado', c.horarioPassado, 'hora');
  }
  // R-C8
  if (dados.data > somarDias(hojeNoFuso(), ANTECEDENCIA_MAX_DIAS)) {
    throw conflito('antecedencia_maxima', c.antecedenciaMaxima(ANTECEDENCIA_MAX_DIAS), 'data');
  }
  // R-C2 / R-M4
  const fora = motivoForaDaDisponibilidade(medico.disponibilidade, inicio, dados.duracaoMin);
  if (fora) {
    throw conflito('fora_expediente', fora === 'pausa' ? c.pausa : c.foraExpediente, 'hora');
  }
  // R-C3 e R-C4 (A2)
  const intervalo = intervaloDe(inicio, dados.duracaoMin);
  if (ocupacoes((x) => x.medicoId === medico.id, ignorarId).some((o) => sobrepoe(o, intervalo))) {
    throw conflito('medico_ocupado', c.medicoOcupado, 'hora');
  }
  if (
    ocupacoes((x) => x.pacienteId === pacienteId, ignorarId).some((o) => sobrepoe(o, intervalo))
  ) {
    throw conflito('paciente_ocupado', c.pacienteOcupado, 'hora');
  }
  return inicio;
}

const nomes = (consulta: Consulta) => {
  const d = detalhar(consulta);
  return { paciente: d.pacienteNome, medico: d.medicoNome };
};

/** R-S1, R-S2 e R-S3 para uma mudança de status. */
function transitar(consulta: Consulta, novo: StatusConsulta) {
  if (podeTransitar(consulta.status, novo, agora(), consulta.inicio)) return;
  const antesDoInicio = consulta.status === 'agendada' && novo !== 'cancelada';
  throw new ErroConflito(
    'transicao_invalida',
    antesDoInicio ? c.antesDoInicio : c.transicaoInvalida,
  );
}

function registrarStatus(id: string, novo: 'concluida' | 'faltou'): Consulta {
  const consulta = obterOuFalhar(id);
  transitar(consulta, novo);
  const evento: EventoConsulta = { tipo: novo, em: agora().toISOString() };
  const atualizada = repoConsultas.atualizar(id, {
    status: novo,
    eventos: [...consulta.eventos, evento],
  });
  const { paciente } = nomes(atualizada);
  if (novo === 'concluida') {
    registrarAtividade('consulta_concluida', t.textosAtividade.consultaConcluida(paciente), id);
  } else {
    registrarAtividade('consulta_faltou', t.textosAtividade.consultaFaltou(paciente), id);
  }
  return atualizada;
}

// ───────────────────────── leitura ─────────────────────────

/** Agenda: consultas em ordem de início, já detalhadas. */
export const listarConsultas = (filtros: FiltrosAgenda = {}): Promise<ConsultaDetalhada[]> =>
  executar(() =>
    repoConsultas
      .todos()
      .filter((x) => {
        const dia = dataDoInstante(x.inicio);
        if (filtros.data && dia !== filtros.data) return false;
        if (filtros.de && dia < filtros.de) return false;
        if (filtros.ate && dia > filtros.ate) return false;
        if (filtros.medicoId && x.medicoId !== filtros.medicoId) return false;
        if (filtros.pacienteId && x.pacienteId !== filtros.pacienteId) return false;
        if (filtros.departamentoId && x.departamentoId !== filtros.departamentoId) return false;
        if (filtros.status && x.status !== filtros.status) return false;
        return true;
      })
      .map(detalhar)
      .filter((x) => !filtros.pendentes || x.atrasada)
      .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id)),
  );

export const obterConsulta = (id: string): Promise<ConsultaDetalhada> =>
  executar(() => detalhar(obterOuFalhar(id)));

function calcularHorarios(
  medicoId: string,
  data: string,
  duracaoMin: number,
  pacienteId?: string,
  ignorarConsultaId?: string,
): HorarioAgenda[] {
  const medico = repoMedicos.obter(medicoId);
  if (!medico) throw new ErroNaoEncontrado(t.erros.medicoNaoEncontrado);
  return gerarHorarios({
    disponibilidade: medico.disponibilidade,
    data,
    duracaoMin,
    ocupacoesMedico: ocupacoes((x) => x.medicoId === medicoId, ignorarConsultaId),
    ocupacoesPaciente: pacienteId
      ? ocupacoes((x) => x.pacienteId === pacienteId, ignorarConsultaId)
      : undefined,
    agora: agora(),
  });
}

/** R-C5 / A1: grade do dia com o motivo de cada horário indisponível. */
export const horariosLivres = (
  medicoId: string,
  data: string,
  duracaoMin: number,
  pacienteId?: string,
  ignorarConsultaId?: string,
): Promise<HorarioAgenda[]> =>
  executar(() => calcularHorarios(medicoId, data, duracaoMin, pacienteId, ignorarConsultaId));

/** A5: próximo dia, depois de `data`, com algum horário livre (respeitando R-C8). */
export const proximoDiaDisponivel = (
  medicoId: string,
  data: string,
  duracaoMin: number,
  pacienteId?: string,
  ignorarConsultaId?: string,
): Promise<string | null> =>
  executar(() => {
    const limite = somarDias(hojeNoFuso(), ANTECEDENCIA_MAX_DIAS);
    return proximoDiaLivre(
      data,
      (dia) =>
        dia <= limite &&
        calcularHorarios(medicoId, dia, duracaoMin, pacienteId, ignorarConsultaId).some(
          (h) => h.livre,
        ),
    );
  });

// ───────────────────────── escrita ─────────────────────────

/** P9 */
export const agendarConsulta = (entrada: EntradaAgendamento): Promise<ConsultaDetalhada> =>
  executar(() => {
    const dados = validar(entrada);
    return transacao(() => {
      const paciente = pacienteAtivo(dados.pacienteId);
      const medico = medicoAtivo(dados.medicoId);
      const inicio = validarAgenda(dados, medico, paciente.id);
      const momento = agora().toISOString();
      const consulta = repoConsultas.inserir({
        id: gerarId(),
        criadoEm: momento,
        atualizadoEm: momento,
        versao: 1,
        pacienteId: paciente.id,
        medicoId: medico.id,
        departamentoId: medico.departamentoId,
        inicio,
        duracaoMin: dados.duracaoMin,
        tipo: dados.tipo,
        status: 'agendada',
        ...(dados.motivo ? { motivo: dados.motivo } : {}),
        eventos: [{ tipo: 'agendada', em: momento }],
      });
      const n = nomes(consulta);
      registrarAtividade(
        'consulta_agendada',
        t.textosAtividade.consultaAgendada(n.paciente, n.medico),
        consulta.id,
      );
      return detalhar(consulta);
    });
  });

/**
 * P10 / R-C6: muda data, hora, duração, tipo, motivo e, opcionalmente, o médico.
 * O paciente não muda. Conflitos ignoram a própria consulta.
 */
export const reagendarConsulta = (
  id: string,
  entrada: EntradaAgendamento,
  versao: number,
): Promise<ConsultaDetalhada> =>
  executar(() => {
    const dados = validar(entrada);
    return transacao(() => {
      const consulta = obterOuFalhar(id);
      if (consulta.status !== 'agendada') {
        throw new ErroConflito('transicao_invalida', c.transicaoInvalida);
      }
      if (consulta.versao !== versao) throw new ErroConcorrencia();
      pacienteAtivo(consulta.pacienteId);
      const medico = medicoAtivo(dados.medicoId);
      const inicio = validarAgenda(dados, medico, consulta.pacienteId, id);
      const momento = agora().toISOString();
      const eventos =
        inicio !== consulta.inicio || medico.id !== consulta.medicoId
          ? [
              ...consulta.eventos,
              { tipo: 'reagendada' as const, em: momento, de: consulta.inicio, para: inicio },
            ]
          : consulta.eventos;
      const atualizada = repoConsultas.atualizar(id, {
        medicoId: medico.id,
        departamentoId: medico.departamentoId,
        inicio,
        duracaoMin: dados.duracaoMin,
        tipo: dados.tipo,
        motivo: dados.motivo,
        eventos,
      });
      const n = nomes(atualizada);
      registrarAtividade(
        'consulta_reagendada',
        t.textosAtividade.consultaReagendada(n.paciente, n.medico),
        id,
      );
      return detalhar(atualizada);
    });
  });

/** P11: motivo obrigatório (5–300 caracteres). */
export const cancelarConsulta = (
  id: string,
  motivo: string,
  versao: number,
): Promise<ConsultaDetalhada> =>
  executar(() => {
    const r = esquemaCancelamento.safeParse({ motivo });
    if (!r.success) throw ErroValidacao.deZod(r.error);
    return transacao(() => {
      const consulta = obterOuFalhar(id);
      transitar(consulta, 'cancelada');
      if (consulta.versao !== versao) throw new ErroConcorrencia();
      const atualizada = repoConsultas.atualizar(id, {
        status: 'cancelada',
        motivoCancelamento: r.data.motivo,
        eventos: [
          ...consulta.eventos,
          { tipo: 'cancelada', em: agora().toISOString(), detalhe: r.data.motivo },
        ],
      });
      registrarAtividade(
        'consulta_cancelada',
        t.textosAtividade.consultaCancelada(nomes(atualizada).paciente),
        id,
      );
      return detalhar(atualizada);
    });
  });

/** P12 */
export const concluirConsulta = (id: string): Promise<ConsultaDetalhada> =>
  executar(() => transacao(() => detalhar(registrarStatus(id, 'concluida'))));

/** P12 */
export const marcarFalta = (id: string): Promise<ConsultaDetalhada> =>
  executar(() => transacao(() => detalhar(registrarStatus(id, 'faltou'))));

/** P13: registra várias de uma vez; se uma falhar, nenhuma é alterada. */
export const registrarEmLote = (ids: string[], acao: 'concluida' | 'faltou'): Promise<number> =>
  executar(() =>
    transacao(() => {
      for (const id of ids) registrarStatus(id, acao);
      return ids.length;
    }),
  );

/** Fim calculado (ISO), exportado para telas e seeds. */
export const fimDaConsulta = fimDe;
