/**
 * Serviço da Farmácia (processos F1–F9).
 * O estoque é por lote (D11); a saída segue o FEFO (A9), refeito no momento de gravar.
 * Movimentações são imutáveis (R-F9): correção é sempre um movimento contrário.
 */
import { to } from '../i18n/pt-BR/operacoes';
import {
  JANELAS_CORRECAO_H,
  LIMITE_CONFIRMACAO_QUANTIDADE,
  POR_PAGINA,
  VALIDADE_CURTA_DIAS,
  VENCENDO_DIAS,
} from '../config/limites';
import { t } from '../i18n/pt-BR';
import { tf } from '../i18n/pt-BR/farmacia';
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
  AlertaConfirmado,
  AlocacaoLote,
  Dispensacao,
  EstoqueMedicamento,
  FiltrosEstoque,
  FiltrosMovimentacoes,
  LivroControlados,
  Lote,
  LoteDetalhado,
  Medicamento,
  Movimentacao,
  Paginado,
  TipoMovimentacao,
} from '../types';
import { correspondenciaAlergia, type CorrespondenciaAlergia } from '../utils/alergia';
import { autorAtual } from '../utils/autor';
import { filtrarPorTermo, normalizar, paginar } from '../utils/busca';
import { dataDoInstante, hojeNoFuso, somarDias } from '../utils/datas';
import { disponivelDe, devolucaoPorLote, planejarFefo, type PlanoFefo } from '../utils/fefo';
import { gerarId } from '../utils/id';
import { diasParaVencer, dentroDaJanela, estaVencido, limiteDaJanela } from '../utils/tempos';
import { registrarAtividade } from './atividades';
import { repoPacientes } from './colecoes';
import {
  repoDispensacoes,
  repoLeitos,
  repoLotes,
  repoMedicamentos,
  repoMovimentacoes,
} from './colecoes-operacoes';
import { executar } from './infra';
import {
  conferirJanela,
  conferirVersao,
  conflito,
  erroCampo,
  medicoAtivo,
  momentoAtual,
  nomeMedico,
  nomePaciente,
  obterOu,
  situacaoDoPaciente,
  transicaoInvalida,
  validarCom,
} from './operacoes-comum';
import { transacao } from './repositorio';

const ta = t.textosAtividade;
const esquemas = () => import('../schemas/farmacia');

/** "60 comprimidos" */
export const quantidadeComUnidade = (m: Pick<Medicamento, 'unidade'>, n: number) =>
  `${n.toLocaleString('pt-BR')} ${tf.unidades[m.unidade](n)}`;
/** "Dipirona sódica 500 mg" */
export const nomeMedicamento = (m: Pick<Medicamento, 'nome' | 'concentracao'>) =>
  `${m.nome} ${m.concentracao}`;

const lotesDe = (medicamentoId: string) =>
  repoLotes.todos().filter((l) => l.medicamentoId === medicamentoId);

function estoqueDe(m: Medicamento, hoje = hojeNoFuso()): EstoqueMedicamento {
  const lotes = lotesDe(m.id);
  const disponivel = disponivelDe(lotes, hoje);
  const comSaldo = lotes.filter((l) => l.quantidadeAtual > 0);
  const validos = comSaldo.filter((l) => !estaVencido(l.validade, hoje) && !l.bloqueio);
  const proximo = validos.map((l) => l.validade).sort()[0];
  return {
    medicamento: m,
    disponivel,
    vencido: comSaldo
      .filter((l) => estaVencido(l.validade, hoje))
      .reduce((s, l) => s + l.quantidadeAtual, 0),
    bloqueado: comSaldo
      .filter((l) => l.bloqueio && !estaVencido(l.validade, hoje))
      .reduce((s, l) => s + l.quantidadeAtual, 0),
    situacao: disponivel === 0 ? 'zerado' : disponivel <= m.estoqueMinimo ? 'baixo' : 'ok',
    vencendo: validos.some((l) => diasParaVencer(l.validade, hoje) <= VENCENDO_DIAS),
    ...(proximo ? { proximoVencimento: proximo } : {}),
  };
}

const detalharLote = (l: Lote, hoje = hojeNoFuso()): LoteDetalhado => {
  const dias = diasParaVencer(l.validade, hoje);
  return {
    ...l,
    vencido: dias < 0,
    vencendo: dias >= 0 && dias <= VENCENDO_DIAS,
    diasParaVencer: dias,
  };
};

// ───────────────────────── leitura ─────────────────────────

export const listarEstoque = (
  filtros: FiltrosEstoque = {},
): Promise<Paginado<EstoqueMedicamento>> =>
  executar(() => {
    const hoje = hojeNoFuso();
    const status = filtros.status ?? 'ativos';
    let lista = repoMedicamentos
      .todos()
      .filter((m) => status === 'todos' || m.ativo === (status === 'ativos'))
      .filter(
        (m) =>
          (!filtros.forma || m.forma === filtros.forma) &&
          (!filtros.soControlados || !!m.controlado),
      )
      .map((m) => estoqueDe(m, hoje))
      .filter((e) => {
        switch (filtros.situacao) {
          case undefined:
            return true;
          case 'vencendo':
            return e.vencendo;
          case 'vencidos':
            return e.vencido > 0;
          default:
            return e.situacao === filtros.situacao;
        }
      });
    const porNome = (a: EstoqueMedicamento, b: EstoqueMedicamento) =>
      a.medicamento.nome.localeCompare(b.medicamento.nome, 'pt-BR') ||
      a.medicamento.concentracao.localeCompare(b.medicamento.concentracao, 'pt-BR') ||
      a.medicamento.id.localeCompare(b.medicamento.id);
    const criterio: Record<string, (a: EstoqueMedicamento, b: EstoqueMedicamento) => number> = {
      nome: porNome,
      disponivel: (a, b) => a.disponivel - b.disponivel,
      // Sem vencimento (sem saldo válido) vai para o fim.
      vencimento: (a, b) =>
        (a.proximoVencimento ?? '9999').localeCompare(b.proximoVencimento ?? '9999'),
    };
    const ordenar = criterio[filtros.ordenarPor ?? 'nome'] ?? porNome;
    const sentido = filtros.ordem === 'desc' ? -1 : 1;
    lista = filtrarPorTermo(lista, filtros.busca, {
      textos: (e) => [
        e.medicamento.nome,
        e.medicamento.principioAtivo,
        e.medicamento.nomeComercial,
      ],
    }).sort((a, b) => sentido * ordenar(a, b) || porNome(a, b));
    return paginar(lista, filtros.pagina, filtros.porPagina ?? POR_PAGINA);
  });

export interface DetalheMedicamento {
  estoque: EstoqueMedicamento;
  lotes: LoteDetalhado[];
  /** Unidade e unidades por embalagem não mudam depois da primeira movimentação (F1). */
  temMovimentacao: boolean;
}

export const obterMedicamento = (id: string): Promise<DetalheMedicamento> =>
  executar(() => {
    const m = obterOu(repoMedicamentos.obter(id), t.erros.medicamentoNaoEncontrado);
    const hoje = hojeNoFuso();
    return {
      estoque: estoqueDe(m, hoje),
      lotes: lotesDe(id)
        .map((l) => detalharLote(l, hoje))
        .sort((a, b) => a.validade.localeCompare(b.validade) || a.numero.localeCompare(b.numero)),
      temMovimentacao: temMovimentacao(id),
    };
  });

const temMovimentacao = (medicamentoId: string) =>
  repoMovimentacoes.todos().some((x) => x.medicamentoId === medicamentoId) ||
  lotesDe(medicamentoId).length > 0;

export const listarLotesVencimento = (): Promise<
  (LoteDetalhado & { medicamento: Medicamento })[]
> =>
  executar(() => {
    const hoje = hojeNoFuso();
    return repoLotes
      .todos()
      .filter((l) => l.quantidadeAtual > 0)
      .map((l) => ({
        ...detalharLote(l, hoje),
        medicamento: repoMedicamentos.obter(l.medicamentoId)!,
      }))
      .filter((l) => l.medicamento && (l.vencido || l.vencendo))
      .sort((a, b) => a.validade.localeCompare(b.validade));
  });

export interface MovimentacaoDetalhada extends Movimentacao {
  medicamentoNome: string;
  loteNumero: string;
  pacienteNome?: string;
  pacienteId?: string;
}

export const listarMovimentacoes = (
  filtros: FiltrosMovimentacoes = {},
): Promise<Paginado<MovimentacaoDetalhada>> =>
  executar(() => {
    const dispensacoes = new Map(repoDispensacoes.todos().map((d) => [d.id, d]));
    const lista = repoMovimentacoes
      .todos()
      .filter((x) => {
        const dia = dataDoInstante(x.em);
        const d = x.dispensacaoId ? dispensacoes.get(x.dispensacaoId) : undefined;
        return (
          (!filtros.tipo || x.tipo === filtros.tipo) &&
          (!filtros.medicamentoId || x.medicamentoId === filtros.medicamentoId) &&
          (!filtros.de || dia >= filtros.de) &&
          (!filtros.ate || dia <= filtros.ate) &&
          (!filtros.pacienteId || d?.pacienteId === filtros.pacienteId)
        );
      })
      .sort((a, b) => b.em.localeCompare(a.em) || b.id.localeCompare(a.id))
      .map((x) => {
        const m = repoMedicamentos.obter(x.medicamentoId);
        const d = x.dispensacaoId ? dispensacoes.get(x.dispensacaoId) : undefined;
        return {
          ...x,
          medicamentoNome: m ? nomeMedicamento(m) : '—',
          loteNumero: repoLotes.obter(x.loteId)?.numero ?? '—',
          ...(d ? { pacienteId: d.pacienteId, pacienteNome: nomePaciente(d.pacienteId) } : {}),
        };
      });
    return paginar(lista, filtros.pagina, filtros.porPagina ?? POR_PAGINA);
  });

export interface DispensacaoDetalhada extends Dispensacao {
  pacienteNome: string;
  medicoNome: string;
  itensDetalhados: {
    medicamento: Medicamento;
    quantidade: number;
    devolvido: number;
    lotes: { lote: Lote; quantidade: number }[];
  }[];
  /** F8: até quando pode ser estornada (ISO), se ainda puder. */
  estornarAte?: string;
}

export const obterDispensacao = (id: string): Promise<DispensacaoDetalhada> =>
  executar(() => {
    const d = obterOu(repoDispensacoes.obter(id), t.erros.dispensacaoNaoEncontrada);
    const pode =
      d.status === 'realizada' &&
      !d.arquivado &&
      d.itens.every((i) => i.devolvido === 0) &&
      dentroDaJanela(d.em, JANELAS_CORRECAO_H.dispensacao);
    return {
      ...d,
      pacienteNome: nomePaciente(d.pacienteId),
      medicoNome: nomeMedico(d.medicoSolicitanteId),
      itensDetalhados: d.itens.map((i) => ({
        medicamento: repoMedicamentos.obter(i.medicamentoId)!,
        quantidade: i.quantidade,
        devolvido: i.devolvido,
        lotes: i.lotes.map((a) => ({ lote: repoLotes.obter(a.loteId)!, quantidade: a.quantidade })),
      })),
      ...(pode ? { estornarAte: limiteDaJanela(d.em, JANELAS_CORRECAO_H.dispensacao) } : {}),
    };
  });

/** Dispensações de um paciente (detalhe da internação, do atendimento e do paciente). */
export const listarDispensacoesDoPaciente = (pacienteId: string): Promise<Dispensacao[]> =>
  executar(() =>
    repoDispensacoes
      .todos()
      .filter((d) => d.pacienteId === pacienteId)
      .sort((a, b) => b.em.localeCompare(a.em)),
  );

/** M28: livro de controlados de um medicamento no período (datas `AAAA-MM-DD`, inclusivas). */
export const livroControlados = (
  medicamentoId: string,
  de: string,
  ate: string,
): Promise<LivroControlados> =>
  executar(() => {
    const m = obterOu(repoMedicamentos.obter(medicamentoId), t.erros.medicamentoNaoEncontrado);
    const lotes = lotesDe(medicamentoId);
    const ids = new Set(lotes.map((l) => l.id));
    const movs = repoMovimentacoes.todos().filter((x) => ids.has(x.loteId));
    const saldoAtual = lotes.reduce((s, l) => s + l.quantidadeAtual, 0);
    // Saldo no fim do período = atual − movimentações depois do período.
    const depois = movs
      .filter((x) => dataDoInstante(x.em) > ate)
      .reduce((s, x) => s + sinal(x.tipo) * x.quantidade, 0);
    const doPeriodo = movs
      .filter((x) => {
        const dia = dataDoInstante(x.em);
        return dia >= de && dia <= ate;
      })
      .sort((a, b) => a.em.localeCompare(b.em));
    const entradas = doPeriodo
      .filter((x) => sinal(x.tipo) > 0)
      .reduce((s, x) => s + x.quantidade, 0);
    const saidas = doPeriodo.filter((x) => sinal(x.tipo) < 0).reduce((s, x) => s + x.quantidade, 0);
    const saldoFinal = saldoAtual - depois;
    return {
      medicamento: m,
      de,
      ate,
      saldoInicial: saldoFinal - entradas + saidas,
      entradas,
      saidas,
      saldoFinal,
      movimentacoes: doPeriodo,
    };
  });

const POSITIVOS: readonly TipoMovimentacao[] = ['entrada', 'devolucao', 'ajuste_positivo'];
const sinal = (tipo: TipoMovimentacao) => (POSITIVOS.includes(tipo) ? 1 : -1);

export const previaFefo = (
  medicamentoId: string,
  quantidade: number,
): Promise<PlanoFefo & { lotes: Lote[] }> =>
  executar(() => {
    const lotes = lotesDe(medicamentoId);
    const plano = planejarFefo(lotes, quantidade, hojeNoFuso());
    return { ...plano, lotes: plano.alocacoes.map((a) => repoLotes.obter(a.loteId)!) };
  });

/** A10 */
export const verificarAlergia = (
  pacienteId: string,
  medicamentoId: string,
): Promise<CorrespondenciaAlergia | null> =>
  executar(() => {
    const p = obterOu(repoPacientes.obter(pacienteId), t.erros.pacienteNaoEncontrado);
    const m = obterOu(repoMedicamentos.obter(medicamentoId), t.erros.medicamentoNaoEncontrado);
    return correspondenciaAlergia(p.alergias, m);
  });

// ───────────────────────── escrita: auxiliares ─────────────────────────

function medicamentoAtivo(id: string, campo: string): Medicamento {
  const m = obterOu(repoMedicamentos.obter(id), t.erros.medicamentoNaoEncontrado);
  if (!m.ativo) throw conflito('medicamento_inativo', tf.regras.medicamentoInativo, campo);
  return m;
}

/** Grava a movimentação e atualiza o saldo do lote (INV-7). */
function movimentar(
  lote: Lote,
  tipo: TipoMovimentacao,
  quantidade: number,
  extra: Partial<Pick<Movimentacao, 'dispensacaoId' | 'motivo' | 'termo'>> = {},
): Lote {
  const saldo = lote.quantidadeAtual + sinal(tipo) * quantidade;
  if (saldo < 0)
    throw conflito('estoque_insuficiente', tf.regras.saldoNegativo, 'quantidade', {
      disponivel: lote.quantidadeAtual,
    });
  const atualizado = repoLotes.atualizar(lote.id, { quantidadeAtual: saldo });
  repoMovimentacoes.inserir({
    id: gerarId(),
    tipo,
    medicamentoId: lote.medicamentoId,
    loteId: lote.id,
    quantidade,
    saldoLoteApos: saldo,
    autor: autorAtual(),
    em: momentoAtual(),
    ...extra,
  });
  return atualizado;
}

/** Atividade `estoque_baixo` só quando o disponível cruza o mínimo (R-F6). */
function avisarSeCruzouMinimo(m: Medicamento, antes: number) {
  const depois = disponivelDe(lotesDe(m.id), hojeNoFuso());
  if (antes > m.estoqueMinimo && depois <= m.estoqueMinimo) {
    registrarAtividade('estoque_baixo', ta.estoqueBaixo(nomeMedicamento(m)), m.id);
  }
}

const chaveUnica = (d: { nome: string; concentracao: string; forma: string }) =>
  `${normalizar(d.nome)}|${normalizar(d.concentracao)}|${d.forma}`;

// ───────────────────────── escrita: catálogo (F1, F7) ─────────────────────────

export const criarMedicamento = async (entrada: EntradaMedicamento): Promise<Medicamento> => {
  const { esquemaMedicamento } = await esquemas();
  const dados = validarCom(esquemaMedicamento, entrada);
  return executar(() =>
    transacao(() => {
      const existente = repoMedicamentos.todos().find((m) => chaveUnica(m) === chaveUnica(dados));
      if (existente) {
        throw conflito('medicamento_duplicado', tf.regras.medicamentoDuplicado, 'nome', {
          id: existente.id,
        });
      }
      const momento = momentoAtual();
      return repoMedicamentos.inserir({
        id: gerarId(),
        criadoEm: momento,
        atualizadoEm: momento,
        versao: 1,
        nome: dados.nome,
        ...(dados.nomeComercial ? { nomeComercial: dados.nomeComercial } : {}),
        principioAtivo: dados.principioAtivo,
        ...(dados.classe ? { classe: dados.classe } : {}),
        concentracao: dados.concentracao,
        forma: dados.forma,
        unidade: dados.unidade,
        ...(dados.controlado ? { controlado: { lista: dados.controlado } } : {}),
        ...(dados.unidadesPorEmbalagem ? { unidadesPorEmbalagem: dados.unidadesPorEmbalagem } : {}),
        estoqueMinimo: dados.estoqueMinimo,
        ativo: true,
      });
    }),
  );
};

export const editarMedicamento = async (
  id: string,
  entrada: EntradaMedicamento,
  versao: number,
): Promise<Medicamento> => {
  const { esquemaMedicamento } = await esquemas();
  const dados = validarCom(esquemaMedicamento, entrada);
  return executar(() =>
    transacao(() => {
      const m = obterOu(repoMedicamentos.obter(id), t.erros.medicamentoNaoEncontrado);
      conferirVersao(m, versao);
      const existente = repoMedicamentos
        .todos()
        .find((x) => x.id !== id && chaveUnica(x) === chaveUnica(dados));
      if (existente) {
        throw conflito('medicamento_duplicado', tf.regras.medicamentoDuplicado, 'nome', {
          id: existente.id,
        });
      }
      if (temMovimentacao(id)) {
        if (dados.unidade !== m.unidade) throw erroCampo('unidade', tf.regras.unidadeTravada);
        if ((dados.unidadesPorEmbalagem ?? undefined) !== (m.unidadesPorEmbalagem ?? undefined)) {
          throw erroCampo('unidadesPorEmbalagem', tf.regras.unidadeTravada);
        }
      }
      return repoMedicamentos.atualizar(id, {
        nome: dados.nome,
        nomeComercial: dados.nomeComercial,
        principioAtivo: dados.principioAtivo,
        classe: dados.classe,
        concentracao: dados.concentracao,
        forma: dados.forma,
        unidade: dados.unidade,
        controlado: dados.controlado ? { lista: dados.controlado } : undefined,
        unidadesPorEmbalagem: dados.unidadesPorEmbalagem,
        estoqueMinimo: dados.estoqueMinimo,
      });
    }),
  );
};

/** F7 / R-F11: só com todo o saldo zerado (inclusive lotes vencidos e bloqueados). */
export const inativarMedicamento = (
  id: string,
  versao: number,
  motivo?: string,
): Promise<Medicamento> =>
  executar(() =>
    transacao(() => {
      const m = obterOu(repoMedicamentos.obter(id), t.erros.medicamentoNaoEncontrado);
      conferirVersao(m, versao);
      const comSaldo = lotesDe(id).filter((l) => l.quantidadeAtual > 0);
      if (comSaldo.length > 0) {
        throw conflito(
          'pendencias_modulos',
          tf.regras.inativarComSaldo(comSaldo.length),
          undefined,
          {
            itens: comSaldo.map((l) => ({ tipo: 'lote', id: l.id, descricao: l.numero })),
          },
        );
      }
      return repoMedicamentos.atualizar(id, {
        ativo: false,
        inativadoEm: momentoAtual(),
        motivoInativacao: motivo?.trim() || undefined,
      });
    }),
  );

export const reativarMedicamento = (id: string, versao: number): Promise<Medicamento> =>
  executar(() =>
    transacao(() => {
      const m = obterOu(repoMedicamentos.obter(id), t.erros.medicamentoNaoEncontrado);
      conferirVersao(m, versao);
      return repoMedicamentos.atualizar(id, {
        ativo: true,
        inativadoEm: undefined,
        motivoInativacao: undefined,
      });
    }),
  );

// ───────────────────────── escrita: estoque (F2, F5, F6, F9) ─────────────────────────

/** F2 / R-F2 */
export const registrarEntrada = async (entrada: EntradaLote): Promise<Lote> => {
  const { esquemaEntrada } = await esquemas();
  const dados = validarCom(esquemaEntrada, entrada);
  return executar(() =>
    transacao(() => {
      const m = medicamentoAtivo(dados.medicamentoId, 'medicamentoId');
      let quantidade = dados.quantidade;
      if (dados.modo === 'embalagens') {
        if (!m.unidadesPorEmbalagem) throw erroCampo('modo', tf.regras.semUnidadesPorEmbalagem);
        quantidade = dados.quantidade * m.unidadesPorEmbalagem;
      }
      const hoje = hojeNoFuso();
      if (dados.validade < somarDias(hoje, VALIDADE_CURTA_DIAS) && !dados.confirmarValidadeCurta) {
        throw erroCampo('validade', tf.regras.validadeCurta(VALIDADE_CURTA_DIAS));
      }
      const numero = dados.numero.toUpperCase();
      const existente = lotesDe(m.id).find((l) => l.numero.toUpperCase() === numero);
      let lote: Lote;
      if (existente) {
        if (existente.validade !== dados.validade) {
          throw erroCampo('numero', to.loteOutraValidade(existente.numero));
        }
        if (!dados.somarAoExistente)
          throw erroCampo('numero', tf.regras.loteExistente(existente.numero));
        lote = repoLotes.atualizar(existente.id, {
          quantidadeInicial: existente.quantidadeInicial + quantidade,
        });
      } else {
        const momento = momentoAtual();
        lote = repoLotes.inserir({
          id: gerarId(),
          criadoEm: momento,
          atualizadoEm: momento,
          versao: 1,
          medicamentoId: m.id,
          numero,
          validade: dados.validade,
          ...(dados.fabricante ? { fabricante: dados.fabricante } : {}),
          ...(dados.notaFiscal ? { notaFiscal: dados.notaFiscal } : {}),
          quantidadeInicial: quantidade,
          quantidadeAtual: 0,
          entradaEm: momento,
          saldoArquivado: 0,
        });
      }
      lote = movimentar(lote, 'entrada', quantidade);
      registrarAtividade(
        'lote_recebido',
        ta.loteRecebido(quantidade, tf.unidades[m.unidade](quantidade), nomeMedicamento(m)),
        lote.id,
      );
      return lote;
    }),
  );
};

/** F5: ajuste de inventário e perda/avaria (R-F7: motivo maior para controlado). */
export const ajustar = async (
  loteId: string,
  entrada: EntradaAjuste,
  versao: number,
): Promise<Lote> => {
  const { esquemaAjuste } = await esquemas();
  const dados = validarCom(esquemaAjuste, entrada);
  return executar(() =>
    transacao(() => {
      const lote = obterOu(repoLotes.obter(loteId), t.erros.loteNaoEncontrado);
      conferirVersao(lote, versao);
      const m = obterOu(
        repoMedicamentos.obter(lote.medicamentoId),
        t.erros.medicamentoNaoEncontrado,
      );
      if (m.controlado && dados.motivo.length < 10)
        throw erroCampo('motivo', tf.regras.motivoControladoCurto);
      const antes = disponivelDe(lotesDe(m.id), hojeNoFuso());
      const r = movimentar(lote, dados.tipo, dados.quantidade, { motivo: dados.motivo });
      avisarSeCruzouMinimo(m, antes);
      return r;
    }),
  );
};

/** F6: descarte dos lotes vencidos (termo obrigatório para controlados). */
export const descartarVencidos = async (
  entrada: EntradaDescarte,
): Promise<{ lotes: number; unidades: number }> => {
  const { esquemaDescarte } = await esquemas();
  const dados = validarCom(esquemaDescarte, entrada);
  return executar(() =>
    transacao(() => {
      const hoje = hojeNoFuso();
      let unidades = 0;
      for (const id of dados.loteIds) {
        const lote = obterOu(repoLotes.obter(id), t.erros.loteNaoEncontrado);
        if (!estaVencido(lote.validade, hoje) || lote.quantidadeAtual <= 0) {
          throw erroCampo('loteIds', tf.regras.loteNaoVencido);
        }
        const m = repoMedicamentos.obter(lote.medicamentoId);
        if (m?.controlado && !dados.termo) throw erroCampo('termo', tf.regras.termoObrigatorio);
        unidades += lote.quantidadeAtual;
        movimentar(lote, 'descarte_vencido', lote.quantidadeAtual, {
          motivo: dados.motivo,
          ...(dados.termo ? { termo: dados.termo } : {}),
        });
      }
      return { lotes: dados.loteIds.length, unidades };
    }),
  );
};

/** F9 / R-F13: o lote bloqueado sai do FEFO e do disponível. */
export const bloquearLote = async (
  id: string,
  entrada: EntradaBloqueioLote,
  versao: number,
): Promise<Lote> => {
  const { esquemaBloqueioLote } = await esquemas();
  const dados = validarCom(esquemaBloqueioLote, entrada);
  return executar(() =>
    transacao(() => {
      const lote = obterOu(repoLotes.obter(id), t.erros.loteNaoEncontrado);
      if (lote.bloqueio) throw transicaoInvalida(tf.regras.loteBloqueado);
      conferirVersao(lote, versao);
      const m = obterOu(
        repoMedicamentos.obter(lote.medicamentoId),
        t.erros.medicamentoNaoEncontrado,
      );
      const antes = disponivelDe(lotesDe(m.id), hojeNoFuso());
      const r = repoLotes.atualizar(id, {
        bloqueio: {
          motivo: dados.motivo,
          ...(dados.referencia ? { referencia: dados.referencia } : {}),
          em: momentoAtual(),
          autor: autorAtual(),
        },
      });
      registrarAtividade(
        'lote_bloqueado',
        ta.loteBloqueado(lote.numero, nomeMedicamento(m), dados.motivo),
        id,
      );
      avisarSeCruzouMinimo(m, antes);
      return r;
    }),
  );
};

export const desbloquearLote = (id: string, versao: number): Promise<Lote> =>
  executar(() =>
    transacao(() => {
      const lote = obterOu(repoLotes.obter(id), t.erros.loteNaoEncontrado);
      if (!lote.bloqueio) throw transicaoInvalida(tf.regras.loteNaoBloqueado);
      conferirVersao(lote, versao);
      return repoLotes.atualizar(id, { bloqueio: undefined });
    }),
  );

// ───────────────────────── escrita: dispensação (F3, F4, F8) ─────────────────────────

/** Destino da dispensação (R-F12): internação ativa ou atendimento aberto. */
export function destinoDoPaciente(pacienteId: string): Dispensacao['destino'] | null {
  const s = situacaoDoPaciente(pacienteId);
  if (s.internacao) return { tipo: 'internacao', id: s.internacao.id };
  if (s.atendimento) return { tipo: 'emergencia', id: s.atendimento.id };
  return null;
}

export const destinoDaDispensacao = (pacienteId: string) =>
  executar(() => destinoDoPaciente(pacienteId));

export interface DestinoDetalhado {
  tipo: 'internacao' | 'emergencia';
  id: string;
  /** Código do leito (internação) ou número do atendimento. */
  referencia: string;
  /** Médico sugerido: responsável pela internação ou médico do atendimento (F3 passo 2). */
  medicoId?: string;
}

/** Destino com o que a tela mostra ("Internado em UTI-07") e o médico sugerido. */
export const destinoDetalhado = (pacienteId: string): Promise<DestinoDetalhado | null> =>
  executar(() => {
    const s = situacaoDoPaciente(pacienteId);
    if (s.internacao)
      return {
        tipo: 'internacao',
        id: s.internacao.id,
        referencia: repoLeitos.obter(s.internacao.leitoId)?.codigo ?? '—',
        medicoId: s.internacao.medicoResponsavelId,
      };
    if (s.atendimento)
      return {
        tipo: 'emergencia',
        id: s.atendimento.id,
        referencia: s.atendimento.numero,
        ...(s.atendimento.medicoId ? { medicoId: s.atendimento.medicoId } : {}),
      };
    return null;
  });

export interface DispensacaoResumida {
  id: string;
  em: string;
  status: Dispensacao['status'];
  arquivado?: boolean;
  /** "Dipirona sódica 500 mg (6 comprimidos)" por item. */
  itens: string[];
}

/** Dispensações de uma internação ou de um atendimento (19.10.2), mais recentes primeiro. */
export const listarDispensacoesDoDestino = (destinoId: string): Promise<DispensacaoResumida[]> =>
  executar(() =>
    repoDispensacoes
      .todos()
      .filter((d) => d.destino.id === destinoId)
      .sort((a, b) => b.em.localeCompare(a.em))
      .map((d) => ({
        id: d.id,
        em: d.em,
        status: d.status,
        ...(d.arquivado ? { arquivado: true } : {}),
        itens: d.itens.map((i) => {
          const m = repoMedicamentos.obter(i.medicamentoId);
          return m
            ? `${nomeMedicamento(m)} (${quantidadeComUnidade(m, i.quantidade)})`
            : String(i.quantidade);
        }),
      })),
  );

/** F3 / R-F3–R-F8, R-F12–R-F14 */
export const dispensar = async (entrada: EntradaDispensacao): Promise<Dispensacao> => {
  const { esquemaDispensacao } = await esquemas();
  const dados = validarCom(esquemaDispensacao, entrada);
  return executar(() =>
    transacao(() => {
      const paciente = obterOu(
        repoPacientes.obter(dados.pacienteId),
        t.erros.pacienteNaoEncontrado,
      );
      const destino = destinoDoPaciente(paciente.id);
      if (!destino) throw conflito('destino_inativo', to.destinoInativo, 'pacienteId');
      medicoAtivo(dados.medicoSolicitanteId, 'medicoSolicitanteId');

      const hoje = hojeNoFuso();
      const confirmados = dados.alertasConfirmados ?? [];
      const confirmou = (tipo: AlertaConfirmado['tipo'], medicamentoId: string) =>
        confirmados.find((a) => a.tipo === tipo && a.medicamentoId === medicamentoId);
      const vistos = new Set<string>();
      const planos: {
        m: Medicamento;
        quantidade: number;
        alocacoes: AlocacaoLote[];
        antes: number;
      }[] = [];
      const alertas: AlertaConfirmado[] = [];

      dados.itens.forEach((item, i) => {
        if (vistos.has(item.medicamentoId))
          throw erroCampo(`itens.${i}.medicamentoId`, tf.regras.itemRepetido);
        vistos.add(item.medicamentoId);
        const m = medicamentoAtivo(item.medicamentoId, `itens.${i}.medicamentoId`);
        const lotes = lotesDe(m.id);
        // FEFO refeito agora (A9): lote vencido na virada do dia ou bloqueado não entra.
        const plano = planejarFefo(lotes, item.quantidade, hoje);
        if (plano.falta > 0) {
          throw conflito(
            'estoque_insuficiente',
            to.estoqueInsuficiente(plano.disponivel, tf.unidades[m.unidade](plano.disponivel)),
            `itens.${i}.quantidade`,
            { disponivel: plano.disponivel },
          );
        }
        const alergia = correspondenciaAlergia(paciente.alergias, m);
        if (alergia) {
          const c = confirmou('alergia', m.id);
          if (!c?.justificativa)
            throw erroCampo(`itens.${i}.medicamentoId`, tf.regras.alergiaSemJustificativa);
          alertas.push({
            tipo: 'alergia',
            medicamentoId: m.id,
            termo: alergia.termo,
            justificativa: c.justificativa,
          });
        }
        if (m.controlado) {
          if (!confirmou('controlado', m.id))
            throw erroCampo(`itens.${i}.medicamentoId`, tf.regras.controladoSemConfirmacao);
          alertas.push({ tipo: 'controlado', medicamentoId: m.id });
        }
        if (item.quantidade > LIMITE_CONFIRMACAO_QUANTIDADE) {
          if (!confirmou('quantidade_alta', m.id))
            throw erroCampo(`itens.${i}.quantidade`, tf.regras.quantidadeAltaSemConfirmacao);
          alertas.push({ tipo: 'quantidade_alta', medicamentoId: m.id });
        }
        planos.push({
          m,
          quantidade: item.quantidade,
          alocacoes: plano.alocacoes,
          antes: plano.disponivel,
        });
      });

      const momento = momentoAtual();
      const id = gerarId();
      for (const p of planos) {
        for (const a of p.alocacoes)
          movimentar(repoLotes.obter(a.loteId)!, 'dispensacao', a.quantidade, {
            dispensacaoId: id,
          });
        avisarSeCruzouMinimo(p.m, p.antes);
      }
      return repoDispensacoes.inserir({
        id,
        criadoEm: momento,
        atualizadoEm: momento,
        versao: 1,
        pacienteId: paciente.id,
        destino,
        medicoSolicitanteId: dados.medicoSolicitanteId,
        itens: planos.map((p) => ({
          medicamentoId: p.m.id,
          quantidade: p.quantidade,
          lotes: p.alocacoes,
          devolvido: 0,
        })),
        alertasConfirmados: alertas,
        status: 'realizada',
        em: momento,
        autor: autorAtual(),
      });
    }),
  );
};

/**
 * Devolve ao(s) lote(s) de origem; lote vencido vira descarte e lote bloqueado vira perda
 * logo em seguida (R-F10). Usado na devolução (F4) e no estorno (F8).
 */
function devolverAosLotes(dispensacaoId: string, alocacoes: AlocacaoLote[], motivo: string) {
  const hoje = hojeNoFuso();
  for (const a of alocacoes) {
    let lote = obterOu(repoLotes.obter(a.loteId), t.erros.loteNaoEncontrado);
    lote = movimentar(lote, 'devolucao', a.quantidade, { dispensacaoId, motivo });
    if (estaVencido(lote.validade, hoje)) {
      movimentar(lote, 'descarte_vencido', a.quantidade, {
        dispensacaoId,
        motivo: tf.avisos.motivoDevolucaoVencido,
      });
    } else if (lote.bloqueio) {
      movimentar(lote, 'perda', a.quantidade, {
        dispensacaoId,
        motivo: tf.avisos.motivoDevolucaoBloqueado,
      });
    }
  }
}

/** F4 */
export const devolver = async (
  dispensacaoId: string,
  itemIndice: number,
  entrada: EntradaDevolucao,
  versao: number,
): Promise<Dispensacao> => {
  const { esquemaDevolucao } = await esquemas();
  const dados = validarCom(esquemaDevolucao, entrada);
  return executar(() =>
    transacao(() => {
      const d = obterOu(repoDispensacoes.obter(dispensacaoId), t.erros.dispensacaoNaoEncontrada);
      if (d.status !== 'realizada') throw transicaoInvalida(tf.regras.estornada);
      conferirVersao(d, versao);
      const item = d.itens[itemIndice];
      if (!item) throw erroCampo('quantidade', tf.regras.devolucaoAcimaDoSaldo(0));
      const saldo = item.quantidade - item.devolvido;
      if (dados.quantidade > saldo) {
        throw conflito(
          'estoque_insuficiente',
          tf.regras.devolucaoAcimaDoSaldo(saldo),
          'quantidade',
          { disponivel: saldo },
        );
      }
      devolverAosLotes(
        d.id,
        devolucaoPorLote(item.lotes, item.devolvido, dados.quantidade),
        dados.motivo,
      );
      return repoDispensacoes.atualizar(d.id, {
        itens: d.itens.map((x, i) =>
          i === itemIndice ? { ...x, devolvido: x.devolvido + dados.quantidade } : x,
        ),
      });
    }),
  );
};

/** F8 / R-F16: até 24 h e sem devolução anterior; devolve tudo e marca como estornada. */
export const estornar = async (
  id: string,
  motivo: string,
  versao: number,
): Promise<Dispensacao> => {
  const { esquemaEstorno } = await esquemas();
  const dados = validarCom(esquemaEstorno, { motivo });
  return executar(() =>
    transacao(() => {
      const d = obterOu(repoDispensacoes.obter(id), t.erros.dispensacaoNaoEncontrada);
      if (d.status !== 'realizada' || d.arquivado) throw transicaoInvalida(tf.regras.estornada);
      conferirVersao(d, versao);
      conferirJanela(d.em, JANELAS_CORRECAO_H.dispensacao);
      if (d.itens.some((i) => i.devolvido > 0))
        throw transicaoInvalida(tf.regras.estornoComDevolucao);
      const texto = tf.avisos.motivoEstorno(dados.motivo);
      for (const item of d.itens)
        devolverAosLotes(d.id, devolucaoPorLote(item.lotes, 0, item.quantidade), texto);
      const r = repoDispensacoes.atualizar(id, {
        status: 'estornada',
        itens: d.itens.map((i) => ({ ...i, devolvido: i.quantidade })),
        estorno: { em: momentoAtual(), motivo: dados.motivo, autor: autorAtual() },
      });
      registrarAtividade(
        'dispensacao_estornada',
        ta.dispensacaoEstornada(nomePaciente(d.pacienteId)),
        id,
      );
      return r;
    }),
  );
};
