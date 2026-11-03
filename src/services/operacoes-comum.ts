/**
 * Peças comuns aos serviços de leitos, emergência e farmácia (síncronas, para rodar dentro
 * das transações). Ficam aqui para os três serviços não dependerem uns dos outros.
 */
import { to } from '../i18n/pt-BR/operacoes';
import type { z } from 'zod';
import { t } from '../i18n/pt-BR';
import type {
  Atendimento,
  Internacao,
  Leito,
  Medico,
  Paciente,
  Precaucao,
  SolicitacaoLeito,
  TipoHigienizacao,
} from '../types';
import { autorAtual } from '../utils/autor';
import { dataDoInstante, formatarData, idade } from '../utils/datas';
import { agora } from '../utils/relogio';
import { dentroDaJanela, limiteDaJanela } from '../utils/tempos';
import { horaDoInstante } from '../utils/datas';
import { registrarAtividade } from './atividades';
import { repoConsultas, repoMedicos, repoPacientes } from './colecoes';
import {
  repoAtendimentos,
  repoInternacoes,
  repoLeitos,
  repoSolicitacoes,
} from './colecoes-operacoes';
import {
  ErroConcorrencia,
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
  type CodigoConflito,
} from './erros';
import { nomeExibicaoMedico } from './medicos';
import { consultasFuturasAgendadas, nomeExibicaoPaciente } from './pacientes';

const o = to;

export const momentoAtual = (): string => agora().toISOString();

/** Valida com um esquema zod; erros viram `ErroValidacao` (E-01). */
export function validarCom<E extends z.ZodType>(esquema: E, entrada: unknown): z.output<E> {
  const r = esquema.safeParse(entrada);
  if (!r.success) throw ErroValidacao.deZod(r.error);
  return r.data;
}

export const erroCampo = (campo: string, mensagem: string) =>
  new ErroValidacao({ [campo]: mensagem });

export const conflito = (
  codigo: CodigoConflito,
  mensagem: string,
  campo?: string,
  detalhes?: Record<string, unknown>,
) => new ErroConflito(codigo, mensagem, { campo, detalhes });

/** R-G1 / M34: a versão que a tela carregou precisa ser a atual (E-05). */
export function conferirVersao(atual: { versao: number }, versao: number): void {
  if (atual.versao !== versao) throw new ErroConcorrencia();
}

/** E-16: ação que não vale no estado atual. */
export const transicaoInvalida = (mensagem: string = o.situacaoMudou) =>
  conflito('transicao_invalida', mensagem);

/** D19 / E-18: correção fora da janela. */
export function conferirJanela(registradoEm: string, horas: number): void {
  if (!dentroDaJanela(registradoEm, horas)) {
    const limite = limiteDaJanela(registradoEm, horas);
    throw conflito(
      'janela_correcao_expirada',
      o.janelaExpirada(horas, `${formatarData(dataDoInstante(limite))} ${horaDoInstante(limite)}`),
      undefined,
      { limite },
    );
  }
}

export function obterOu<T>(item: T | undefined, mensagem: string): T {
  if (!item) throw new ErroNaoEncontrado(mensagem);
  return item;
}

/** E-03: paciente precisa existir e estar ativo (R-L10). */
export function pacienteAtivo(id: string, campo = 'pacienteId'): Paciente {
  const p = obterOu(repoPacientes.obter(id), t.erros.pacienteNaoEncontrado);
  if (!p.ativo) throw conflito('paciente_inativo', t.erros.pacienteInativo, campo);
  return p;
}

/** E-03: médico precisa existir e estar ativo (R-L10, R-E7). */
export function medicoAtivo(id: string, campo = 'medicoId'): Medico {
  const m = obterOu(repoMedicos.obter(id), t.erros.medicoNaoEncontrado);
  if (!m.ativo) throw conflito('medico_inativo', t.erros.medicoInativo, campo);
  return m;
}

/**
 * R-E7 e L1 passo 6: médicos ativos para escolha, com os do departamento preferido
 * primeiro e, dentro de cada grupo, por nome. Qualquer médico ativo continua aceito.
 */
export function medicosAtivosPorDepartamento(departamentoId: string): Medico[] {
  const preferido = (m: Medico) => (m.departamentoId === departamentoId ? 0 : 1);
  return repoMedicos
    .todos()
    .filter((m) => m.ativo)
    .sort((a, b) => preferido(a) - preferido(b) || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export const nomePaciente = (id: string | undefined): string => {
  const p = id ? repoPacientes.obter(id) : undefined;
  return p ? nomeExibicaoPaciente(p) : '—';
};
export const nomeMedico = (id: string | undefined): string => {
  const m = id ? repoMedicos.obter(id) : undefined;
  return m ? nomeExibicaoMedico(m) : '—';
};
export const idadePaciente = (p: Paciente | undefined): number | undefined =>
  p ? idade(p.dataNascimento) : undefined;

export const codigoLeito = (id: string | undefined): string =>
  (id ? repoLeitos.obter(id)?.codigo : undefined) ?? '—';

/** R-L13: o tipo de higienização vem da precaução de quem saiu. */
export const tipoHigienizacao = (precaucao: Precaucao | undefined): TipoHigienizacao =>
  precaucao && precaucao !== 'padrao' ? 'isolamento' : 'terminal';

/** Leva o leito para higienização (alta, transferência, fim da observação — R-L3). */
export function liberarParaHigienizacao(leitoId: string, precaucao?: Precaucao): Leito {
  return repoLeitos.atualizar(leitoId, {
    status: 'higienizacao',
    internacaoId: undefined,
    atendimentoId: undefined,
    solicitacaoId: undefined,
    desde: momentoAtual(),
    higienizacao: { tipo: tipoHigienizacao(precaucao) },
  });
}

export const atendimentoAberto = (a: Atendimento) => a.status !== 'encerrado';
export const solicitacaoAberta = (s: SolicitacaoLeito) =>
  s.status === 'pendente' || s.status === 'reservada';

export interface SituacaoHospitalar {
  internacao?: Internacao;
  atendimento?: Atendimento;
  solicitacao?: SolicitacaoLeito;
}

/** Internação ativa, atendimento aberto e pedido de leito em aberto do paciente. */
export function situacaoDoPaciente(pacienteId: string): SituacaoHospitalar {
  return {
    internacao: repoInternacoes
      .todos()
      .find((i) => i.pacienteId === pacienteId && i.status === 'ativa'),
    atendimento: repoAtendimentos
      .todos()
      .find((a) => a.pacienteId === pacienteId && atendimentoAberto(a)),
    solicitacao: repoSolicitacoes
      .todos()
      .find((s) => s.pacienteId === pacienteId && solicitacaoAberta(s)),
  };
}

/** E-14 (R-X1, R-E10): o paciente já está internado ou em atendimento. */
export function erroSituacao(
  p: Paciente,
  s: SituacaoHospitalar,
  quais: { internacao?: boolean; atendimento?: boolean; solicitacao?: boolean },
  campo = 'pacienteId',
): ErroConflito | null {
  const nome = nomeExibicaoPaciente(p);
  if (quais.internacao && s.internacao) {
    return conflito(
      'paciente_internado',
      o.pacienteInternado(nome, codigoLeito(s.internacao.leitoId)),
      campo,
      {
        referencia: { tipo: 'internacao', id: s.internacao.id },
      },
    );
  }
  if (quais.atendimento && s.atendimento) {
    return conflito(
      'paciente_em_atendimento',
      o.pacienteEmAtendimento(nome, s.atendimento.numero),
      campo,
      {
        referencia: { tipo: 'atendimento', id: s.atendimento.id },
      },
    );
  }
  if (quais.solicitacao && s.solicitacao) {
    return conflito('paciente_com_solicitacao', o.pacienteComSolicitacao(nome), campo, {
      referencia: { tipo: 'solicitacao', id: s.solicitacao.id },
    });
  }
  return null;
}

/**
 * Cancela um pedido de leito em aberto e libera a reserva (L6 "Cancelar", R-E15).
 * Com `voltarAtendimento`, o atendimento volta ao status de antes do pedido.
 */
export function cancelarSolicitacaoInterna(
  sol: SolicitacaoLeito,
  motivo: string,
  voltarAtendimento: boolean,
): SolicitacaoLeito {
  const em = momentoAtual();
  if (sol.leitoReservadoId) {
    const leito = repoLeitos.obter(sol.leitoReservadoId);
    if (leito && leito.status === 'reservado' && leito.solicitacaoId === sol.id) {
      repoLeitos.atualizar(leito.id, { status: 'livre', solicitacaoId: undefined, desde: em });
    }
  }
  const cancelada = repoSolicitacoes.atualizar(sol.id, {
    status: 'cancelada',
    leitoReservadoId: undefined,
    motivoCancelamento: motivo,
    canceladaEm: em,
  });
  if (voltarAtendimento && sol.atendimentoId) {
    const a = repoAtendimentos.obter(sol.atendimentoId);
    if (a && a.status === 'aguardando_leito' && a.solicitacaoId === sol.id) {
      repoAtendimentos.atualizar(a.id, {
        status: a.statusAntesDoLeito ?? 'em_atendimento',
        solicitacaoId: undefined,
        statusAntesDoLeito: undefined,
        eventos: [
          ...a.eventos,
          { tipo: 'solicitacao_cancelada', em, autor: autorAtual(), detalhe: motivo },
        ],
      });
    }
  }
  return cancelada;
}

/**
 * R-X7 / M17: óbito inativa o paciente, cancela as consultas futuras e os pedidos de leito
 * eletivos em aberto. Chamado dentro da transação da alta ou do desfecho.
 */
export function registrarObito(
  pacienteId: string,
  em: string,
  referencia: { tipo: 'internacao' | 'atendimento'; id: string },
): number {
  const paciente = repoPacientes.obter(pacienteId);
  if (!paciente) return 0;
  const momento = momentoAtual();
  const futuras = consultasFuturasAgendadas((c) => c.pacienteId === pacienteId);
  for (const c of futuras) {
    repoConsultas.atualizar(c.id, {
      status: 'cancelada',
      motivoCancelamento: o.consultaCanceladaObito,
      eventos: [
        ...c.eventos,
        { tipo: 'cancelada', em: momento, detalhe: o.consultaCanceladaObito },
      ],
    });
  }
  for (const s of repoSolicitacoes.todos()) {
    if (s.pacienteId === pacienteId && solicitacaoAberta(s)) {
      cancelarSolicitacaoInterna(s, o.consultaCanceladaObito, false);
    }
  }
  repoPacientes.atualizar(pacienteId, {
    ativo: false,
    inativadoEm: momento,
    motivoInativacao: o.motivoObito(formatarData(dataDoInstante(em))),
    obito: { em, referencia },
  });
  registrarAtividade(
    'obito_registrado',
    t.textosAtividade.obitoRegistrado(nomeExibicaoPaciente(paciente)),
    pacienteId,
  );
  return futuras.length;
}

/** Desfazer o óbito (L8, E9) reativa o paciente; as consultas canceladas não voltam. */
export function desfazerObito(pacienteId: string): void {
  const p = repoPacientes.obter(pacienteId);
  if (!p?.obito) return;
  repoPacientes.atualizar(pacienteId, {
    ativo: true,
    inativadoEm: undefined,
    motivoInativacao: undefined,
    obito: undefined,
  });
}
