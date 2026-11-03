import { repoPacientes } from '../services/colecoes';
import {
  repoAtendimentos,
  repoInternacoes,
  repoLeitos,
  repoLotes,
  repoMedicamentos,
  repoResumos,
  repoSolicitacoes,
} from '../services/colecoes-operacoes';
import { bloquear } from '../services/leitos';
import {
  calcularAlertas,
  calcularIndicadoresEmergencia,
  calcularIndicadoresLeitos,
  calcularResumoEstoque,
  calcularSerieInternacoes,
  listarAlertas,
  obterIndicadoresOperacionais,
  obterSerieInternacoes,
} from '../services/indicadores-operacionais';
import type { Atendimento, Leito } from '../types';
import { leitoLivre, prepararOperacoes } from './utils/operacoes';
import { ajustarRelogio } from './utils/servicos';

prepararOperacoes('2026-11-10T10:30:00-03:00');

const dadosAlertas = () => ({
  leitos: repoLeitos.todos(),
  atendimentos: repoAtendimentos.todos(),
  solicitacoes: repoSolicitacoes.todos(),
  pacientes: new Map(repoPacientes.todos().map((p) => [p.id, p])),
});

describe('A13 — leitos', () => {
  it('dados de exemplo: 72% de ocupação (igual ao Painel), observação fora da conta (D17)', async () => {
    const { leitos } = await obterIndicadoresOperacionais();
    expect(leitos.setores.map((s) => [s.setorId, s.ocupados, s.operacionais])).toEqual([
      ['uti', 22, 30],
      ['enfermaria', 50, 69],
      ['apartamento', 14, 20],
    ]);
    expect(leitos).toMatchObject({
      total: 120,
      ocupados: 86,
      percentual: 72,
      bloqueados: 1,
      reservados: 1,
      higienizacao: 3,
    });
    expect(leitos.disponiveis).toBe(120 - 86 - 1 - 1 - 3);
    expect(leitos.altasPrevistasHoje).toBe(3);
    expect(leitos.liberacoesPrevistas24h).toBeGreaterThanOrEqual(6);
    expect(leitos.permanenciaMedia).toBeGreaterThan(0);
    // UTI: 22 ocupados + 1 reservado, sem pedidos pendentes para a UTI → 23/30.
    expect(leitos.previsaoUti).toBe(77);
  });

  it('leito bloqueado sai dos operacionais', async () => {
    const antes = calcularIndicadoresLeitos(
      { leitos: repoLeitos.todos(), internacoes: [], solicitacoes: [] },
      new Date(),
    );
    const l = leitoLivre('apartamento');
    await bloquear(l.id, { motivo: 'Manutenção' }, l.versao);
    const depois = calcularIndicadoresLeitos(
      { leitos: repoLeitos.todos(), internacoes: [], solicitacoes: [] },
      new Date(),
    );
    const apto = (x: typeof antes) => x.setores.find((s) => s.setorId === 'apartamento')!;
    expect(apto(depois).operacionais).toBe(apto(antes).operacionais - 1);
    expect(apto(depois).percentual).toBe(Math.round((14 / 19) * 100));
  });
});

describe('A13 — emergência', () => {
  it('abertos, alta prioridade, acima do prazo e espera média por cor', () => {
    const e = calcularIndicadoresEmergencia(repoAtendimentos.todos(), new Date());
    expect(e.abertos).toBe(13);
    expect(e.altaPrioridade).toBe(4); // 1 vermelho + 2 laranja aguardando + 1 laranja aguardando leito
    expect(e.porCor.laranja).toEqual({ aguardando: 2, acimaDoPrazo: 2 });
    expect(e.acimaDoPrazo).toBeGreaterThanOrEqual(3); // os dois laranja e o vermelho imediato
    expect(Object.keys(e.esperaMediaPorCor).length).toBeGreaterThan(0);
    expect(e.atendimentosHoje).toBeGreaterThan(5);
  });
});

describe('A12 — alertas', () => {
  it('cada condição dos dados de exemplo, ordenada por prioridade e antiguidade', async () => {
    const alertas = await listarAlertas();
    const titulos = alertas.map((a) => a.titulo);
    expect(titulos).toContain('Emergência — aguardando médico');
    expect(titulos.filter((x) => x.startsWith('Acima do prazo (Laranja'))).toHaveLength(2);
    expect(titulos.some((x) => x.startsWith('Sem triagem há'))).toBe(true);
    expect(titulos).toContain('Observação acima de 24 h: OBS-05');
    expect(titulos.some((x) => x.startsWith('Sinais vitais de atenção'))).toBe(true);
    expect(titulos.some((x) => x.startsWith('Aguardando leito há'))).toBe(true);
    expect(titulos).toContain('Higienização atrasada: ENF-102B');
    expect(titulos.some((x) => x.startsWith('Reserva há') && x.endsWith('UTI-12'))).toBe(true);
    expect(titulos.some((x) => x.startsWith('UTI com'))).toBe(false); // 73% < 90%
    const pesos = alertas.map((a) => ({ alta: 0, media: 1, baixa: 2 })[a.prioridade]);
    expect(pesos).toEqual([...pesos].sort((a, b) => a - b));
    expect(alertas[0].referencia.tipo).toBe('atendimento');
  });

  it('alerta aparece e some no limite (sem triagem: 15 min)', () => {
    const base: Atendimento = {
      id: 'x',
      numero: 'E-0900',
      criadoEm: '',
      atualizadoEm: '',
      versao: 1,
      chegadaEm: '2026-11-10T13:15:00.000Z',
      modoChegada: 'meios_proprios',
      queixa: 'Teste',
      triagens: [],
      reavaliacoes: [],
      status: 'aguardando_triagem',
      eventos: [],
    };
    const d = { ...dadosAlertas(), atendimentos: [base] };
    expect(
      calcularAlertas(d, new Date('2026-11-10T13:30:00.000Z')).some((a) => a.id === 'triagem-x'),
    ).toBe(false);
    expect(
      calcularAlertas(d, new Date('2026-11-10T13:30:01.000Z')).some((a) => a.id === 'triagem-x'),
    ).toBe(false);
    expect(
      calcularAlertas(d, new Date('2026-11-10T13:31:00.000Z')).some((a) => a.id === 'triagem-x'),
    ).toBe(true);
  });

  it('UTI com 90% ou mais gera alerta', () => {
    const uti = repoLeitos.todos().filter((l) => l.setorId === 'uti');
    const cheia: Leito[] = uti.map((l, i) => (i < 27 ? { ...l, status: 'ocupado' } : l));
    const outros = repoLeitos.todos().filter((l) => l.setorId !== 'uti');
    const alertas = calcularAlertas(
      { ...dadosAlertas(), leitos: [...cheia, ...outros], atendimentos: [] },
      new Date(),
    );
    expect(alertas.some((a) => /^UTI com (9\d|100)% de ocupação$/.test(a.titulo))).toBe(true);
  });
});

describe('A14 — série de internações', () => {
  it('semana (Seg…), mês (Sem 1–4) e ano (resumos + mês corrente)', async () => {
    const semana = await obterSerieInternacoes('semana');
    expect(semana).toHaveLength(7);
    expect(semana[6].rotulo).toBe('Ter'); // 10/11/2026 é terça
    const mes = await obterSerieInternacoes('mes');
    expect(mes.map((p) => p.rotulo)).toEqual(['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4']);
    const ano = await obterSerieInternacoes('ano');
    expect(ano).toHaveLength(12);
    expect(ano[11].rotulo).toBe('Nov');
    expect(ano[0].rotulo).toBe('Dez');
    const resumoDez = repoResumos.obter('2025-12')!.internacoes;
    expect(ano[0].valor).toBe(resumoDez);
    expect(ano.every((p) => p.valor >= 0)).toBe(true);
  });

  it('registros arquivados não contam duas vezes', () => {
    const internacoes = repoInternacoes
      .todos()
      .map((i, k) => (k === 0 ? { ...i, arquivado: true } : i));
    const a = calcularSerieInternacoes(repoInternacoes.todos(), [], 'ano', new Date());
    const b = calcularSerieInternacoes(internacoes, [], 'ano', new Date());
    expect(a.reduce((s, p) => s + p.valor, 0) - b.reduce((s, p) => s + p.valor, 0)).toBe(1);
  });
});

describe('estoque (R-F6)', () => {
  it('dados de exemplo: 3 baixo, 1 zerado, 5 vencendo, 2 vencidos', () => {
    expect(
      calcularResumoEstoque(repoMedicamentos.todos(), repoLotes.todos(), '2026-11-10'),
    ).toEqual({
      baixo: 3,
      zerado: 1,
      vencendo: 5,
      vencidos: 2,
    });
  });

  it('na virada do dia, o lote que vence sai do disponível', () => {
    ajustarRelogio('2026-11-10T23:59:00-03:00');
    const vencendoHoje = {
      ...repoLotes.todos()[0],
      id: 'novo',
      validade: '2026-11-10',
      quantidadeAtual: 9999,
      bloqueio: undefined,
    };
    const meds = repoMedicamentos.todos().filter((m) => m.id === vencendoHoje.medicamentoId);
    expect(calcularResumoEstoque(meds, [vencendoHoje], '2026-11-10').baixo).toBe(0);
    expect(calcularResumoEstoque(meds, [vencendoHoje], '2026-11-11')).toMatchObject({
      zerado: 1,
      vencidos: 1,
    });
  });
});
