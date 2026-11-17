/**
 * Fase 26 (BL-01.5) — Contrato das rotas de leitos, emergência e farmácia: o formato das consultas
 * (query string) e das respostas, igual aos tipos do domínio (`types/leito`, `types/internacao`,
 * `types/emergencia`, `types/farmacia`). A API usa estes esquemas para serializar e documentar
 * (OpenAPI); os testes de contrato conferem cada resposta contra eles e contra o serviço.
 *
 * As entradas (corpo das gravações) são os esquemas de `schemas/` (os mesmos do formulário).
 */
import { z } from 'zod';
import { POR_PAGINA_MAXIMO, respostaLista } from './lista';
import { medico } from './cadastros';

// ───────────────────────── peças comuns ─────────────────────────

const instante = z.string().describe('Data e hora em ISO 8601, UTC');
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD');
const inteiro = z.number().int();
const base = {
  id: z.string(),
  criadoEm: instante,
  atualizadoEm: instante,
  versao: z.number().int().min(1),
};
const arquivavel = { arquivado: z.boolean().optional() };

/** Número da query string (`?dias=30`). */
const inteiroDaQuery = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const paginacao = {
  pagina: inteiroDaQuery(1, Number.MAX_SAFE_INTEGER).optional(),
  porPagina: inteiroDaQuery(1, POR_PAGINA_MAXIMO).optional(),
};
/** `true`/`false` da query string. */
const booleanoDaQuery = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

export const corRisco = z.enum(['vermelho', 'laranja', 'amarelo', 'verde', 'azul']);
export const setorId = z.enum(['uti', 'enfermaria', 'apartamento', 'observacao']);
const setorInternacao = z.enum(['uti', 'enfermaria', 'apartamento']);
const precaucao = z.enum(['padrao', 'contato', 'goticulas', 'aerossois']);
const statusLeito = z.enum(['livre', 'ocupado', 'reservado', 'higienizacao', 'bloqueado']);
const perfilLeito = z.enum(['adulto', 'pediatrico']);
const tipoHigienizacao = z.enum(['terminal', 'isolamento']);
const tipoAlta = z.enum(['melhorada', 'a_pedido', 'transferencia', 'obito']);
const statusAtendimento = z.enum([
  'aguardando_triagem',
  'aguardando_atendimento',
  'em_atendimento',
  'em_observacao',
  'aguardando_leito',
  'encerrado',
]);
const tipoDesfecho = z.enum(['alta', 'internacao', 'transferencia', 'obito', 'evasao']);
const sexo = z.enum(['feminino', 'masculino', 'outro', 'nao_informado']);

// ───────────────────────── leitos ─────────────────────────

export const leito = z.object({
  ...base,
  codigo: z.string(),
  setorId,
  quarto: z.string().optional(),
  perfil: perfilLeito,
  isolamento: z.boolean(),
  status: statusLeito,
  internacaoId: z.string().optional(),
  atendimentoId: z.string().optional(),
  solicitacaoId: z.string().optional(),
  desde: instante,
  bloqueio: z
    .object({
      motivo: z.string(),
      previsaoLiberacao: data.optional(),
      em: instante,
      autor: z.string(),
      autorId: z.string().optional(),
    })
    .optional(),
  higienizacao: z.object({ tipo: tipoHigienizacao }).optional(),
});

export const leitoDetalhado = leito.extend({
  setorNome: z.string(),
  ocupante: z
    .object({
      pacienteId: z.string().optional(),
      nome: z.string(),
      idade: inteiro.optional(),
      internacaoId: z.string().optional(),
      atendimentoId: z.string().optional(),
      atendimentoNumero: z.string().optional(),
      diaInternacao: inteiro.optional(),
      temAlergia: z.boolean(),
      alergiasNaoInformadas: z.boolean(),
      precaucao: precaucao.optional(),
      previsaoAlta: data.optional(),
      previsaoAltaVencida: z.boolean().optional(),
    })
    .optional(),
  reserva: z
    .object({
      solicitacaoId: z.string(),
      pacienteNome: z.string(),
      prioridade: corRisco,
      desde: instante,
    })
    .optional(),
  minutosNoStatus: z.number(),
  higienizacaoAtrasada: z.enum(['destaque', 'alerta']).optional(),
  reservaLonga: z.boolean().optional(),
  liberacaoVencida: z.boolean().optional(),
});

export const leitoAvaliado = z.object({
  leito,
  compativel: z.boolean(),
  motivos: z.array(z.enum(['situacao', 'perfil', 'isolamento', 'setor'])),
  sugerido: z.boolean(),
});

export const filtrosLeitos = z.object({
  setorId: setorId.optional(),
  status: statusLeito.optional(),
  perfil: perfilLeito.optional(),
  soIsolamento: booleanoDaQuery,
});

export const consultaCompativeis = z.object({
  pacienteId: z.string().min(1),
  precaucao,
  setorDesejado: setorId.optional(),
  solicitacaoId: z.string().optional(),
  setor: z.enum(['internacao', 'observacao']).optional(),
  ignorarLeitoId: z.string().optional(),
});

// ───────────────────────── internações e pedidos de leito ─────────────────────────

const eventoInternacao = z.object({
  tipo: z.enum([
    'internada',
    'transferida',
    'responsavel_alterado',
    'previsao_alterada',
    'precaucao_alterada',
    'motivo_alterado',
    'alta',
    'alta_desfeita',
  ]),
  em: instante,
  autor: z.string(),
  autorId: z.string().optional(),
  de: z.string().optional(),
  para: z.string().optional(),
  motivo: z.string().optional(),
  justificativa: z.string().optional(),
});

export const internacao = z.object({
  ...base,
  ...arquivavel,
  pacienteId: z.string(),
  leitoId: z.string(),
  medicoResponsavelId: z.string(),
  origem: z.enum(['emergencia', 'eletiva', 'transferencia_externa']),
  hospitalOrigem: z.string().optional(),
  atendimentoId: z.string().optional(),
  solicitacaoId: z.string().optional(),
  motivo: z.string(),
  precaucao,
  inicio: instante,
  previsaoAlta: data.optional(),
  status: z.enum(['ativa', 'encerrada']),
  alta: z
    .object({
      tipo: tipoAlta,
      em: instante,
      hospitalDestino: z.string().optional(),
      observacao: z.string().optional(),
      registradaEm: instante,
    })
    .optional(),
  eventos: z.array(eventoInternacao),
});

export const internacaoDetalhada = internacao.extend({
  pacienteNome: z.string(),
  pacienteIdade: inteiro.optional(),
  pacienteAlergias: z.string().optional(),
  leitoCodigo: z.string(),
  setorId: z.string(),
  setorNome: z.string(),
  medicoNome: z.string(),
  permanenciaDias: inteiro,
  previsaoAltaVencida: z.boolean(),
  previsaoAltaHoje: z.boolean(),
  desfazerAltaAte: instante.optional(),
});

export const filtrosInternacoes = z.object({
  status: z.enum(['ativa', 'encerrada']).optional(),
  busca: z.string().trim().max(100).optional(),
  setorId: z.string().optional(),
  medicoId: z.string().optional(),
  altaPrevista: z.enum(['hoje', 'vencida']).optional(),
  ...paginacao,
});

export const solicitacao = z.object({
  ...base,
  ...arquivavel,
  origem: z.enum(['emergencia', 'eletiva']),
  atendimentoId: z.string().optional(),
  pacienteId: z.string(),
  setorDesejado: setorInternacao,
  precaucao,
  motivo: z.string(),
  dataPrevista: data.optional(),
  prioridade: corRisco,
  justificativaPrioridade: z.string().optional(),
  status: z.enum(['pendente', 'reservada', 'atendida', 'cancelada']),
  leitoReservadoId: z.string().optional(),
  reservadaEm: instante.optional(),
  internacaoId: z.string().optional(),
  motivoCancelamento: z.string().optional(),
  canceladaEm: instante.optional(),
  autor: z.string(),
  autorId: z.string().optional(),
});

export const solicitacaoDetalhada = solicitacao.extend({
  pacienteNome: z.string(),
  atendimentoNumero: z.string().optional(),
  leitoReservadoCodigo: z.string().optional(),
  esperaMin: z.number(),
  reservaLonga: z.boolean(),
  esperaLonga: z.boolean(),
});

export const resultadoAlta = z.object({
  internacao,
  consultasCanceladas: inteiro,
  leitoCodigo: z.string(),
});

export const resultadoDesfazerAlta = z.object({ internacao, obitoDesfeito: z.boolean() });

export const resultadoLoteLeitos = z.object({
  concluidos: z.array(z.string()),
  ignorados: z.array(z.string()),
});

/** L4 em lote: cada leito com a versão que a tela carregou (R-G1). */
export const loteHigienizacao = z.object({
  itens: z
    .array(z.object({ id: z.string().min(1), versao: z.number().int().min(1) }))
    .min(1)
    .max(200),
});

/** L4 "Desfazer": volta o leito para a higienização de antes. */
export const reverterHigienizacao = z.object({
  desde: instante,
  tipo: tipoHigienizacao,
});

export const corpoReserva = z.object({ leitoId: z.string() });

// ───────────────────────── emergência ─────────────────────────

const sinais = z.object({
  pas: z.number().optional(),
  pad: z.number().optional(),
  fc: z.number().optional(),
  fr: z.number().optional(),
  temperatura: z.number().optional(),
  spo2: z.number().optional(),
  dor: z.number().optional(),
  glicemia: z.number().optional(),
});

export const atendimento = z.object({
  ...base,
  ...arquivavel,
  numero: z.string(),
  pacienteId: z.string().optional(),
  provisorio: z
    .object({ descricao: z.string(), sexo, idadeAproximada: inteiro.optional() })
    .optional(),
  chegadaEm: instante,
  modoChegada: z.enum(['meios_proprios', 'ambulancia', 'samu', 'bombeiros', 'policia']),
  queixa: z.string(),
  risco: corRisco.optional(),
  prazo: instante.optional(),
  triagens: z.array(
    z.object({
      em: instante,
      profissional: z.string(),
      risco: corRisco,
      sinais,
      pesoKg: z.number().optional(),
      observacao: z.string().optional(),
      justificativa: z.string().optional(),
      autor: z.string(),
      autorId: z.string().optional(),
    }),
  ),
  reavaliacoes: z.array(
    z.object({ em: instante, sinais, observacao: z.string().optional(), autor: z.string() }),
  ),
  status: statusAtendimento,
  medicoId: z.string().optional(),
  leitoObservacaoId: z.string().optional(),
  solicitacaoId: z.string().optional(),
  statusAntesDoLeito: statusAtendimento.optional(),
  desfecho: z
    .object({
      tipo: tipoDesfecho,
      em: instante,
      hospitalDestino: z.string().optional(),
      observacao: z.string().optional(),
      internacaoId: z.string().optional(),
      registradoEm: instante,
      statusAnterior: statusAtendimento,
    })
    .optional(),
  eventos: z.array(
    z.object({
      tipo: z.enum([
        'chegada',
        'triagem',
        'reavaliacao',
        'chamado',
        'observacao',
        'retomado',
        'leito_solicitado',
        'solicitacao_cancelada',
        'vinculado',
        'desfecho',
        'reaberto',
      ]),
      em: instante,
      autor: z.string(),
      autorId: z.string().optional(),
      de: z.string().optional(),
      para: z.string().optional(),
      detalhe: z.string().optional(),
      medicoId: z.string().optional(),
      excessoMin: z.number().optional(),
    }),
  ),
});

export const atendimentoDetalhado = atendimento.extend({
  nomeExibicao: z.string(),
  idade: inteiro.optional(),
  pacienteAlergias: z.string().optional(),
  medicoNome: z.string().optional(),
  leitoObservacaoCodigo: z.string().optional(),
  esperaMin: z.number(),
  acimaDoPrazo: z.boolean(),
  excessoMin: z.number(),
  alertasSinais: z.array(z.object({ campo: sinais.keyof(), texto: z.string() })),
  reabrirAte: instante.optional(),
});

export const filaEmergencia = z.object({
  aguardandoAtendimento: z.array(atendimentoDetalhado),
  aguardandoTriagem: z.array(atendimentoDetalhado),
  emAtendimento: z.array(atendimentoDetalhado),
  emObservacao: z.array(atendimentoDetalhado),
  aguardandoLeito: z.array(atendimentoDetalhado),
});

export const filtrosHistoricoEmergencia = z.object({
  data: data.optional(),
  risco: corRisco.optional(),
  desfecho: tipoDesfecho.optional(),
  ...paginacao,
});

export const resultadoEncerramento = z.object({ atendimento, consultasCanceladas: inteiro });
export const resultadoReabertura = z.object({ atendimento, obitoDesfeito: z.boolean() });
export const corpoObservacao = z.object({ leitoId: z.string() });
export const corpoVinculo = z.object({ pacienteId: z.string() });
export const corpoReabrir = z.object({
  motivo: z.string(),
  novoLeitoObservacaoId: z.string().optional(),
});

// ───────────────────────── farmácia ─────────────────────────

const formaFarmaceutica = z.enum([
  'comprimido',
  'capsula',
  'solucao_oral',
  'solucao_injetavel',
  'po_injetavel',
  'pomada',
  'outro',
]);
const tipoMovimentacao = z.enum([
  'entrada',
  'dispensacao',
  'devolucao',
  'ajuste_positivo',
  'ajuste_negativo',
  'perda',
  'descarte_vencido',
]);

export const medicamento = z.object({
  ...base,
  nome: z.string(),
  nomeComercial: z.string().optional(),
  principioAtivo: z.string(),
  classe: z.string().optional(),
  concentracao: z.string(),
  forma: formaFarmaceutica,
  unidade: z.enum(['comprimido', 'capsula', 'ampola', 'frasco', 'bisnaga', 'unidade']),
  controlado: z.object({ lista: z.enum(['A1', 'A2', 'A3', 'B1', 'B2', 'C1', 'C5']) }).optional(),
  unidadesPorEmbalagem: inteiro.optional(),
  estoqueMinimo: inteiro,
  ativo: z.boolean(),
  inativadoEm: instante.optional(),
  motivoInativacao: z.string().optional(),
});

export const lote = z.object({
  ...base,
  medicamentoId: z.string(),
  numero: z.string(),
  validade: data,
  fabricante: z.string().optional(),
  notaFiscal: z.string().optional(),
  quantidadeInicial: inteiro,
  quantidadeAtual: inteiro,
  entradaEm: instante,
  bloqueio: z
    .object({
      motivo: z.string(),
      referencia: z.string().optional(),
      em: instante,
      autor: z.string(),
      autorId: z.string().optional(),
    })
    .optional(),
  saldoArquivado: inteiro,
});

export const loteDetalhado = lote.extend({
  vencido: z.boolean(),
  vencendo: z.boolean(),
  diasParaVencer: inteiro,
});

export const movimentacao = z.object({
  id: z.string(),
  tipo: tipoMovimentacao,
  medicamentoId: z.string(),
  loteId: z.string(),
  quantidade: inteiro,
  saldoLoteApos: inteiro,
  dispensacaoId: z.string().optional(),
  motivo: z.string().optional(),
  termo: z.string().optional(),
  autor: z.string(),
  autorId: z.string().optional(),
  em: instante,
});

export const movimentacaoDetalhada = movimentacao.extend({
  medicamentoNome: z.string(),
  loteNumero: z.string(),
  pacienteNome: z.string().optional(),
  pacienteId: z.string().optional(),
});

const alocacao = z.object({ loteId: z.string(), quantidade: inteiro });

export const dispensacao = z.object({
  ...base,
  ...arquivavel,
  pacienteId: z.string(),
  destino: z.object({ tipo: z.enum(['internacao', 'emergencia']), id: z.string() }),
  medicoSolicitanteId: z.string(),
  itens: z.array(
    z.object({
      medicamentoId: z.string(),
      quantidade: inteiro,
      lotes: z.array(alocacao),
      devolvido: inteiro,
    }),
  ),
  alertasConfirmados: z.array(
    z.object({
      tipo: z.enum(['alergia', 'controlado', 'quantidade_alta']),
      medicamentoId: z.string(),
      termo: z.string().optional(),
      justificativa: z.string().optional(),
    }),
  ),
  status: z.enum(['realizada', 'estornada']),
  estorno: z
    .object({ em: instante, motivo: z.string(), autor: z.string(), autorId: z.string().optional() })
    .optional(),
  em: instante,
  autor: z.string(),
  autorId: z.string().optional(),
});

export const dispensacaoDetalhada = dispensacao.extend({
  pacienteNome: z.string(),
  medicoNome: z.string(),
  itensDetalhados: z.array(
    z.object({
      medicamento,
      quantidade: inteiro,
      devolvido: inteiro,
      lotes: z.array(z.object({ lote, quantidade: inteiro })),
    }),
  ),
  estornarAte: instante.optional(),
});

export const dispensacaoResumida = z.object({
  id: z.string(),
  em: instante,
  status: z.enum(['realizada', 'estornada']),
  arquivado: z.boolean().optional(),
  itens: z.array(z.string()),
});

export const estoqueMedicamento = z.object({
  medicamento,
  disponivel: inteiro,
  vencido: inteiro,
  bloqueado: inteiro,
  situacao: z.enum(['ok', 'baixo', 'zerado']),
  vencendo: z.boolean(),
  proximoVencimento: data.optional(),
});

export const detalheMedicamento = z.object({
  estoque: estoqueMedicamento,
  lotes: z.array(loteDetalhado),
  temMovimentacao: z.boolean(),
});

export const loteVencimento = loteDetalhado.extend({ medicamento });

export const livroControlados = z.object({
  medicamento,
  de: data,
  ate: data,
  saldoInicial: inteiro,
  entradas: inteiro,
  saidas: inteiro,
  saldoFinal: inteiro,
  movimentacoes: z.array(movimentacao),
});

export const previaFefo = z.object({
  alocacoes: z.array(alocacao),
  disponivel: inteiro,
  falta: inteiro,
  lotes: z.array(lote),
});

export const correspondenciaAlergia = z
  .object({
    termo: z.string(),
    campo: z.enum(['principioAtivo', 'classe', 'nome']),
    candidato: z.string(),
  })
  .nullable();

export const destinoDetalhado = z
  .object({
    tipo: z.enum(['internacao', 'emergencia']),
    id: z.string(),
    referencia: z.string(),
    medicoId: z.string().optional(),
  })
  .nullable();

export const filtrosEstoque = z.object({
  busca: z.string().trim().max(100).optional(),
  situacao: z.enum(['ok', 'baixo', 'zerado', 'vencendo', 'vencidos']).optional(),
  forma: formaFarmaceutica.optional(),
  soControlados: booleanoDaQuery,
  status: z.enum(['ativos', 'inativos', 'todos']).optional(),
  ordenarPor: z.enum(['nome', 'disponivel', 'vencimento']).optional(),
  ordem: z.enum(['asc', 'desc']).optional(),
  ...paginacao,
});

export const filtrosMovimentacoes = z.object({
  tipo: tipoMovimentacao.optional(),
  de: data.optional(),
  ate: data.optional(),
  medicamentoId: z.string().optional(),
  pacienteId: z.string().optional(),
  ...paginacao,
});

export const consultaLivro = z.object({ de: data, ate: data });
export const consultaFefo = z.object({ quantidade: z.coerce.number().int().min(1) });
export const resultadoDescarte = z.object({ lotes: inteiro, unidades: inteiro });
export const corpoInativarMedicamento = z.object({ motivo: z.string().optional() });

// ───────────────────────── situação hospitalar (R-X8) ─────────────────────────

export const situacaoResumida = z.object({
  internacao: z.object({ id: z.string(), leitoCodigo: z.string() }).optional(),
  atendimento: z.object({ id: z.string(), numero: z.string() }).optional(),
  solicitacao: z.object({ id: z.string(), status: z.string() }).optional(),
});

export const historicoHospitalar = z.object({
  internacoes: z.array(
    z.object({
      id: z.string(),
      leitoCodigo: z.string(),
      inicio: instante,
      fim: instante.optional(),
      tipoAlta: tipoAlta.optional(),
      arquivado: z.boolean(),
    }),
  ),
  atendimentos: z.array(
    z.object({
      id: z.string(),
      numero: z.string(),
      chegadaEm: instante,
      aberto: z.boolean(),
      desfecho: tipoDesfecho.optional(),
      arquivado: z.boolean(),
    }),
  ),
  dispensacoes: z.array(
    z.object({
      id: z.string(),
      em: instante,
      itens: inteiro,
      estornada: z.boolean(),
      arquivado: z.boolean(),
    }),
  ),
});

export const vinculosMedico = z.object({
  internacoes: z.array(
    z.object({
      id: z.string(),
      pacienteNome: z.string(),
      leitoCodigo: z.string(),
      inicio: instante,
    }),
  ),
  atendimentos: z.array(
    z.object({
      id: z.string(),
      numero: z.string(),
      pacienteNome: z.string(),
      status: statusAtendimento,
      chegadaEm: instante,
    }),
  ),
});

// ───────────────────────── indicadores (A12–A14) ─────────────────────────

const porCor = <T extends z.ZodType>(valor: T) =>
  z.object({
    vermelho: valor,
    laranja: valor,
    amarelo: valor,
    verde: valor,
    azul: valor,
  });

export const indicadoresLeitos = z.object({
  setores: z.array(
    z.object({
      setorId: setorInternacao,
      nome: z.string(),
      total: inteiro,
      operacionais: inteiro,
      ocupados: inteiro,
      livres: inteiro,
      higienizacao: inteiro,
      reservados: inteiro,
      bloqueados: inteiro,
      percentual: z.number(),
    }),
  ),
  total: inteiro,
  operacionais: inteiro,
  ocupados: inteiro,
  disponiveis: inteiro,
  higienizacao: inteiro,
  reservados: inteiro,
  bloqueados: inteiro,
  percentual: z.number(),
  previsaoUti: z.number(),
  altasPrevistasHoje: inteiro,
  permanenciaMedia: z.number().nullable(),
  liberacoesPrevistas24h: inteiro,
  giroLeito: z.number(),
});

export const indicadoresEmergencia = z.object({
  abertos: inteiro,
  altaPrioridade: inteiro,
  porCor: porCor(z.object({ aguardando: inteiro, acimaDoPrazo: inteiro })),
  acimaDoPrazo: inteiro,
  esperaMediaPorCor: porCor(z.number()).partial(),
  atendimentosHoje: inteiro,
});

export const resumoEstoque = z.object({
  baixo: inteiro,
  zerado: inteiro,
  vencendo: inteiro,
  vencidos: inteiro,
});

export const alertaOperacional = z.object({
  id: z.string(),
  titulo: z.string(),
  local: z.string(),
  responsavel: z.string().optional(),
  prioridade: z.enum(['alta', 'media', 'baixa']),
  desde: instante,
  referencia: z.object({ tipo: z.enum(['atendimento', 'leito', 'setor']), id: z.string() }),
});

export const indicadoresOperacionais = z.object({
  leitos: indicadoresLeitos,
  emergencia: indicadoresEmergencia,
  estoque: resumoEstoque,
  alertas: z.array(alertaOperacional),
});

export const pontoInternacao = z.object({ rotulo: z.string(), valor: z.number() });
export const consultaSerie = z.object({ periodo: z.enum(['semana', 'mes', 'ano']) });

// ───────────────────────── respostas de lista ─────────────────────────

export const listaInternacoes = respostaLista(internacaoDetalhada);
export const listaHistoricoEmergencia = respostaLista(atendimentoDetalhado);
export const listaEstoque = respostaLista(estoqueMedicamento);
export const listaMovimentacoes = respostaLista(movimentacaoDetalhada);
export const listaMedicos = z.array(medico);
