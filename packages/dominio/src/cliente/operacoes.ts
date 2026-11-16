/**
 * Fase 26 — Cliente HTTP de leitos, emergência e farmácia, com **as mesmas assinaturas** dos
 * serviços do navegador (`apps/web/src/services/leitos.ts`, `emergencia.ts`, `farmacia.ts`,
 * `situacao-hospitalar.ts`, `indicadores-operacionais.ts`).
 *
 * Como o de cadastros: nos testes da API o transporte é o `inject` do Fastify; na Fase 27, o `fetch`.
 * A versão que a tela carregou vai no `If-Match` (R-API1).
 */
import type { z } from 'zod';
import type {
  EntradaAlta,
  EntradaBloqueioLeito,
  EntradaEdicaoInternacao,
  EntradaInternacao,
  EntradaSolicitacaoEletiva,
  EntradaTransferencia,
} from '../schemas/internacao';
import type {
  EntradaChegada,
  EntradaDesfecho,
  EntradaPedirLeito,
  EntradaReavaliacao,
  EntradaTriagem,
} from '../schemas/emergencia';
import type {
  EntradaAjuste,
  EntradaBloqueioLote,
  EntradaDescarte,
  EntradaDevolucao,
  EntradaDispensacao,
  EntradaLote,
  EntradaMedicamento,
} from '../schemas/farmacia';
import type {
  AlertaOperacional,
  Atendimento,
  AtendimentoDetalhado,
  Consulta,
  Dispensacao,
  EstoqueMedicamento,
  FilaEmergencia,
  FiltrosEstoque,
  FiltrosHistoricoEmergencia,
  FiltrosInternacoes,
  FiltrosLeitos,
  FiltrosMovimentacoes,
  Internacao,
  InternacaoDetalhada,
  Leito,
  LeitoAvaliado,
  LeitoDetalhado,
  LivroControlados,
  Lote,
  LoteDetalhado,
  Medicamento,
  Medico,
  Paginado,
  PeriodoInternacao,
  PontoInternacao,
  Precaucao,
  ResumoEstoque,
  SetorId,
  SolicitacaoDetalhada,
  SolicitacaoLeito,
  TipoHigienizacao,
} from '../types';
import type { CorrespondenciaAlergia } from '../utils/alergia';
import type { PlanoFefo } from '../utils/fefo';
import type * as c from '../contrato/operacoes';
import { criarChamada, type TransporteApi } from './cadastros';

export type DetalheMedicamento = z.output<typeof c.detalheMedicamento>;
export type MovimentacaoDetalhada = z.output<typeof c.movimentacaoDetalhada>;
export type DispensacaoDetalhada = z.output<typeof c.dispensacaoDetalhada>;
export type DispensacaoResumida = z.output<typeof c.dispensacaoResumida>;
export type DestinoDetalhado = NonNullable<z.output<typeof c.destinoDetalhado>>;
export type SituacaoResumida = z.output<typeof c.situacaoResumida>;
export type HistoricoHospitalar = z.output<typeof c.historicoHospitalar>;
export type VinculosMedico = z.output<typeof c.vinculosMedico>;
export type IndicadoresLeitos = z.output<typeof c.indicadoresLeitos>;
export type IndicadoresEmergencia = z.output<typeof c.indicadoresEmergencia>;
export type IndicadoresOperacionais = z.output<typeof c.indicadoresOperacionais>;
export type ResultadoLote = z.output<typeof c.resultadoLoteLeitos>;

export interface ResultadoAlta {
  internacao: Internacao;
  consultasCanceladas: number;
  leitoCodigo: string;
}

export interface ResultadoEncerramento {
  atendimento: Atendimento;
  consultasCanceladas: number;
}

export interface CriterioCompatibilidade {
  pacienteId: string;
  precaucao: Precaucao;
  setorDesejado?: SetorId;
  solicitacaoId?: string;
  setor?: 'internacao' | 'observacao';
}

const enc = encodeURIComponent;

export function criarClienteOperacoes(transporte: TransporteApi) {
  const chamar = criarChamada(transporte);
  const get = <T>(caminho: string, consulta?: Record<string, unknown>) =>
    chamar<T>({
      metodo: 'GET',
      caminho,
      consulta: consulta as Record<string, string | number | boolean | undefined>,
    });
  const post = <T>(caminho: string, corpo?: unknown, versao?: number) =>
    chamar<T>({ metodo: 'POST', caminho, corpo, versao });
  const put = <T>(caminho: string, corpo: unknown, versao: number) =>
    chamar<T>({ metodo: 'PUT', caminho, corpo, versao });

  // ─────────── leitos (L1–L9) ───────────
  const leitos = {
    listarLeitos: (filtros: FiltrosLeitos = {}) => get<LeitoDetalhado[]>('/leitos', { ...filtros }),
    obterLeito: (id: string) => get<LeitoDetalhado>(`/leitos/${enc(id)}`),
    buscarPacienteNoMapa: (termo: string) => get<LeitoDetalhado[]>('/leitos/busca', { termo }),
    historicoLeito: (id: string, dias?: number) =>
      get<InternacaoDetalhada[]>(`/leitos/${enc(id)}/historico`, { dias }),
    leitosCompativeis: (criterio: CriterioCompatibilidade, ignorarLeitoId?: string) =>
      get<LeitoAvaliado[]>('/leitos/compativeis', { ...criterio, ignorarLeitoId }),
    listarInternacoes: (filtros: FiltrosInternacoes = {}) =>
      get<Paginado<InternacaoDetalhada>>('/internacoes', { ...filtros }),
    obterInternacao: (id: string) => get<InternacaoDetalhada>(`/internacoes/${enc(id)}`),
    consultasDuranteInternacao: (id: string) =>
      get<Consulta[]>(`/internacoes/${enc(id)}/consultas`),
    listarSolicitacoes: () => get<SolicitacaoDetalhada[]>('/solicitacoes'),
    obterSolicitacao: (id: string) => get<SolicitacaoDetalhada>(`/solicitacoes/${enc(id)}`),
    internar: (entrada: EntradaInternacao) => post<Internacao>('/internacoes', entrada),
    transferir: (id: string, entrada: EntradaTransferencia, versao: number) =>
      post<Internacao>(`/internacoes/${enc(id)}/transferir`, entrada, versao),
    darAlta: (id: string, entrada: EntradaAlta, versao: number) =>
      post<ResultadoAlta>(`/internacoes/${enc(id)}/alta`, entrada, versao),
    desfazerAlta: (id: string, motivo: string, versao: number) =>
      post<{ internacao: Internacao; obitoDesfeito: boolean }>(
        `/internacoes/${enc(id)}/desfazer-alta`,
        { motivo },
        versao,
      ),
    concluirHigienizacao: (itens: { id: string; versao: number }[]) =>
      post<ResultadoLote>('/leitos/higienizacao', { itens }),
    reverterHigienizacao: (
      id: string,
      versao: number,
      anterior: { desde: string; tipo: TipoHigienizacao },
    ) => post<Leito>(`/leitos/${enc(id)}/reverter-higienizacao`, anterior, versao),
    bloquear: (id: string, entrada: EntradaBloqueioLeito, versao: number) =>
      post<Leito>(`/leitos/${enc(id)}/bloquear`, entrada, versao),
    desbloquear: (id: string, versao: number) =>
      post<Leito>(`/leitos/${enc(id)}/desbloquear`, undefined, versao),
    editarInternacao: (id: string, entrada: EntradaEdicaoInternacao, versao: number) =>
      put<Internacao>(`/internacoes/${enc(id)}`, entrada, versao),
    solicitarLeitoEletivo: (entrada: EntradaSolicitacaoEletiva) =>
      post<SolicitacaoLeito>('/solicitacoes', entrada),
    reservarLeito: (solicitacaoId: string, leitoId: string, versao: number) =>
      post<SolicitacaoLeito>(`/solicitacoes/${enc(solicitacaoId)}/reservar`, { leitoId }, versao),
    cancelarReserva: (solicitacaoId: string, versao: number) =>
      post<SolicitacaoLeito>(
        `/solicitacoes/${enc(solicitacaoId)}/cancelar-reserva`,
        undefined,
        versao,
      ),
    cancelarSolicitacao: (id: string, motivo: string, versao: number) =>
      post<SolicitacaoLeito>(`/solicitacoes/${enc(id)}/cancelar`, { motivo }, versao),
    medicosResponsaveis: (setorId?: string) => get<Medico[]>('/medicos-responsaveis', { setorId }),
  };

  // ─────────── emergência (E1–E10) ───────────
  const emergencia = {
    listarFila: () => get<FilaEmergencia>('/emergencia/fila'),
    obterAtendimento: (id: string) => get<AtendimentoDetalhado>(`/atendimentos/${enc(id)}`),
    listarHistorico: (filtros: FiltrosHistoricoEmergencia = {}) =>
      get<Paginado<AtendimentoDetalhado>>('/atendimentos', { ...filtros }),
    registrarChegada: (entrada: EntradaChegada) => post<Atendimento>('/atendimentos', entrada),
    triar: (id: string, entrada: EntradaTriagem, versao: number) =>
      post<Atendimento>(`/atendimentos/${enc(id)}/triagem`, entrada, versao),
    reavaliar: (id: string, entrada: EntradaReavaliacao, versao: number) =>
      post<Atendimento>(`/atendimentos/${enc(id)}/reavaliacao`, entrada, versao),
    chamar: (id: string, medicoId: string, versao: number) =>
      post<Atendimento>(`/atendimentos/${enc(id)}/chamar`, { medicoId }, versao),
    colocarEmObservacao: (id: string, leitoId: string, versao: number) =>
      post<Atendimento>(`/atendimentos/${enc(id)}/observacao`, { leitoId }, versao),
    retomarAtendimento: (id: string, versao: number) =>
      post<Atendimento>(`/atendimentos/${enc(id)}/retomar`, undefined, versao),
    solicitarLeito: (id: string, entrada: EntradaPedirLeito, versao: number) =>
      post<Atendimento>(`/atendimentos/${enc(id)}/pedir-leito`, entrada, versao),
    encerrar: (id: string, entrada: EntradaDesfecho, versao: number) =>
      post<ResultadoEncerramento>(`/atendimentos/${enc(id)}/encerrar`, entrada, versao),
    reabrir: (id: string, motivo: string, versao: number, novoLeitoObservacaoId?: string) =>
      post<{ atendimento: Atendimento; obitoDesfeito: boolean }>(
        `/atendimentos/${enc(id)}/reabrir`,
        { motivo, novoLeitoObservacaoId },
        versao,
      ),
    vincularPaciente: (id: string, pacienteId: string, versao: number) =>
      post<Atendimento>(`/atendimentos/${enc(id)}/vincular`, { pacienteId }, versao),
    leitosParaObservacao: (id: string) =>
      get<LeitoAvaliado[]>(`/atendimentos/${enc(id)}/leitos-observacao`),
    medicosParaChamar: () => get<Medico[]>('/emergencia/medicos'),
  };

  // ─────────── farmácia (F1–F9) ───────────
  const farmacia = {
    listarEstoque: (filtros: FiltrosEstoque = {}) =>
      get<Paginado<EstoqueMedicamento>>('/medicamentos', { ...filtros }),
    obterMedicamento: (id: string) => get<DetalheMedicamento>(`/medicamentos/${enc(id)}`),
    listarLotesVencimento: () =>
      get<(LoteDetalhado & { medicamento: Medicamento })[]>('/lotes/vencimento'),
    listarMovimentacoes: (filtros: FiltrosMovimentacoes = {}) =>
      get<Paginado<MovimentacaoDetalhada>>('/movimentacoes', { ...filtros }),
    obterDispensacao: (id: string) => get<DispensacaoDetalhada>(`/dispensacoes/${enc(id)}`),
    listarDispensacoesDoPaciente: (pacienteId: string) =>
      get<Dispensacao[]>(`/pacientes/${enc(pacienteId)}/dispensacoes`),
    livroControlados: (medicamentoId: string, de: string, ate: string) =>
      get<LivroControlados>(`/medicamentos/${enc(medicamentoId)}/livro`, { de, ate }),
    previaFefo: (medicamentoId: string, quantidade: number) =>
      get<PlanoFefo & { lotes: Lote[] }>(`/medicamentos/${enc(medicamentoId)}/fefo`, {
        quantidade,
      }),
    verificarAlergia: (pacienteId: string, medicamentoId: string) =>
      get<CorrespondenciaAlergia | null>(
        `/pacientes/${enc(pacienteId)}/alergia/${enc(medicamentoId)}`,
      ),
    criarMedicamento: (entrada: EntradaMedicamento) => post<Medicamento>('/medicamentos', entrada),
    editarMedicamento: (id: string, entrada: EntradaMedicamento, versao: number) =>
      put<Medicamento>(`/medicamentos/${enc(id)}`, entrada, versao),
    inativarMedicamento: (id: string, versao: number, motivo?: string) =>
      post<Medicamento>(`/medicamentos/${enc(id)}/inativar`, { motivo }, versao),
    reativarMedicamento: (id: string, versao: number) =>
      post<Medicamento>(`/medicamentos/${enc(id)}/reativar`, undefined, versao),
    registrarEntrada: (entrada: EntradaLote) => post<Lote>('/lotes', entrada),
    ajustar: (loteId: string, entrada: EntradaAjuste, versao: number) =>
      post<Lote>(`/lotes/${enc(loteId)}/ajuste`, entrada, versao),
    descartarVencidos: (entrada: EntradaDescarte) =>
      post<{ lotes: number; unidades: number }>('/lotes/descarte', entrada),
    bloquearLote: (id: string, entrada: EntradaBloqueioLote, versao: number) =>
      post<Lote>(`/lotes/${enc(id)}/bloquear`, entrada, versao),
    desbloquearLote: (id: string, versao: number) =>
      post<Lote>(`/lotes/${enc(id)}/desbloquear`, undefined, versao),
    destinoDetalhado: (pacienteId: string) =>
      get<DestinoDetalhado | null>(`/pacientes/${enc(pacienteId)}/destino`),
    destinoDaDispensacao: async (pacienteId: string): Promise<Dispensacao['destino'] | null> => {
      const d = await get<DestinoDetalhado | null>(`/pacientes/${enc(pacienteId)}/destino`);
      return d ? { tipo: d.tipo, id: d.id } : null;
    },
    listarDispensacoesDoDestino: (destinoId: string) =>
      get<DispensacaoResumida[]>(`/destinos/${enc(destinoId)}/dispensacoes`),
    dispensar: (entrada: EntradaDispensacao) => post<Dispensacao>('/dispensacoes', entrada),
    devolver: (
      dispensacaoId: string,
      itemIndice: number,
      entrada: EntradaDevolucao,
      versao: number,
    ) =>
      post<Dispensacao>(
        `/dispensacoes/${enc(dispensacaoId)}/itens/${itemIndice}/devolucao`,
        entrada,
        versao,
      ),
    estornar: (id: string, motivo: string, versao: number) =>
      post<Dispensacao>(`/dispensacoes/${enc(id)}/estornar`, { motivo }, versao),
  };

  // ─────────── situação hospitalar e indicadores ───────────
  const situacao = {
    situacaoHospitalar: (pacienteId: string) =>
      get<SituacaoResumida>(`/pacientes/${enc(pacienteId)}/situacao`),
    situacoesHospitalares: () => get<Record<string, SituacaoResumida>>('/situacoes'),
    etiquetasHospitalares: () => get<Record<string, string>>('/situacoes/etiquetas'),
    historicoHospitalar: (pacienteId: string) =>
      get<HistoricoHospitalar>(`/pacientes/${enc(pacienteId)}/historico-hospitalar`),
    vinculosDoMedico: (medicoId: string) =>
      get<VinculosMedico>(`/medicos/${enc(medicoId)}/vinculos`),
    obterIndicadoresOperacionais: () => get<IndicadoresOperacionais>('/indicadores/operacionais'),
    obterIndicadoresLeitos: () => get<IndicadoresLeitos>('/indicadores/leitos'),
    obterIndicadoresEmergencia: () => get<IndicadoresEmergencia>('/indicadores/emergencia'),
    obterResumoEstoque: () => get<ResumoEstoque>('/indicadores/estoque'),
    listarAlertas: () => get<AlertaOperacional[]>('/alertas'),
    obterSerieInternacoes: (periodo: PeriodoInternacao) =>
      get<PontoInternacao[]>('/indicadores/internacoes', { periodo }),
  };

  return { ...leitos, ...emergencia, ...farmacia, ...situacao };
}

export type ClienteOperacoes = ReturnType<typeof criarClienteOperacoes>;
