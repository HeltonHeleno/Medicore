/**
 * Serviço da Gestão de leitos (processos L1–L9).
 * Toda gravação revalida as regras dentro da transação, com releitura das coleções (M34).
 *
 * Fase 26: cópia de `apps/web/src/services/leitos.ts` (que continua em uso no navegador até a
 * Fase 27), rodando sobre a unidade de trabalho da API (`unidade.ts`, R-API3). Mudou só o que é do
 * servidor: as leituras de tabelas que crescem sempre (consultas, movimentações) e a versão atual no 412.
 */
import * as esquemas from '@medicore/dominio/schemas/internacao';
import { to } from '@medicore/dominio/i18n/pt-BR/operacoes';
import {
  JANELAS_CORRECAO_H,
  POR_PAGINA,
  RESERVA_DESTAQUE_H,
  HIGIENIZACAO_REF_MIN,
  AGUARDANDO_LEITO_ALERTA_H,
} from '@medicore/dominio/config/limites';
import {
  DEPARTAMENTO_DO_SETOR,
  ehSetorInternacao,
  nomeSetor,
} from '@medicore/dominio/config/setores';
import { t } from '@medicore/dominio/i18n/pt-BR';
import { te } from '@medicore/dominio/i18n/pt-BR/emergencia';
import { tl } from '@medicore/dominio/i18n/pt-BR/leitos';
import type {
  EntradaAlta,
  EntradaBloqueioLeito,
  EntradaEdicaoInternacao,
  EntradaInternacao,
  EntradaSolicitacaoEletiva,
  EntradaTransferencia,
} from '@medicore/dominio/schemas/internacao';
import type {
  Consulta,
  FiltrosInternacoes,
  FiltrosLeitos,
  Internacao,
  InternacaoDetalhada,
  Leito,
  LeitoAvaliado,
  LeitoDetalhado,
  Medico,
  Paciente,
  Paginado,
  Precaucao,
  SetorId,
  SolicitacaoDetalhada,
  SolicitacaoLeito,
} from '@medicore/dominio/types';
import { alergiasNaoInformadas } from '@medicore/dominio/utils/alergia';
import { autoria } from '@medicore/dominio/utils/autor';
import { filtrarPorTermo, paginar } from '@medicore/dominio/utils/busca';
import {
  avaliarLeitos,
  motivosIncompatibilidade,
  perfilDoPaciente,
} from '@medicore/dominio/utils/compatibilidade-leito';
import { dataDoInstante, hojeNoFuso, idade, somarDias } from '@medicore/dominio/utils/datas';
import { gerarId } from '@medicore/dominio/utils/id';
import { pesoRisco } from '@medicore/dominio/utils/fila';
import { agora } from '@medicore/dominio/utils/relogio';
import {
  diaDeInternacao,
  dentroDaJanela,
  limiteDaJanela,
  minutosDesde,
  permanencia,
} from '@medicore/dominio/utils/tempos';
import { registrarAtividade } from './repos';
import { repoPacientes } from './repos';
import { repoAtendimentos, repoInternacoes, repoLeitos, repoSolicitacoes } from './repos';
import { executar } from './repos';
import {
  cancelarSolicitacaoInterna,
  codigoLeito,
  consultasFuturasDoPaciente,
  conferirJanela,
  conferirVersao,
  conflito,
  desfazerObito,
  erroCampo,
  erroSituacao,
  liberarParaHigienizacao,
  medicoAtivo,
  medicosAtivosPorDepartamento,
  momentoAtual,
  nomeMedico,
  nomePaciente,
  obterOu,
  pacienteAtivo,
  registrarObito,
  situacaoDoPaciente,
  solicitacaoAberta,
  transicaoInvalida,
  validarCom,
} from './operacoes-comum';
import { nomeExibicaoPaciente } from '@medicore/dominio/utils/cadastros';
import { transacao } from './repos';

const ta = t.textosAtividade;

// ───────────────────────── leitura: leitos ─────────────────────────

/** Leito pronto para o mapa: ocupante, reserva e destaques de tempo (R-L9, R-L13, R-L14). */
function detalharLeito(l: Leito): LeitoDetalhado {
  const minutosNoStatus = minutosDesde(l.desde);
  const d: LeitoDetalhado = { ...l, setorNome: nomeSetor(l.setorId), minutosNoStatus };
  const hoje = hojeNoFuso();

  if (l.status === 'ocupado') {
    const int = l.internacaoId ? repoInternacoes.obter(l.internacaoId) : undefined;
    const ate = l.atendimentoId ? repoAtendimentos.obter(l.atendimentoId) : undefined;
    const pacienteId = int?.pacienteId ?? ate?.pacienteId;
    const p = pacienteId ? repoPacientes.obter(pacienteId) : undefined;
    d.ocupante = {
      pacienteId,
      nome: p ? nomeExibicaoPaciente(p) : (ate?.provisorio?.descricao ?? '—'),
      idade: p ? idade(p.dataNascimento) : ate?.provisorio?.idadeAproximada,
      internacaoId: int?.id,
      atendimentoId: ate?.id,
      atendimentoNumero: ate?.numero,
      diaInternacao: int ? diaDeInternacao(int.inicio) : undefined,
      temAlergia: Boolean(p?.alergias?.trim()),
      alergiasNaoInformadas: p ? alergiasNaoInformadas(p.alergias) : true,
      precaucao: int?.precaucao,
      previsaoAlta: int?.previsaoAlta,
      previsaoAltaVencida: Boolean(int?.previsaoAlta && int.previsaoAlta < hoje),
    };
  }
  if (l.status === 'reservado' && l.solicitacaoId) {
    const s = repoSolicitacoes.obter(l.solicitacaoId);
    if (s) {
      d.reserva = {
        solicitacaoId: s.id,
        pacienteNome: nomePaciente(s.pacienteId),
        prioridade: s.prioridade,
        desde: s.reservadaEm ?? l.desde,
      };
    }
    d.reservaLonga = minutosNoStatus > RESERVA_DESTAQUE_H * 60;
  }
  if (l.status === 'higienizacao') {
    const ref = HIGIENIZACAO_REF_MIN[l.higienizacao?.tipo ?? 'terminal'];
    if (minutosNoStatus > 2 * ref) d.higienizacaoAtrasada = 'alerta';
    else if (minutosNoStatus > ref) d.higienizacaoAtrasada = 'destaque';
  }
  if (l.status === 'bloqueado' && l.bloqueio?.previsaoLiberacao) {
    d.liberacaoVencida = l.bloqueio.previsaoLiberacao < hoje;
  }
  return d;
}

const ordemSetor: Record<SetorId, number> = {
  uti: 1,
  enfermaria: 2,
  apartamento: 3,
  observacao: 4,
};
const porSetorECodigo = (a: Leito, b: Leito) =>
  ordemSetor[a.setorId] - ordemSetor[b.setorId] || a.codigo.localeCompare(b.codigo);

export const listarLeitos = (filtros: FiltrosLeitos = {}): LeitoDetalhado[] =>
  executar(() =>
    repoLeitos
      .todos()
      .filter(
        (l) =>
          (!filtros.setorId || l.setorId === filtros.setorId) &&
          (!filtros.status || l.status === filtros.status) &&
          (!filtros.perfil || l.perfil === filtros.perfil) &&
          (!filtros.soIsolamento || l.isolamento),
      )
      .sort(porSetorECodigo)
      .map(detalharLeito),
  );

export const obterLeito = (id: string): LeitoDetalhado =>
  executar(() => detalharLeito(obterOu(repoLeitos.obter(id), t.erros.leitoNaoEncontrado)));

/** M24: leitos ocupados por pacientes cujo nome (ou nome social) bate com a busca. */
export const buscarPacienteNoMapa = (termo: string): LeitoDetalhado[] =>
  executar(() => {
    const ocupados = repoLeitos
      .todos()
      .filter((l) => l.status === 'ocupado')
      .map(detalharLeito);
    // Como na lista de pacientes: acha pelo nome civil ou social, mas mostra só o de exibição (R-X5).
    const nomeCivil = (l: LeitoDetalhado) =>
      l.ocupante?.pacienteId ? repoPacientes.obter(l.ocupante.pacienteId)?.nome : undefined;
    return filtrarPorTermo(ocupados, termo, {
      textos: (l) => [l.ocupante?.nome, nomeCivil(l)],
    }).sort(porSetorECodigo);
  });

/** Histórico de ocupação do leito nos últimos N dias (17.10). */
export const historicoLeito = (id: string, dias = 30): InternacaoDetalhada[] =>
  executar(() => {
    const limite = agora().getTime() - dias * 86_400_000;
    return repoInternacoes
      .todos()
      .filter(
        (i) =>
          (i.leitoId === id ||
            i.eventos.some((e) => e.tipo === 'transferida' && e.de === codigoLeito(id))) &&
          new Date(i.alta?.em ?? agora()).getTime() >= limite,
      )
      .sort((a, b) => b.inicio.localeCompare(a.inicio))
      .map(detalharInternacao);
  });

export interface CriterioCompatibilidade {
  pacienteId: string;
  precaucao: Precaucao;
  setorDesejado?: SetorId;
  solicitacaoId?: string;
  /** Observação (E4) usa só o setor Observação; a internação, só os de internação. */
  setor?: 'internacao' | 'observacao';
}

/** A11: leitos avaliados para um paciente (o sugerido primeiro). */
export function avaliarParaPaciente(
  c: CriterioCompatibilidade,
  ignorarLeitoId?: string,
): LeitoAvaliado[] {
  const paciente = obterOu(repoPacientes.obter(c.pacienteId), t.erros.pacienteNaoEncontrado);
  const tipo = c.setor ?? 'internacao';
  const leitos = repoLeitos
    .todos()
    .filter(
      (l) =>
        l.id !== ignorarLeitoId &&
        (tipo === 'observacao' ? l.setorId === 'observacao' : ehSetorInternacao(l.setorId)),
    );
  return avaliarLeitos(leitos, {
    perfil: perfilDoPaciente(idade(paciente.dataNascimento)),
    precaucao: c.precaucao,
    setorDesejado: c.setorDesejado,
    solicitacaoId: c.solicitacaoId,
  });
}

export const leitosCompativeis = (c: CriterioCompatibilidade, ignorarLeitoId?: string) =>
  executar(() => avaliarParaPaciente(c, ignorarLeitoId));

// ───────────────────────── leitura: internações ─────────────────────────

function detalharInternacao(i: Internacao): InternacaoDetalhada {
  const p = repoPacientes.obter(i.pacienteId);
  const leito = repoLeitos.obter(i.leitoId);
  const hoje = hojeNoFuso();
  const ativa = i.status === 'ativa';
  return {
    ...i,
    pacienteNome: p ? nomeExibicaoPaciente(p) : '—',
    pacienteIdade: p ? idade(p.dataNascimento) : undefined,
    pacienteAlergias: p?.alergias,
    leitoCodigo: leito?.codigo ?? '—',
    setorId: leito?.setorId ?? '',
    setorNome: leito ? nomeSetor(leito.setorId) : '—',
    medicoNome: nomeMedico(i.medicoResponsavelId),
    permanenciaDias: permanencia(i.inicio, i.alta?.em),
    previsaoAltaVencida: ativa && Boolean(i.previsaoAlta && i.previsaoAlta < hoje),
    previsaoAltaHoje: ativa && i.previsaoAlta === hoje,
    ...(i.alta && dentroDaJanela(i.alta.registradaEm, JANELAS_CORRECAO_H.alta)
      ? { desfazerAltaAte: limiteDaJanela(i.alta.registradaEm, JANELAS_CORRECAO_H.alta) }
      : {}),
  };
}

export const listarInternacoes = (
  filtros: FiltrosInternacoes = {},
): Paginado<InternacaoDetalhada> =>
  executar(() => {
    const status = filtros.status ?? 'ativa';
    const hoje = hojeNoFuso();
    let lista = repoInternacoes
      .todos()
      .filter((i) => i.status === status)
      .map(detalharInternacao)
      .filter(
        (i) =>
          (!filtros.setorId || i.setorId === filtros.setorId) &&
          (!filtros.medicoId || i.medicoResponsavelId === filtros.medicoId) &&
          (filtros.altaPrevista !== 'hoje' || i.previsaoAlta === hoje) &&
          (filtros.altaPrevista !== 'vencida' || i.previsaoAltaVencida),
      );
    lista = filtrarPorTermo(lista, filtros.busca, {
      textos: (i) => [i.pacienteNome, i.leitoCodigo],
    });
    lista.sort((a, b) =>
      status === 'ativa'
        ? a.leitoCodigo.localeCompare(b.leitoCodigo)
        : (b.alta?.em ?? '').localeCompare(a.alta?.em ?? ''),
    );
    return paginar(lista, filtros.pagina, filtros.porPagina ?? POR_PAGINA);
  });

export const obterInternacao = (id: string): InternacaoDetalhada =>
  executar(() =>
    detalharInternacao(obterOu(repoInternacoes.obter(id), t.erros.internacaoNaoEncontrada)),
  );

/** R-X8: consultas agendadas durante a internação (até a previsão de alta ou 7 dias). */
export function consultasNaInternacao(i: Internacao): Consulta[] {
  const hoje = hojeNoFuso();
  const ate = i.previsaoAlta && i.previsaoAlta > hoje ? i.previsaoAlta : somarDias(hoje, 7);
  return consultasFuturasDoPaciente(i.pacienteId).filter((c) => dataDoInstante(c.inicio) <= ate);
}

export const consultasDuranteInternacao = (internacaoId: string): Consulta[] =>
  executar(() =>
    consultasNaInternacao(
      obterOu(repoInternacoes.obter(internacaoId), t.erros.internacaoNaoEncontrada),
    ),
  );

// ───────────────────────── leitura: solicitações ─────────────────────────

function detalharSolicitacao(s: SolicitacaoLeito): SolicitacaoDetalhada {
  const esperaMin = minutosDesde(s.criadoEm);
  return {
    ...s,
    pacienteNome: nomePaciente(s.pacienteId),
    atendimentoNumero: s.atendimentoId
      ? repoAtendimentos.obter(s.atendimentoId)?.numero
      : undefined,
    leitoReservadoCodigo: s.leitoReservadoId ? codigoLeito(s.leitoReservadoId) : undefined,
    esperaMin,
    reservaLonga:
      s.status === 'reservada' &&
      !!s.reservadaEm &&
      minutosDesde(s.reservadaEm) > RESERVA_DESTAQUE_H * 60,
    esperaLonga: s.origem === 'emergencia' && esperaMin > AGUARDANDO_LEITO_ALERTA_H * 60,
  };
}

/** L6 / L9: pedidos em aberto, por prioridade e depois espera (ou data prevista). */
export const listarSolicitacoes = (): SolicitacaoDetalhada[] =>
  executar(() =>
    repoSolicitacoes
      .todos()
      .filter(solicitacaoAberta)
      .sort(
        (a, b) =>
          pesoRisco(a.prioridade) - pesoRisco(b.prioridade) ||
          (a.dataPrevista ?? dataDoInstante(a.criadoEm)).localeCompare(
            b.dataPrevista ?? dataDoInstante(b.criadoEm),
          ) ||
          a.criadoEm.localeCompare(b.criadoEm),
      )
      .map(detalharSolicitacao),
  );

export const obterSolicitacao = (id: string): SolicitacaoDetalhada =>
  executar(() =>
    detalharSolicitacao(obterOu(repoSolicitacoes.obter(id), tl.regras.solicitacaoFechada)),
  );

// ───────────────────────── escrita ─────────────────────────

function internacaoAtiva(id: string, versao?: number): Internacao {
  const i = obterOu(repoInternacoes.obter(id), t.erros.internacaoNaoEncontrada);
  if (i.status !== 'ativa') throw transicaoInvalida(tl.regras.internacaoEncerrada);
  if (versao !== undefined) conferirVersao(i, versao);
  return i;
}

/** R-L2, R-L5, R-L6: confere o leito para o paciente; a exceção exige justificativa. */
function conferirLeito(
  leito: Leito,
  paciente: Paciente,
  precaucao: Precaucao,
  opcoes: { solicitacaoId?: string; justificativa?: string; campo: string },
) {
  if (!ehSetorInternacao(leito.setorId))
    throw erroCampo(opcoes.campo, tl.regras.observacaoSoEmergencia);
  const motivos = motivosIncompatibilidade(leito, {
    perfil: perfilDoPaciente(idade(paciente.dataNascimento)),
    precaucao,
    solicitacaoId: opcoes.solicitacaoId,
  });
  if (motivos.includes('situacao')) {
    throw conflito('leito_indisponivel', to.leitoIndisponivel, opcoes.campo);
  }
  if (!opcoes.justificativa) {
    if (motivos.includes('perfil')) throw erroCampo('justificativa', tl.regras.perfilIncompativel);
    if (motivos.includes('isolamento')) throw erroCampo('justificativa', tl.regras.semIsolamento);
  }
}

/** L1 (eletiva ou transferência externa) e L6 (pelo pedido de leito). */
export const internar = (entrada: EntradaInternacao): Internacao => {
  const { esquemaInternacao } = esquemas;
  const dados = validarCom(esquemaInternacao, entrada);
  return executar(() =>
    transacao(() => {
      const paciente = pacienteAtivo(dados.pacienteId);
      medicoAtivo(dados.medicoResponsavelId, 'medicoResponsavelId');
      const sol = dados.solicitacaoId ? repoSolicitacoes.obter(dados.solicitacaoId) : undefined;
      if (
        dados.solicitacaoId &&
        (!sol || !solicitacaoAberta(sol) || sol.pacienteId !== paciente.id)
      ) {
        throw transicaoInvalida(tl.regras.solicitacaoFechada);
      }
      const situacao = situacaoDoPaciente(paciente.id);
      const erro = erroSituacao(paciente, situacao, { internacao: true });
      if (erro) throw erro;
      // R-X1: paciente em atendimento só é internado pelo pedido do próprio atendimento.
      if (situacao.atendimento && sol?.atendimentoId !== situacao.atendimento.id) {
        throw erroSituacao(paciente, situacao, { atendimento: true })!;
      }
      if (dados.origem === 'emergencia' && !sol?.atendimentoId) {
        throw erroCampo('origem', tl.regras.emAtendimentoUsePedido);
      }

      const leito = obterOu(repoLeitos.obter(dados.leitoId), t.erros.leitoNaoEncontrado);
      conferirLeito(leito, paciente, dados.precaucao, {
        solicitacaoId: sol?.id,
        justificativa: dados.justificativa,
        campo: 'leitoId',
      });

      const momento = momentoAtual();
      const quem = autoria();
      const origem = sol?.atendimentoId ? 'emergencia' : dados.origem;
      const internacao = repoInternacoes.inserir({
        id: gerarId(),
        criadoEm: momento,
        atualizadoEm: momento,
        versao: 1,
        pacienteId: paciente.id,
        leitoId: leito.id,
        medicoResponsavelId: dados.medicoResponsavelId,
        origem,
        ...(origem === 'transferencia_externa' && dados.hospitalOrigem
          ? { hospitalOrigem: dados.hospitalOrigem }
          : {}),
        ...(sol ? { solicitacaoId: sol.id } : {}),
        ...(sol?.atendimentoId ? { atendimentoId: sol.atendimentoId } : {}),
        motivo: dados.motivo,
        precaucao: dados.precaucao,
        inicio: dados.inicio,
        ...(dados.previsaoAlta ? { previsaoAlta: dados.previsaoAlta } : {}),
        status: 'ativa',
        eventos: [
          {
            tipo: 'internada',
            em: dados.inicio,
            ...quem,
            para: leito.codigo,
            ...(dados.justificativa ? { justificativa: dados.justificativa } : {}),
          },
        ],
      });
      repoLeitos.atualizar(leito.id, {
        status: 'ocupado',
        internacaoId: internacao.id,
        atendimentoId: undefined,
        solicitacaoId: undefined,
        higienizacao: undefined,
        bloqueio: undefined,
        desde: momento,
      });

      if (sol) {
        // A reserva era de outro leito: libera.
        if (sol.leitoReservadoId && sol.leitoReservadoId !== leito.id) {
          const reservado = repoLeitos.obter(sol.leitoReservadoId);
          if (reservado?.status === 'reservado' && reservado.solicitacaoId === sol.id) {
            repoLeitos.atualizar(reservado.id, {
              status: 'livre',
              solicitacaoId: undefined,
              desde: momento,
            });
          }
        }
        repoSolicitacoes.atualizar(sol.id, {
          status: 'atendida',
          internacaoId: internacao.id,
          leitoReservadoId: undefined,
        });
        const a = sol.atendimentoId ? repoAtendimentos.obter(sol.atendimentoId) : undefined;
        if (a) {
          if (a.leitoObservacaoId) {
            const obs = repoLeitos.obter(a.leitoObservacaoId);
            if (obs?.status === 'ocupado' && obs.atendimentoId === a.id)
              liberarParaHigienizacao(obs.id);
          }
          repoAtendimentos.atualizar(a.id, {
            status: 'encerrado',
            solicitacaoId: sol.id,
            statusAntesDoLeito: undefined,
            desfecho: {
              tipo: 'internacao',
              em: dados.inicio,
              internacaoId: internacao.id,
              registradoEm: momento,
              statusAnterior: a.statusAntesDoLeito ?? 'em_atendimento',
            },
            eventos: [...a.eventos, { tipo: 'desfecho', em: momento, ...quem, para: 'internacao' }],
          });
          registrarAtividade(
            'emergencia_desfecho',
            ta.emergenciaDesfecho(a.numero, te.desfechos.internacao),
            a.id,
          );
        }
      }

      registrarAtividade(
        'paciente_internado',
        ta.pacienteInternado(nomeExibicaoPaciente(paciente), leito.codigo),
        internacao.id,
      );
      return internacao;
    }),
  );
};

/** L2 */
export const transferir = (
  id: string,
  entrada: EntradaTransferencia,
  versao: number,
): Internacao => {
  const { esquemaTransferencia } = esquemas;
  const dados = validarCom(esquemaTransferencia, entrada);
  return executar(() =>
    transacao(() => {
      const int = internacaoAtiva(id, versao);
      if (dados.leitoDestinoId === int.leitoId)
        throw erroCampo('leitoDestinoId', tl.regras.mesmoLeito);
      const paciente = obterOu(repoPacientes.obter(int.pacienteId), t.erros.pacienteNaoEncontrado);
      const destino = obterOu(repoLeitos.obter(dados.leitoDestinoId), t.erros.leitoNaoEncontrado);
      conferirLeito(destino, paciente, int.precaucao, {
        justificativa: dados.justificativa,
        campo: 'leitoDestinoId',
      });
      const origem = obterOu(repoLeitos.obter(int.leitoId), t.erros.leitoNaoEncontrado);
      const momento = momentoAtual();
      liberarParaHigienizacao(origem.id, int.precaucao);
      repoLeitos.atualizar(destino.id, {
        status: 'ocupado',
        internacaoId: int.id,
        higienizacao: undefined,
        desde: momento,
      });
      const atualizada = repoInternacoes.atualizar(int.id, {
        leitoId: destino.id,
        eventos: [
          ...int.eventos,
          {
            tipo: 'transferida',
            em: momento,
            ...autoria(),
            de: origem.codigo,
            para: destino.codigo,
            motivo: dados.motivo,
            ...(dados.justificativa ? { justificativa: dados.justificativa } : {}),
          },
        ],
      });
      registrarAtividade(
        'paciente_transferido',
        ta.pacienteTransferido(nomeExibicaoPaciente(paciente), origem.codigo, destino.codigo),
        int.id,
      );
      return atualizada;
    }),
  );
};

export interface ResultadoAlta {
  internacao: Internacao;
  /** R-X7: consultas futuras canceladas pelo óbito. */
  consultasCanceladas: number;
  leitoCodigo: string;
}

/** L3 (com o óbito, R-X7). */
export const darAlta = (id: string, entrada: EntradaAlta, versao: number): ResultadoAlta => {
  const { esquemaAlta } = esquemas;
  const dados = validarCom(esquemaAlta, entrada);
  return executar(() =>
    transacao(() => {
      const int = internacaoAtiva(id, versao);
      // Os campos de data e hora têm precisão de minuto: compara no mesmo nível, para que uma
      // alta registrada no mesmo minuto da internação (início com segundos) seja aceita.
      const minuto = (iso: string) => Math.floor(new Date(iso).getTime() / 60_000);
      if (minuto(dados.em) < minuto(int.inicio)) {
        throw erroCampo('em', tl.regras.altaAntesInicio);
      }
      const momento = momentoAtual();
      const leito = liberarParaHigienizacao(int.leitoId, int.precaucao);
      const internacao = repoInternacoes.atualizar(int.id, {
        status: 'encerrada',
        alta: {
          tipo: dados.tipo,
          em: dados.em,
          registradaEm: momento,
          ...(dados.tipo === 'transferencia' && dados.hospitalDestino
            ? { hospitalDestino: dados.hospitalDestino }
            : {}),
          ...(dados.observacao ? { observacao: dados.observacao } : {}),
        },
        eventos: [...int.eventos, { tipo: 'alta', em: momento, ...autoria(), para: dados.tipo }],
      });
      registrarAtividade(
        'alta_registrada',
        ta.altaRegistrada(nomePaciente(int.pacienteId), tl.tiposAlta[dados.tipo]),
        int.id,
      );
      const consultasCanceladas =
        dados.tipo === 'obito'
          ? registrarObito(int.pacienteId, dados.em, { tipo: 'internacao', id: int.id })
          : 0;
      return { internacao, consultasCanceladas, leitoCodigo: leito.codigo };
    }),
  );
};

/** L8 / R-L12: até 6 h, com motivo, e só se o leito original estiver livre ou em higienização. */
export const desfazerAlta = (
  id: string,
  motivo: string,
  versao: number,
): { internacao: Internacao; obitoDesfeito: boolean } => {
  const { esquemaMotivo } = esquemas;
  const dados = validarCom(esquemaMotivo, { motivo });
  return executar(() =>
    transacao(() => {
      const int = obterOu(repoInternacoes.obter(id), t.erros.internacaoNaoEncontrada);
      if (int.status !== 'encerrada' || !int.alta || int.arquivado)
        throw transicaoInvalida(tl.regras.internacaoAtiva);
      conferirVersao(int, versao);
      conferirJanela(int.alta.registradaEm, JANELAS_CORRECAO_H.alta);
      const leito = obterOu(repoLeitos.obter(int.leitoId), t.erros.leitoNaoEncontrado);
      if (leito.status !== 'higienizacao' && leito.status !== 'livre') {
        throw conflito('leito_indisponivel', tl.regras.leitoOriginalOcupado, 'leitoId');
      }
      const obito = int.alta.tipo === 'obito';
      if (obito) desfazerObito(int.pacienteId);
      const paciente = obterOu(repoPacientes.obter(int.pacienteId), t.erros.pacienteNaoEncontrado);
      const erro = erroSituacao(paciente, situacaoDoPaciente(paciente.id), {
        internacao: true,
        atendimento: true,
      });
      if (erro) throw erro;
      const momento = momentoAtual();
      repoLeitos.atualizar(leito.id, {
        status: 'ocupado',
        internacaoId: int.id,
        higienizacao: undefined,
        desde: momento,
      });
      const internacao = repoInternacoes.atualizar(int.id, {
        status: 'ativa',
        alta: undefined,
        eventos: [
          ...int.eventos,
          { tipo: 'alta_desfeita', em: momento, ...autoria(), motivo: dados.motivo },
        ],
      });
      registrarAtividade(
        'alta_desfeita',
        ta.altaDesfeita(nomeExibicaoPaciente(paciente), dados.motivo),
        int.id,
      );
      return { internacao, obitoDesfeito: obito };
    }),
  );
};

export interface ResultadoLote {
  concluidos: string[];
  /** Leitos que mudaram de situação (E-16) e foram pulados. */
  ignorados: string[];
}

/** L4: concluir a higienização de um ou vários leitos (numa transação; os que mudaram são pulados). */
export const concluirHigienizacao = (itens: { id: string; versao: number }[]): ResultadoLote =>
  executar(() =>
    transacao(() => {
      const r: ResultadoLote = { concluidos: [], ignorados: [] };
      const momento = momentoAtual();
      for (const { id, versao } of itens) {
        const l = repoLeitos.obter(id);
        if (!l || l.status !== 'higienizacao' || l.versao !== versao) {
          r.ignorados.push(id);
          continue;
        }
        repoLeitos.atualizar(id, { status: 'livre', higienizacao: undefined, desde: momento });
        r.concluidos.push(id);
      }
      return r;
    }),
  );

/** L4 "Desfazer" (10 s): volta para higienização mantendo o início original. */
export const reverterHigienizacao = (
  id: string,
  versao: number,
  anterior: { desde: string; tipo: 'terminal' | 'isolamento' },
): Leito =>
  executar(() =>
    transacao(() => {
      const l = obterOu(repoLeitos.obter(id), t.erros.leitoNaoEncontrado);
      if (l.status !== 'livre') throw transicaoInvalida();
      conferirVersao(l, versao);
      return repoLeitos.atualizar(id, {
        status: 'higienizacao',
        desde: anterior.desde,
        higienizacao: { tipo: anterior.tipo },
      });
    }),
  );

/** L5 / R-L4 */
export const bloquear = (id: string, entrada: EntradaBloqueioLeito, versao: number): Leito => {
  const { esquemaBloqueioLeito } = esquemas;
  const dados = validarCom(esquemaBloqueioLeito, entrada);
  return executar(() =>
    transacao(() => {
      const l = obterOu(repoLeitos.obter(id), t.erros.leitoNaoEncontrado);
      if (l.status !== 'livre' && l.status !== 'higienizacao')
        throw transicaoInvalida(tl.regras.bloquearSoLivre);
      conferirVersao(l, versao);
      const momento = momentoAtual();
      const leito = repoLeitos.atualizar(id, {
        status: 'bloqueado',
        higienizacao: undefined,
        desde: momento,
        bloqueio: {
          motivo: dados.motivo,
          ...(dados.previsaoLiberacao ? { previsaoLiberacao: dados.previsaoLiberacao } : {}),
          em: momento,
          ...autoria(),
        },
      });
      registrarAtividade('leito_bloqueado', ta.leitoBloqueado(l.codigo, dados.motivo), id);
      return leito;
    }),
  );
};

export const desbloquear = (id: string, versao: number): Leito =>
  executar(() =>
    transacao(() => {
      const l = obterOu(repoLeitos.obter(id), t.erros.leitoNaoEncontrado);
      if (l.status !== 'bloqueado') throw transicaoInvalida();
      conferirVersao(l, versao);
      const leito = repoLeitos.atualizar(id, {
        status: 'livre',
        bloqueio: undefined,
        desde: momentoAtual(),
      });
      registrarAtividade('leito_desbloqueado', ta.leitoDesbloqueado(l.codigo), id);
      return leito;
    }),
  );

/** L7: um evento por campo alterado. */
export const editarInternacao = (
  id: string,
  entrada: EntradaEdicaoInternacao,
  versao: number,
): Internacao => {
  const { esquemaEdicaoInternacao } = esquemas;
  const dados = validarCom(esquemaEdicaoInternacao, entrada);
  return executar(() =>
    transacao(() => {
      const int = internacaoAtiva(id, versao);
      if (dados.medicoResponsavelId !== int.medicoResponsavelId) {
        medicoAtivo(dados.medicoResponsavelId, 'medicoResponsavelId');
      }
      if (dados.previsaoAlta && dados.previsaoAlta < dataDoInstante(int.inicio)) {
        throw erroCampo('previsaoAlta', tl.regras.previsaoAntesInicio);
      }
      const leito = repoLeitos.obter(int.leitoId);
      if (
        dados.precaucao !== int.precaucao &&
        dados.precaucao !== 'padrao' &&
        !leito?.isolamento &&
        !dados.justificativa
      ) {
        throw erroCampo('justificativa', tl.regras.precaucaoSemIsolamento);
      }
      const em = momentoAtual();
      const quem = autoria();
      const eventos = [...int.eventos];
      if (dados.medicoResponsavelId !== int.medicoResponsavelId) {
        eventos.push({
          tipo: 'responsavel_alterado',
          em,
          ...quem,
          de: nomeMedico(int.medicoResponsavelId),
          para: nomeMedico(dados.medicoResponsavelId),
        });
      }
      if ((dados.previsaoAlta ?? '') !== (int.previsaoAlta ?? '')) {
        eventos.push({
          tipo: 'previsao_alterada',
          em,
          ...quem,
          de: int.previsaoAlta,
          para: dados.previsaoAlta,
        });
      }
      if (dados.precaucao !== int.precaucao) {
        eventos.push({
          tipo: 'precaucao_alterada',
          em,
          ...quem,
          de: int.precaucao,
          para: dados.precaucao,
          ...(dados.justificativa ? { justificativa: dados.justificativa } : {}),
        });
      }
      if (dados.motivo !== int.motivo) {
        eventos.push({ tipo: 'motivo_alterado', em, ...quem, de: int.motivo, para: dados.motivo });
      }
      return repoInternacoes.atualizar(id, {
        medicoResponsavelId: dados.medicoResponsavelId,
        previsaoAlta: dados.previsaoAlta,
        precaucao: dados.precaucao,
        motivo: dados.motivo,
        eventos,
      });
    }),
  );
};

/** L9: pedido de leito para internação eletiva (prioridade verde; amarelo com justificativa). */
export const solicitarLeitoEletivo = (entrada: EntradaSolicitacaoEletiva): SolicitacaoLeito => {
  const { esquemaSolicitacaoEletiva } = esquemas;
  const dados = validarCom(esquemaSolicitacaoEletiva, entrada);
  return executar(() =>
    transacao(() => {
      const paciente = pacienteAtivo(dados.pacienteId);
      const erro = erroSituacao(paciente, situacaoDoPaciente(paciente.id), {
        internacao: true,
        atendimento: true,
        solicitacao: true,
      });
      if (erro) throw erro;
      const momento = momentoAtual();
      return repoSolicitacoes.inserir({
        id: gerarId(),
        criadoEm: momento,
        atualizadoEm: momento,
        versao: 1,
        origem: 'eletiva',
        pacienteId: paciente.id,
        setorDesejado: dados.setorDesejado,
        precaucao: dados.precaucao,
        motivo: dados.motivo,
        dataPrevista: dados.dataPrevista,
        prioridade: dados.prioridade ?? 'verde',
        ...(dados.justificativaPrioridade
          ? { justificativaPrioridade: dados.justificativaPrioridade }
          : {}),
        status: 'pendente',
        ...autoria(),
      });
    }),
  );
};

function solicitacaoEmAberto(id: string, versao: number): SolicitacaoLeito {
  const s = obterOu(repoSolicitacoes.obter(id), tl.regras.solicitacaoFechada);
  if (!solicitacaoAberta(s)) throw transicaoInvalida(tl.regras.solicitacaoFechada);
  conferirVersao(s, versao);
  return s;
}

/** L6 "Reservar": o leito fica reservado para o pedido (R-L9). */
export const reservarLeito = (
  solicitacaoId: string,
  leitoId: string,
  versao: number,
): SolicitacaoLeito =>
  executar(() =>
    transacao(() => {
      const s = solicitacaoEmAberto(solicitacaoId, versao);
      const paciente = obterOu(repoPacientes.obter(s.pacienteId), t.erros.pacienteNaoEncontrado);
      const leito = obterOu(repoLeitos.obter(leitoId), t.erros.leitoNaoEncontrado);
      if (leito.id !== s.leitoReservadoId) {
        if (!ehSetorInternacao(leito.setorId))
          throw erroCampo('leitoId', tl.regras.observacaoSoEmergencia);
        const motivos = motivosIncompatibilidade(leito, {
          perfil: perfilDoPaciente(idade(paciente.dataNascimento)),
          precaucao: s.precaucao,
        });
        if (motivos.includes('situacao')) {
          throw conflito('leito_indisponivel', to.leitoIndisponivel, 'leitoId');
        }
        if (motivos.includes('perfil')) throw erroCampo('leitoId', tl.regras.perfilIncompativel);
        if (motivos.includes('isolamento')) throw erroCampo('leitoId', tl.regras.semIsolamento);
      }
      const momento = momentoAtual();
      if (s.leitoReservadoId && s.leitoReservadoId !== leito.id) {
        repoLeitos.atualizar(s.leitoReservadoId, {
          status: 'livre',
          solicitacaoId: undefined,
          desde: momento,
        });
      }
      repoLeitos.atualizar(leito.id, { status: 'reservado', solicitacaoId: s.id, desde: momento });
      return repoSolicitacoes.atualizar(s.id, {
        status: 'reservada',
        leitoReservadoId: leito.id,
        reservadaEm: momento,
      });
    }),
  );

/** L6: cancelar só a reserva (o pedido volta a pendente). */
export const cancelarReserva = (solicitacaoId: string, versao: number): SolicitacaoLeito =>
  executar(() =>
    transacao(() => {
      const s = solicitacaoEmAberto(solicitacaoId, versao);
      if (s.status !== 'reservada' || !s.leitoReservadoId) throw transicaoInvalida();
      repoLeitos.atualizar(s.leitoReservadoId, {
        status: 'livre',
        solicitacaoId: undefined,
        desde: momentoAtual(),
      });
      return repoSolicitacoes.atualizar(s.id, {
        status: 'pendente',
        leitoReservadoId: undefined,
        reservadaEm: undefined,
      });
    }),
  );

/** L6 "Cancelar": libera a reserva e devolve o atendimento ao status anterior (R-E15). */
export const cancelarSolicitacao = (
  id: string,
  motivo: string,
  versao: number,
): SolicitacaoLeito => {
  const { esquemaMotivo } = esquemas;
  const dados = validarCom(esquemaMotivo, { motivo });
  return executar(() =>
    transacao(() =>
      cancelarSolicitacaoInterna(solicitacaoEmAberto(id, versao), dados.motivo, true),
    ),
  );
};

/** L1 passo 6: médicos ativos para responsável, os do departamento ligado ao setor primeiro. */
export const medicosResponsaveis = (setorId?: string): Medico[] =>
  executar(() =>
    medicosAtivosPorDepartamento(
      setorId && ehSetorInternacao(setorId)
        ? DEPARTAMENTO_DO_SETOR[setorId]
        : DEPARTAMENTO_DO_SETOR.enfermaria,
    ),
  );
