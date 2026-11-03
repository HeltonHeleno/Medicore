/**
 * Serviço da Emergência (processos E1–E10).
 * As ações seguem a matriz de ações por estado; o que não vale no estado atual dá E-16.
 */
import { to } from '../i18n/pt-BR/operacoes';
import { EVASAO_MIN, JANELAS_CORRECAO_H, POR_PAGINA, RETENCAO_DIAS } from '../config/limites';
import { t } from '../i18n/pt-BR';
import { te } from '../i18n/pt-BR/emergencia';
import type {
  EntradaChegada,
  EntradaDesfecho,
  EntradaPedirLeito,
  EntradaReavaliacao,
  EntradaTriagem,
} from '../schemas/emergencia';
import type {
  Atendimento,
  AtendimentoDetalhado,
  FilaEmergencia,
  FiltrosHistoricoEmergencia,
  Medico,
  Paginado,
  StatusAtendimento,
  TipoDesfecho,
} from '../types';
import { autorAtual } from '../utils/autor';
import { paginar } from '../utils/busca';
import { perfilDoPaciente } from '../utils/compatibilidade-leito';
import { dataDoInstante, idade } from '../utils/datas';
import { acimaDoPrazo, calcularPrazo, numeroAtendimento, ordenarFila } from '../utils/fila';
import { gerarId } from '../utils/id';
import { agora } from '../utils/relogio';
import { avaliarSinais } from '../utils/sinais-vitais';
import { dentroDaJanela, excessoMin, limiteDaJanela, minutosDesde } from '../utils/tempos';
import { registrarAtividade } from './atividades';
import { repoPacientes } from './colecoes';
import { repoAtendimentos, repoLeitos, repoSolicitacoes } from './colecoes-operacoes';
import { executar } from './infra';
import { DEPARTAMENTO_EMERGENCIA } from '../config/setores';
import {
  atendimentoAberto,
  cancelarSolicitacaoInterna,
  codigoLeito,
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
  obterOu,
  pacienteAtivo,
  registrarObito,
  situacaoDoPaciente,
  solicitacaoAberta,
  transicaoInvalida,
  validarCom,
} from './operacoes-comum';
import { nomeExibicaoPaciente } from './pacientes';
import { transacao } from './repositorio';

const ta = t.textosAtividade;
const esquemas = () => import('../schemas/emergencia');

// ───────────────────────── leitura ─────────────────────────

/** Momento do chamado (fim da espera), se houver. */
const chamadoEm = (a: Atendimento) => a.eventos.find((e) => e.tipo === 'chamado')?.em;

export function detalharAtendimento(a: Atendimento): AtendimentoDetalhado {
  const p = a.pacienteId ? repoPacientes.obter(a.pacienteId) : undefined;
  const idadeAtual = p ? idade(p.dataNascimento) : a.provisorio?.idadeAproximada;
  const fimEspera = chamadoEm(a) ?? (a.status === 'encerrado' ? a.desfecho?.em : undefined);
  const aguardando = a.status === 'aguardando_atendimento' || a.status === 'aguardando_triagem';
  const momento = agora();
  // Sinais mais recentes: última triagem ou reavaliação.
  const registros = [
    ...a.triagens.map((x) => ({ em: x.em, sinais: x.sinais })),
    ...a.reavaliacoes.map((x) => ({ em: x.em, sinais: x.sinais })),
  ].sort((x, y) => x.em.localeCompare(y.em));
  const ultimos = registros[registros.length - 1]?.sinais;
  const podeReabrir =
    a.status === 'encerrado' &&
    !a.arquivado &&
    a.desfecho &&
    a.desfecho.tipo !== 'internacao' &&
    dentroDaJanela(a.desfecho.registradoEm, JANELAS_CORRECAO_H.atendimento);
  return {
    ...a,
    nomeExibicao: p ? nomeExibicaoPaciente(p) : (a.provisorio?.descricao ?? '—'),
    idade: idadeAtual,
    pacienteAlergias: p?.alergias,
    medicoNome: a.medicoId ? nomeMedico(a.medicoId) : undefined,
    leitoObservacaoCodigo: a.leitoObservacaoId ? codigoLeito(a.leitoObservacaoId) : undefined,
    esperaMin: minutosDesde(a.chegadaEm, fimEspera ?? momento),
    acimaDoPrazo: aguardando && acimaDoPrazo(a.prazo, momento),
    excessoMin: aguardando && a.prazo ? excessoMin(a.prazo, momento) : 0,
    alertasSinais: ultimos ? avaliarSinais(ultimos, idadeAtual).alertas : [],
    ...(podeReabrir
      ? { reabrirAte: limiteDaJanela(a.desfecho!.registradoEm, JANELAS_CORRECAO_H.atendimento) }
      : {}),
  };
}

/** E8: grupos por status; "aguardando atendimento" na ordem de A7. */
export const listarFila = (): Promise<FilaEmergencia> =>
  executar(() => {
    const abertos = repoAtendimentos.todos().filter(atendimentoAberto);
    const porChegada = (status: StatusAtendimento) =>
      abertos
        .filter((a) => a.status === status)
        .sort((x, y) => x.chegadaEm.localeCompare(y.chegadaEm))
        .map(detalharAtendimento);
    return {
      aguardandoAtendimento: ordenarFila(
        abertos.filter((a) => a.status === 'aguardando_atendimento'),
      ).map(detalharAtendimento),
      aguardandoTriagem: porChegada('aguardando_triagem'),
      emAtendimento: porChegada('em_atendimento'),
      emObservacao: porChegada('em_observacao'),
      aguardandoLeito: porChegada('aguardando_leito'),
    };
  });

export const obterAtendimento = (id: string): Promise<AtendimentoDetalhado> =>
  executar(() =>
    detalharAtendimento(obterOu(repoAtendimentos.obter(id), t.erros.atendimentoNaoEncontrado)),
  );

/** Encerrados dos últimos 7 dias (D15), do mais recente para o mais antigo. */
export const listarHistorico = (
  filtros: FiltrosHistoricoEmergencia = {},
): Promise<Paginado<AtendimentoDetalhado>> =>
  executar(() => {
    const limite = agora().getTime() - RETENCAO_DIAS.atendimentos * 86_400_000;
    const lista = repoAtendimentos
      .todos()
      .filter(
        (a) =>
          a.status === 'encerrado' &&
          new Date(a.chegadaEm).getTime() >= limite &&
          (!filtros.data || dataDoInstante(a.chegadaEm) === filtros.data) &&
          (!filtros.risco || a.risco === filtros.risco) &&
          (!filtros.desfecho || a.desfecho?.tipo === filtros.desfecho),
      )
      .sort((x, y) => y.chegadaEm.localeCompare(x.chegadaEm))
      .map(detalharAtendimento);
    return paginar(lista, filtros.pagina, filtros.porPagina ?? POR_PAGINA);
  });

// ───────────────────────── escrita ─────────────────────────

function atendimentoEm(
  id: string,
  versao: number,
  status?: readonly StatusAtendimento[],
): Atendimento {
  const a = obterOu(repoAtendimentos.obter(id), t.erros.atendimentoNaoEncontrado);
  if (!atendimentoAberto(a)) throw transicaoInvalida(te.regras.atendimentoEncerrado);
  if (status && !status.includes(a.status))
    throw transicaoInvalida(te.regras.transicao(te.status[a.status]));
  conferirVersao(a, versao);
  return a;
}

const evento = (
  tipo: Atendimento['eventos'][number]['tipo'],
  extra: Partial<Atendimento['eventos'][number]> = {},
) => ({
  tipo,
  em: momentoAtual(),
  autor: autorAtual(),
  ...extra,
});

/** E1 */
export const registrarChegada = async (entrada: EntradaChegada): Promise<Atendimento> => {
  const { esquemaChegada } = await esquemas();
  const dados = validarCom(esquemaChegada, entrada);
  return executar(() =>
    transacao(() => {
      if (dados.pacienteId) {
        const paciente = pacienteAtivo(dados.pacienteId);
        const erro = erroSituacao(paciente, situacaoDoPaciente(paciente.id), {
          internacao: true,
          atendimento: true,
        });
        if (erro) throw erro;
      }
      const momento = momentoAtual();
      const imediata = dados.emergenciaImediata ?? false;
      const numero = numeroAtendimento(repoAtendimentos.todos(), dados.chegadaEm);
      const atendimento = repoAtendimentos.inserir({
        id: gerarId(),
        criadoEm: momento,
        atualizadoEm: momento,
        versao: 1,
        numero,
        ...(dados.pacienteId
          ? { pacienteId: dados.pacienteId }
          : {
              provisorio: {
                descricao: dados.provisorio!.descricao,
                sexo: dados.provisorio!.sexo,
                ...(dados.provisorio!.idadeAproximada !== undefined
                  ? { idadeAproximada: dados.provisorio!.idadeAproximada }
                  : {}),
              },
            }),
        chegadaEm: dados.chegadaEm,
        modoChegada: dados.modoChegada,
        queixa: dados.queixa,
        ...(imediata
          ? {
              risco: 'vermelho' as const,
              prazo: calcularPrazo({}, { risco: 'vermelho', em: dados.chegadaEm }),
            }
          : {}),
        triagens: [],
        reavaliacoes: [],
        status: imediata ? 'aguardando_atendimento' : 'aguardando_triagem',
        eventos: [
          {
            tipo: 'chegada',
            em: dados.chegadaEm,
            autor: autorAtual(),
            ...(imediata ? { para: 'vermelho' } : {}),
          },
        ],
      });
      if (imediata)
        registrarAtividade('emergencia_vermelho', ta.emergenciaVermelho(numero), atendimento.id);
      return atendimento;
    }),
  );
};

/** E2: triagem e retriagem (R-E3, R-E6). */
export const triar = async (
  id: string,
  entrada: EntradaTriagem,
  versao: number,
): Promise<Atendimento> => {
  const { esquemaTriagem } = await esquemas();
  const atual = obterOu(repoAtendimentos.obter(id), t.erros.atendimentoNaoEncontrado);
  const dados = validarCom(esquemaTriagem(atual.risco), entrada);
  return executar(() =>
    transacao(() => {
      const a = atendimentoEm(id, versao);
      // A cor pode ter mudado entre a validação e a gravação (outra aba): confere de novo.
      validarCom(esquemaTriagem(a.risco), entrada);
      const em = momentoAtual();
      const triagem = {
        em,
        profissional: dados.profissional,
        risco: dados.risco,
        sinais: dados.sinais,
        autor: autorAtual(),
        ...(dados.pesoKg !== undefined ? { pesoKg: dados.pesoKg } : {}),
        ...(dados.observacao ? { observacao: dados.observacao } : {}),
        ...(dados.justificativa ? { justificativa: dados.justificativa } : {}),
      };
      const prazo = calcularPrazo({ risco: a.risco, prazo: a.prazo }, { risco: dados.risco, em });
      if (a.solicitacaoId) {
        const s = repoSolicitacoes.obter(a.solicitacaoId);
        if (s && solicitacaoAberta(s))
          repoSolicitacoes.atualizar(s.id, { prioridade: dados.risco });
      }
      if (dados.risco === 'vermelho' && a.risco !== 'vermelho') {
        registrarAtividade('emergencia_vermelho', ta.emergenciaVermelho(a.numero), a.id);
      }
      return repoAtendimentos.atualizar(id, {
        triagens: [...a.triagens, triagem],
        risco: dados.risco,
        prazo,
        status: a.status === 'aguardando_triagem' ? 'aguardando_atendimento' : a.status,
        eventos: [...a.eventos, evento('triagem', { de: a.risco, para: dados.risco })],
      });
    }),
  );
};

/** E10: sinais vitais sem mudar a cor nem o prazo (R-E16). */
export const reavaliar = async (
  id: string,
  entrada: EntradaReavaliacao,
  versao: number,
): Promise<Atendimento> => {
  const { esquemaReavaliacao } = await esquemas();
  const dados = validarCom(esquemaReavaliacao, entrada);
  return executar(() =>
    transacao(() => {
      const a = atendimentoEm(id, versao);
      const em = momentoAtual();
      return repoAtendimentos.atualizar(id, {
        reavaliacoes: [
          ...a.reavaliacoes,
          {
            em,
            sinais: dados.sinais,
            autor: autorAtual(),
            ...(dados.observacao ? { observacao: dados.observacao } : {}),
          },
        ],
        eventos: [...a.eventos, evento('reavaliacao')],
      });
    }),
  );
};

/** E3 (R-E7). */
export const chamar = (id: string, medicoId: string, versao: number): Promise<Atendimento> =>
  executar(() =>
    transacao(() => {
      const a = atendimentoEm(id, versao, ['aguardando_atendimento']);
      medicoAtivo(medicoId);
      const em = momentoAtual();
      return repoAtendimentos.atualizar(id, {
        status: 'em_atendimento',
        medicoId,
        eventos: [
          ...a.eventos,
          evento('chamado', { medicoId, excessoMin: a.prazo ? excessoMin(a.prazo, em) : 0 }),
        ],
      });
    }),
  );

/** E4 (R-E12): só leitos do setor Observação, com perfil compatível. */
export const colocarEmObservacao = (
  id: string,
  leitoId: string,
  versao: number,
): Promise<Atendimento> =>
  executar(() =>
    transacao(() => {
      const a = atendimentoEm(id, versao, ['em_atendimento']);
      const leito = obterOu(repoLeitos.obter(leitoId), t.erros.leitoNaoEncontrado);
      if (leito.setorId !== 'observacao') throw erroCampo('leitoId', te.regras.leitoNaoObservacao);
      // Retomado com o leito mantido: volta ao mesmo leito sem trocar.
      if (a.leitoObservacaoId && a.leitoObservacaoId !== leitoId) {
        const anterior = repoLeitos.obter(a.leitoObservacaoId);
        if (anterior?.status === 'ocupado' && anterior.atendimentoId === a.id)
          liberarParaHigienizacao(anterior.id);
      }
      if (!(leito.status === 'ocupado' && leito.atendimentoId === a.id)) {
        if (leito.status !== 'livre')
          throw conflito('leito_indisponivel', to.leitoIndisponivel, 'leitoId');
        const p = a.pacienteId ? repoPacientes.obter(a.pacienteId) : undefined;
        const anos = p ? idade(p.dataNascimento) : a.provisorio?.idadeAproximada;
        if (anos !== undefined && perfilDoPaciente(anos) !== leito.perfil) {
          throw erroCampo('leitoId', to.leitoPerfilIncompativel);
        }
        repoLeitos.atualizar(leito.id, {
          status: 'ocupado',
          atendimentoId: a.id,
          higienizacao: undefined,
          desde: momentoAtual(),
        });
      }
      return repoAtendimentos.atualizar(id, {
        status: 'em_observacao',
        leitoObservacaoId: leito.id,
        eventos: [...a.eventos, evento('observacao', { para: leito.codigo })],
      });
    }),
  );

/** E4 "Retomar atendimento": o paciente continua no leito de observação. */
export const retomarAtendimento = (id: string, versao: number): Promise<Atendimento> =>
  executar(() =>
    transacao(() => {
      const a = atendimentoEm(id, versao, ['em_observacao']);
      return repoAtendimentos.atualizar(id, {
        status: 'em_atendimento',
        eventos: [...a.eventos, evento('retomado')],
      });
    }),
  );

/** E6: desfecho "internação" — pede leito e fica aguardando (R-E8, R-E9). */
export const solicitarLeito = async (
  id: string,
  entrada: EntradaPedirLeito,
  versao: number,
): Promise<Atendimento> => {
  const { esquemaPedirLeito } = await esquemas();
  const dados = validarCom(esquemaPedirLeito, entrada);
  return executar(() =>
    transacao(() => {
      const a = atendimentoEm(id, versao, ['em_atendimento', 'em_observacao']);
      if (!a.pacienteId) throw erroCampo('pacienteId', te.regras.exigeCadastro);
      const paciente = pacienteAtivo(a.pacienteId);
      const sit = situacaoDoPaciente(paciente.id);
      const erro = erroSituacao(paciente, sit, { internacao: true, solicitacao: true });
      if (erro) throw erro;
      const momento = momentoAtual();
      const sol = repoSolicitacoes.inserir({
        id: gerarId(),
        criadoEm: momento,
        atualizadoEm: momento,
        versao: 1,
        origem: 'emergencia',
        atendimentoId: a.id,
        pacienteId: paciente.id,
        setorDesejado: dados.setorDesejado,
        precaucao: dados.precaucao,
        motivo: dados.motivo,
        prioridade: a.risco ?? 'amarelo',
        status: 'pendente',
        autor: autorAtual(),
      });
      return repoAtendimentos.atualizar(id, {
        status: 'aguardando_leito',
        statusAntesDoLeito: a.status,
        solicitacaoId: sol.id,
        eventos: [...a.eventos, evento('leito_solicitado', { para: dados.setorDesejado })],
      });
    }),
  );
};

/** Matriz de ações: em quais status cada desfecho direto vale (E5). */
const DESFECHO_PERMITIDO: Record<
  Exclude<TipoDesfecho, 'internacao'>,
  readonly StatusAtendimento[]
> = {
  alta: ['em_atendimento', 'em_observacao', 'aguardando_leito'],
  transferencia: ['em_atendimento', 'em_observacao', 'aguardando_leito'],
  obito: ['aguardando_atendimento', 'em_atendimento', 'em_observacao', 'aguardando_leito'],
  evasao: ['aguardando_triagem', 'aguardando_atendimento'],
};

/** Desfechos que valem para o status (para a tela montar o diálogo). */
export const desfechosPermitidos = (status: StatusAtendimento) =>
  (Object.keys(DESFECHO_PERMITIDO) as (keyof typeof DESFECHO_PERMITIDO)[]).filter((d) =>
    DESFECHO_PERMITIDO[d].includes(status),
  );

export interface ResultadoEncerramento {
  atendimento: Atendimento;
  consultasCanceladas: number;
}

/** E5: alta, transferência, óbito ou evasão (R-E8, R-E11, R-E15, R-X7). */
export const encerrar = async (
  id: string,
  entrada: EntradaDesfecho,
  versao: number,
): Promise<ResultadoEncerramento> => {
  const { esquemaDesfecho } = await esquemas();
  const dados = validarCom(esquemaDesfecho, entrada);
  return executar(() =>
    transacao(() => {
      const a = atendimentoEm(id, versao);
      if (!DESFECHO_PERMITIDO[dados.tipo].includes(a.status))
        throw transicaoInvalida(te.regras.desfechoNaoPermitido);
      if (dados.tipo === 'evasao' && minutosDesde(a.chegadaEm) < EVASAO_MIN) {
        throw erroCampo('tipo', te.regras.evasaoCedo(EVASAO_MIN));
      }
      const momento = momentoAtual();
      if (a.solicitacaoId) {
        const s = repoSolicitacoes.obter(a.solicitacaoId);
        if (s && solicitacaoAberta(s)) {
          cancelarSolicitacaoInterna(
            s,
            to.motivoAtendimentoEncerrado(te.desfechos[dados.tipo]),
            false,
          );
        }
      }
      if (a.leitoObservacaoId) {
        const obs = repoLeitos.obter(a.leitoObservacaoId);
        if (obs?.status === 'ocupado' && obs.atendimentoId === a.id)
          liberarParaHigienizacao(obs.id);
      }
      const atendimento = repoAtendimentos.atualizar(id, {
        status: 'encerrado',
        solicitacaoId: undefined,
        statusAntesDoLeito: undefined,
        desfecho: {
          tipo: dados.tipo,
          em: dados.em,
          registradoEm: momento,
          statusAnterior:
            a.status === 'aguardando_leito' ? (a.statusAntesDoLeito ?? 'em_atendimento') : a.status,
          ...(dados.tipo === 'transferencia' && dados.hospitalDestino
            ? { hospitalDestino: dados.hospitalDestino }
            : {}),
          ...(dados.observacao ? { observacao: dados.observacao } : {}),
        },
        eventos: [...a.eventos, evento('desfecho', { para: dados.tipo })],
      });
      registrarAtividade(
        'emergencia_desfecho',
        ta.emergenciaDesfecho(a.numero, te.desfechos[dados.tipo]),
        a.id,
      );
      const consultasCanceladas =
        dados.tipo === 'obito' && a.pacienteId
          ? registrarObito(a.pacienteId, dados.em, { tipo: 'atendimento', id: a.id })
          : 0;
      return { atendimento, consultasCanceladas };
    }),
  );
};

/**
 * E9 / R-E14: reabrir até 2 h depois (exceto desfecho internação). Se o leito de observação
 * já foi ocupado, a tela escolhe outro e manda em `novoLeitoObservacaoId`.
 */
export const reabrir = async (
  id: string,
  motivo: string,
  versao: number,
  novoLeitoObservacaoId?: string,
): Promise<{ atendimento: Atendimento; obitoDesfeito: boolean }> => {
  const { esquemaReabrir } = await esquemas();
  const dados = validarCom(esquemaReabrir, { motivo });
  return executar(() =>
    transacao(() => {
      const a = obterOu(repoAtendimentos.obter(id), t.erros.atendimentoNaoEncontrado);
      if (a.status !== 'encerrado' || !a.desfecho || a.arquivado) throw transicaoInvalida();
      if (a.desfecho.tipo === 'internacao') throw transicaoInvalida(te.regras.reabrirInternacao);
      conferirVersao(a, versao);
      conferirJanela(a.desfecho.registradoEm, JANELAS_CORRECAO_H.atendimento);
      const obito = a.desfecho.tipo === 'obito';
      if (obito && a.pacienteId) desfazerObito(a.pacienteId);
      if (a.pacienteId) {
        const paciente = obterOu(repoPacientes.obter(a.pacienteId), t.erros.pacienteNaoEncontrado);
        const erro = erroSituacao(paciente, situacaoDoPaciente(paciente.id), {
          internacao: true,
          atendimento: true,
        });
        if (erro) throw erro;
      }
      const momento = momentoAtual();
      let leitoObservacaoId = a.leitoObservacaoId;
      // Volta ao leito de observação, se o paciente estava nele.
      const usavaLeito =
        !!a.leitoObservacaoId &&
        (a.desfecho.statusAnterior === 'em_observacao' ||
          a.desfecho.statusAnterior === 'em_atendimento');
      if (usavaLeito) {
        const alvoId = novoLeitoObservacaoId ?? a.leitoObservacaoId!;
        const leito = obterOu(repoLeitos.obter(alvoId), t.erros.leitoNaoEncontrado);
        if (leito.setorId !== 'observacao')
          throw erroCampo('leitoId', te.regras.leitoNaoObservacao);
        if (leito.status !== 'livre' && leito.status !== 'higienizacao') {
          throw conflito('leito_indisponivel', te.regras.leitoObservacaoOcupado, 'leitoId');
        }
        repoLeitos.atualizar(leito.id, {
          status: 'ocupado',
          atendimentoId: a.id,
          higienizacao: undefined,
          desde: momento,
        });
        leitoObservacaoId = leito.id;
      }
      const atendimento = repoAtendimentos.atualizar(id, {
        status: a.desfecho.statusAnterior,
        desfecho: undefined,
        leitoObservacaoId: usavaLeito ? leitoObservacaoId : undefined,
        eventos: [...a.eventos, evento('reaberto', { detalhe: dados.motivo })],
      });
      registrarAtividade('atendimento_reaberto', ta.atendimentoReaberto(a.numero), a.id);
      return { atendimento, obitoDesfeito: obito };
    }),
  );
};

/** E7: liga o atendimento provisório a um cadastro (R-E10). */
export const vincularPaciente = (
  id: string,
  pacienteId: string,
  versao: number,
): Promise<Atendimento> =>
  executar(() =>
    transacao(() => {
      const a = atendimentoEm(id, versao);
      if (a.pacienteId) throw transicaoInvalida(te.regras.jaVinculado);
      const paciente = pacienteAtivo(pacienteId);
      const erro = erroSituacao(paciente, situacaoDoPaciente(paciente.id), {
        internacao: true,
        atendimento: true,
      });
      if (erro) throw erro;
      return repoAtendimentos.atualizar(id, {
        pacienteId,
        eventos: [
          ...a.eventos,
          evento('vinculado', {
            detalhe: a.provisorio?.descricao,
            para: nomeExibicaoPaciente(paciente),
          }),
        ],
      });
    }),
  );

/** R-E7: médicos ativos para chamar, os da Emergência primeiro. */
export const medicosParaChamar = (): Promise<Medico[]> =>
  executar(() => medicosAtivosPorDepartamento(DEPARTAMENTO_EMERGENCIA));
