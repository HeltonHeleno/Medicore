/**
 * 21.4.1 — Cenário de carga da D15: 600 pacientes + 2.000 consultas + os módulos operacionais
 * no teto de cada coleção (TETO_COLECAO). Metas: armazenamento abaixo de 80% do limite e
 * fila, mapa e estoque respondendo em menos de 100 ms.
 *
 * Os itens extras são cópias dos dados de exemplo (mesma distribuição de tamanhos), com ids
 * novos.
 */
import { ALERTA_ARMAZENAMENTO, LIMITE_ARMAZENAMENTO_BYTES, TETO_COLECAO } from '../config/limites';
import { criarAleatorio, gerarCpfValido, unicos } from '../data/seeds/gerador';
import { repoConsultas, repoMedicos, repoPacientes } from '../services/colecoes';
import {
  repoAtendimentos,
  repoDispensacoes,
  repoInternacoes,
  repoLotes,
  repoMedicamentos,
  repoMovimentacoes,
  repoResumos,
  repoSolicitacoes,
} from '../services/colecoes-operacoes';
import { listarFila } from '../services/emergencia';
import { listarEstoque, listarMovimentacoes } from '../services/farmacia';
import { obterIndicadoresOperacionais } from '../services/indicadores-operacionais';
import { listarInternacoes, listarLeitos } from '../services/leitos';
import { descarregarMemoria, transacao, usoArmazenamento } from '../services/repositorio';
import type { Consulta, ResumoMensal } from '../types';
import { prepararOperacoes } from './utils/operacoes';

prepararOperacoes('2026-11-09T08:00:00-03:00');

const PACIENTES = 600;
const CONSULTAS = 2000;
const META_MS = 100;

/** Completa a lista até `total` com cópias dos itens existentes (ids novos via `ajustar`). */
function completar<T extends { id: string }>(
  itens: readonly T[],
  total: number,
  ajustar: (copia: T, i: number) => T,
): T[] {
  const extras = Array.from({ length: Math.max(0, total - itens.length) }, (_, i) =>
    ajustar(structuredClone(itens[i % itens.length]), i),
  );
  return [...itens, ...extras];
}

function gerarCarga() {
  const rand = criarAleatorio(21);
  const cpf = unicos(() => gerarCpfValido(rand));
  const pacientes = completar(repoPacientes.todos(), PACIENTES, (p, i) => ({
    ...p,
    id: `pac-carga-${i}`,
    cpf: cpf(),
  }));
  const ids = pacientes.map((p) => p.id);
  const pacienteDe = (i: number) => ids[i % ids.length];

  const medicos = repoMedicos.todos().filter((m) => m.ativo);
  const modelo = repoConsultas.todos()[0];
  const momento = new Date().toISOString();
  const consultas: Consulta[] = Array.from({ length: CONSULTAS }, (_, i) => {
    const medico = medicos[i % medicos.length];
    const indice = Math.floor(i / medicos.length);
    const dia = Math.floor(indice / 16);
    const inicio = new Date(
      Date.UTC(2026, 9, 1 + dia, 11 + Math.floor((indice % 16) / 2), (indice % 2) * 30),
    );
    return {
      ...modelo,
      id: `con-carga-${i}`,
      pacienteId: pacienteDe(i),
      medicoId: medico.id,
      departamentoId: medico.departamentoId,
      inicio: inicio.toISOString(),
      duracaoMin: 30,
      status: inicio.getTime() < Date.now() ? 'concluida' : 'agendada',
      eventos: [{ tipo: 'agendada', em: momento }],
      versao: 1,
    };
  });

  // Módulos: só cópias de itens fechados, para a fila e o mapa continuarem coerentes.
  const encerradas = repoInternacoes.todos().filter((x) => x.status === 'encerrada');
  const internacoes = completar(repoInternacoes.todos(), TETO_COLECAO.internacoes, (_, i) => ({
    ...encerradas[i % encerradas.length],
    id: `int-carga-${i}`,
    pacienteId: pacienteDe(i),
  }));
  const fechados = repoAtendimentos.todos().filter((x) => x.status === 'encerrado');
  const atendimentos = completar(repoAtendimentos.todos(), TETO_COLECAO.atendimentos, (_, i) => ({
    ...structuredClone(fechados[i % fechados.length]),
    id: `ate-carga-${i}`,
    numero: `E-${String(9000 + (i % 999)).padStart(4, '0')}`,
    pacienteId: pacienteDe(i),
  }));
  const solicitacoes = completar(
    repoSolicitacoes.todos(),
    TETO_COLECAO.solicitacoes_leito,
    (x, i) => ({
      ...x,
      id: `sol-carga-${i}`,
      status: 'cancelada' as const,
      leitoReservadoId: undefined,
      pacienteId: pacienteDe(i),
    }),
  );
  const medicamentos = completar(repoMedicamentos.todos(), TETO_COLECAO.medicamentos, (x, i) => ({
    ...x,
    id: `med-carga-${i}`,
    nome: `${x.nome} genérico ${i}`,
    controlado: undefined,
  }));
  const novosMedicamentos = medicamentos.slice(repoMedicamentos.todos().length);
  const lotes = completar(repoLotes.todos(), TETO_COLECAO.lotes, (x, i) => ({
    ...x,
    id: `lot-carga-${i}`,
    numero: `LC${i}`,
    medicamentoId: novosMedicamentos[i % novosMedicamentos.length].id,
  }));
  const movimentacoes = completar(
    repoMovimentacoes.todos(),
    TETO_COLECAO.movimentacoes,
    (x, i) => ({ ...x, id: `mov-carga-${i}` }),
  );
  const dispensacoes = completar(repoDispensacoes.todos(), TETO_COLECAO.dispensacoes, (x, i) => ({
    ...x,
    id: `dis-carga-${i}`,
    pacienteId: pacienteDe(i),
  }));
  const resumos = completar<ResumoMensal>(
    repoResumos.todos(),
    TETO_COLECAO.resumos_mensais,
    (x, i) => ({ ...x, id: `2023-${String((i % 12) + 1).padStart(2, '0')}` }),
  );

  return {
    pacientes,
    consultas,
    internacoes,
    atendimentos,
    solicitacoes,
    medicamentos,
    lotes,
    movimentacoes,
    dispensacoes,
    resumos,
  };
}

async function medir<T>(fn: () => Promise<T>): Promise<{ ms: number; resultado: T }> {
  const inicio = performance.now();
  const resultado = await fn();
  return { ms: performance.now() - inicio, resultado };
}

describe('carga da D15: 600 pacientes + 2.000 consultas + módulos no teto (21.4.1)', () => {
  it('cabe no armazenamento (< 80%) e fila, mapa e estoque respondem em menos de 100 ms', async () => {
    const c = gerarCarga();
    transacao(() => {
      repoPacientes.substituirTodos(c.pacientes);
      repoConsultas.substituirTodos(c.consultas);
      repoInternacoes.substituirTodos(c.internacoes);
      repoAtendimentos.substituirTodos(c.atendimentos);
      repoSolicitacoes.substituirTodos(c.solicitacoes);
      repoMedicamentos.substituirTodos(c.medicamentos);
      repoLotes.substituirTodos(c.lotes);
      repoMovimentacoes.substituirTodos(c.movimentacoes);
      repoDispensacoes.substituirTodos(c.dispensacoes);
      repoResumos.substituirTodos(c.resumos);
    });

    const porColecao = Object.fromEntries(
      Object.keys(localStorage)
        .filter((k) => k.startsWith('medicore:'))
        .map((k) => [k, Math.round(((k.length + localStorage.getItem(k)!.length) * 2) / 1024)]),
    );
    const uso = usoArmazenamento();
    const fracao = uso / LIMITE_ARMAZENAMENTO_BYTES;
    expect(fracao, JSON.stringify(porColecao)).toBeLessThan(ALERTA_ARMAZENAMENTO);

    // "Recarregar a página": a primeira leitura de cada tela lê do armazenamento.
    descarregarMemoria();
    const primeira = {
      fila: (await medir(() => listarFila())).ms,
      mapa: (await medir(() => listarLeitos())).ms,
      estoque: (await medir(() => listarEstoque({}))).ms,
    };
    expect(Math.max(...Object.values(primeira))).toBeLessThan(500);

    const tempos: Record<string, number> = {};
    const fila = await medir(() => listarFila());
    tempos.fila = fila.ms;
    const mapa = await medir(() => listarLeitos());
    expect(mapa.resultado).toHaveLength(130);
    tempos.mapa = mapa.ms;
    const estoque = await medir(() => listarEstoque({ porPagina: 25 }));
    expect(estoque.resultado.total).toBe(TETO_COLECAO.medicamentos);
    tempos.estoque = estoque.ms;
    tempos['estoque (busca)'] = (await medir(() => listarEstoque({ busca: 'dipirona' }))).ms;
    tempos['internações ativas'] = (await medir(() => listarInternacoes({}))).ms;
    tempos.movimentacoes = (await medir(() => listarMovimentacoes({ pagina: 1 }))).ms;
    tempos['indicadores do Painel'] = (await medir(() => obterIndicadoresOperacionais())).ms;

    // Números para o Diário: aparecem na mensagem se alguma meta falhar.
    const relatorio = JSON.stringify({ uso: uso / 1024 / 1024, porColecao, primeira, tempos });
    for (const [rotulo, ms] of Object.entries(tempos))
      expect(ms, `${rotulo} ${relatorio}`).toBeLessThan(META_MS);
  }, 60_000);
});
