import type {
  Atendimento,
  Consulta,
  Dispensacao,
  Internacao,
  Leito,
  Lote,
  Movimentacao,
  Paciente,
  SolicitacaoLeito,
} from '../types';
import { verificarConsistencia, type RetratoOperacoes } from '../utils/consistencia';

const base = { criadoEm: '', atualizadoEm: '', versao: 1 };
const AGORA = new Date('2026-11-10T12:00:00Z').getTime();

const leito = (id: string, extra: Partial<Leito> = {}): Leito => ({
  ...base,
  id,
  codigo: id.toUpperCase(),
  setorId: 'enfermaria',
  perfil: 'adulto',
  isolamento: false,
  status: 'livre',
  desde: '',
  ...extra,
});

const internacao = (id: string, extra: Partial<Internacao> = {}): Internacao => ({
  ...base,
  id,
  pacienteId: 'p1',
  leitoId: 'l1',
  medicoResponsavelId: 'm1',
  origem: 'eletiva',
  motivo: 'Pneumonia',
  precaucao: 'padrao',
  inicio: '2026-11-09T10:00:00Z',
  status: 'ativa',
  eventos: [],
  ...extra,
});

const atendimento = (id: string, extra: Partial<Atendimento> = {}): Atendimento => ({
  ...base,
  id,
  numero: `E-${id}`,
  pacienteId: 'p2',
  chegadaEm: '2026-11-10T10:00:00Z',
  modoChegada: 'ambulancia',
  queixa: 'Falta de ar',
  triagens: [],
  reavaliacoes: [],
  status: 'em_atendimento',
  eventos: [],
  ...extra,
});

const solicitacao = (id: string, extra: Partial<SolicitacaoLeito> = {}): SolicitacaoLeito => ({
  ...base,
  id,
  origem: 'emergencia',
  atendimentoId: 'a1',
  pacienteId: 'p2',
  setorDesejado: 'uti',
  precaucao: 'padrao',
  motivo: 'Falta de ar',
  prioridade: 'laranja',
  status: 'pendente',
  autor: 'x',
  ...extra,
});

const lote = (id: string, quantidadeAtual: number, extra: Partial<Lote> = {}): Lote => ({
  ...base,
  id,
  medicamentoId: 'med1',
  numero: id,
  validade: '2027-01-01',
  quantidadeInicial: 10,
  quantidadeAtual,
  entradaEm: '',
  saldoArquivado: 0,
  ...extra,
});

const mov = (loteId: string, tipo: Movimentacao['tipo'], quantidade: number): Movimentacao => ({
  id: `${loteId}-${tipo}-${quantidade}`,
  tipo,
  medicamentoId: 'med1',
  loteId,
  quantidade,
  saldoLoteApos: 0,
  autor: 'x',
  em: '',
});

const paciente = (id: string, extra: Partial<Paciente> = {}) =>
  ({ ...base, id, nome: id, ativo: true, ...extra }) as Paciente;

/** Retrato coerente: internação ativa no l1, atendimento em observação no l2, reserva no l3. */
function valido(): RetratoOperacoes {
  return {
    leitos: [
      leito('l1', { status: 'ocupado', internacaoId: 'i1' }),
      leito('l2', { setorId: 'observacao', status: 'ocupado', atendimentoId: 'a1' }),
      leito('l3', { setorId: 'uti', status: 'reservado', solicitacaoId: 's1' }),
      leito('l4', { status: 'higienizacao', higienizacao: { tipo: 'terminal' } }),
    ],
    internacoes: [
      internacao('i1'),
      internacao('i2', {
        pacienteId: 'p3',
        leitoId: 'l9',
        origem: 'emergencia',
        atendimentoId: 'a2',
        status: 'encerrada',
      }),
    ],
    atendimentos: [
      atendimento('a1', {
        status: 'aguardando_leito',
        leitoObservacaoId: 'l2',
        solicitacaoId: 's1',
        statusAntesDoLeito: 'em_observacao',
      }),
      atendimento('a2', {
        pacienteId: 'p3',
        status: 'encerrado',
        desfecho: {
          tipo: 'internacao',
          em: '',
          registradoEm: '',
          internacaoId: 'i2',
          statusAnterior: 'aguardando_leito',
        },
      }),
    ],
    solicitacoes: [solicitacao('s1', { status: 'reservada', leitoReservadoId: 'l3' })],
    lotes: [lote('L1', 7), lote('L2', 3, { saldoArquivado: 3 })],
    movimentacoes: [
      mov('L1', 'entrada', 10),
      mov('L1', 'dispensacao', 4),
      mov('L1', 'devolucao', 1),
    ],
    dispensacoes: [
      {
        ...base,
        id: 'd1',
        pacienteId: 'p1',
        destino: { tipo: 'internacao', id: 'i1' },
        medicoSolicitanteId: 'm1',
        itens: [
          {
            medicamentoId: 'med1',
            quantidade: 4,
            lotes: [{ loteId: 'L1', quantidade: 4 }],
            devolvido: 1,
          },
        ],
        alertasConfirmados: [],
        status: 'realizada',
        em: '',
        autor: 'x',
      } satisfies Dispensacao,
    ],
    pacientes: [paciente('p1'), paciente('p2'), paciente('p3')],
    consultas: [],
  };
}

const invs = (r: RetratoOperacoes) => verificarConsistencia(r, AGORA).map((v) => v.inv);

describe('A17 — invariantes de consistência', () => {
  it('retrato coerente: nenhuma violação', () => {
    expect(verificarConsistencia(valido(), AGORA)).toEqual([]);
  });

  it('INV-1: leito ocupado sem ocupação, ou livre com internação ativa', () => {
    const r = valido();
    r.leitos = r.leitos.map((l) => (l.id === 'l1' ? { ...l, internacaoId: 'outra' } : l));
    expect(invs(r)).toContain('INV-1');
    const r2 = valido();
    r2.leitos = r2.leitos.map((l) => (l.id === 'l1' ? leito('l1') : l));
    expect(invs(r2)).toContain('INV-1');
  });

  it('INV-2: leito reservado sem a solicitação reservada', () => {
    const r = valido();
    r.solicitacoes = [solicitacao('s1', { status: 'pendente' })];
    expect(invs(r)).toContain('INV-2');
  });

  it('INV-3: leito em higienização que ainda aponta para uma internação', () => {
    const r = valido();
    r.leitos = r.leitos.map((l) => (l.id === 'l4' ? { ...l, internacaoId: 'i9' } : l));
    expect(invs(r)).toContain('INV-3');
  });

  it('INV-4: internação ativa e atendimento aberto ao mesmo tempo', () => {
    const r = valido();
    r.atendimentos = [...r.atendimentos, atendimento('a3', { pacienteId: 'p1' })];
    expect(invs(r)).toContain('INV-4');
  });

  it('INV-5: aguardando leito sem pedido aberto', () => {
    const r = valido();
    r.solicitacoes = [solicitacao('s1', { status: 'cancelada' })];
    r.leitos = r.leitos.map((l) => (l.id === 'l3' ? leito('l3') : l));
    expect(invs(r)).toEqual(['INV-5']);
  });

  it('INV-6: desfecho internação sem a internação', () => {
    const r = valido();
    r.internacoes = r.internacoes.filter((i) => i.id !== 'i2');
    expect(invs(r)).toEqual(['INV-6']);
  });

  it('INV-7 e INV-8: saldo diferente das movimentações; saldo negativo', () => {
    const r = valido();
    r.lotes = [lote('L1', 8), lote('L2', 3, { saldoArquivado: 3 })];
    expect(invs(r)).toEqual(['INV-7']);
    const r2 = valido();
    r2.lotes = [...r2.lotes, lote('L3', -1, { saldoArquivado: -1 })];
    expect(invs(r2)).toEqual(['INV-8']);
  });

  it('INV-9: soma dos lotes diferente da quantidade do item', () => {
    const r = valido();
    r.dispensacoes = r.dispensacoes.map((d) => ({
      ...d,
      itens: [{ ...d.itens[0], quantidade: 5 }],
    }));
    expect(invs(r)).toEqual(['INV-9']);
  });

  it('INV-10: paciente com óbito e consulta futura agendada', () => {
    const r = valido();
    r.pacientes = [
      ...r.pacientes,
      paciente('p9', {
        ativo: false,
        obito: { em: '', referencia: { tipo: 'internacao', id: 'x' } },
      }),
    ];
    expect(invs(r)).toEqual([]);
    r.consultas = [
      {
        id: 'c1',
        pacienteId: 'p9',
        status: 'agendada',
        inicio: '2026-11-11T10:00:00Z',
      } as Consulta,
    ];
    expect(invs(r)).toEqual(['INV-10']);
  });
});
