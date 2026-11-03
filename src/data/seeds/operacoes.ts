/**
 * Dados de exemplo dos módulos operacionais (D13, A16), gerados de uma vez e coerentes entre si
 * (as invariantes INV-1 a INV-10 valem desde o primeiro acesso).
 *
 * - Usa os pacientes e médicos ATIVOS que já existem (seeds ou do usuário, instalação 1.1.0).
 * - Semente fixa e instantes relativos a `agora()`, como os seeds de consultas.
 * - Ocupação do dia 0 igual à do Painel: UTI 22, Enfermaria 50, Apartamento 14 (86 de 120).
 * - Estoque: 3 medicamentos com estoque baixo, 1 zerado, 5 lotes vencendo em 60 dias e
 *   2 lotes vencidos aguardando descarte. As movimentações fecham com os saldos (INV-7).
 */
import { VENCENDO_DIAS } from '../../config/limites';
import type {
  Atendimento,
  CorRisco,
  Dispensacao,
  EventoAtendimento,
  Internacao,
  Leito,
  Lote,
  Medicamento,
  Medico,
  Movimentacao,
  Paciente,
  Precaucao,
  ResumoMensal,
  SetorId,
  SinaisVitais,
  SolicitacaoLeito,
  StatusAtendimento,
  TipoAlta,
  TipoDesfecho,
  TipoHigienizacao,
  Triagem,
} from '../../types';
import { correspondenciaAlergia } from '../../utils/alergia';
import { autorAtual } from '../../utils/autor';
import { dataDoInstante, idade, somarDias } from '../../utils/datas';
import { calcularPrazo, formatarNumeroAtendimento } from '../../utils/fila';
import { criarAleatorio, inteiro, sortear } from './gerador';
import { MODELOS_MEDICAMENTOS } from './medicamentos';

export interface DadosOperacionais {
  leitos: Leito[];
  internacoes: Internacao[];
  solicitacoes: SolicitacaoLeito[];
  atendimentos: Atendimento[];
  medicamentos: Medicamento[];
  lotes: Lote[];
  movimentacoes: Movimentacao[];
  dispensacoes: Dispensacao[];
  resumos: ResumoMensal[];
}

/** Desenho do gráfico anual atual do Painel (jan a dez), usado só como forma dos resumos. */
const FORMA_ANO = [1180, 1094, 1263, 1210, 1342, 1418, 1485, 1376, 1301, 1352, 1270, 1195];

/** Departamentos dos médicos responsáveis pelas internações de exemplo. */
const DEPARTAMENTOS_INTERNACAO = ['clinica-geral', 'neurologia', 'ortopedia'];

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

/** Ocupação do Painel atual (`data/mock.ts`). */
const OCUPACAO_ALVO: Record<
  'uti' | 'enfermaria' | 'apartamento',
  { adultos: number; pediatricos: number }
> = {
  uti: { adultos: 20, pediatricos: 2 },
  enfermaria: { adultos: 44, pediatricos: 6 },
  apartamento: { adultos: 14, pediatricos: 0 },
};

const MOTIVOS_INTERNACAO = [
  'Pneumonia comunitária',
  'Insuficiência cardíaca descompensada',
  'Pós-operatório de colecistectomia',
  'Celulite em membro inferior',
  'Infecção urinária complicada',
  'Crise hipertensiva',
  'Diabetes descompensado',
  'Fratura de fêmur',
  'Acidente vascular cerebral',
  'Doença pulmonar obstrutiva crônica exacerbada',
  'Pós-operatório de artroplastia de joelho',
  'Pielonefrite',
  'Desidratação',
  'Bronquiolite',
  'Apendicite (pós-operatório)',
];
const QUEIXAS = [
  'Dor torácica',
  'Falta de ar',
  'Febre',
  'Trauma em membro superior',
  'Dor abdominal',
  'Cefaleia intensa',
  'Vômitos',
  'Tontura',
  'Corte na mão',
  'Dor lombar',
];
const PROFISSIONAIS = ['Enf. Cláudia Rocha', 'Enf. Marcos Vieira', 'Enf. Patrícia Lemos'];
const HOSPITAIS = ['Hospital Regional Norte', 'Santa Casa Central', 'Hospital Municipal Sul'];

/** Espera típica até o chamado, por cor (minutos). */
const ESPERA: Record<CorRisco, [number, number]> = {
  vermelho: [0, 4],
  laranja: [3, 18],
  amarelo: [15, 80],
  verde: [30, 140],
  azul: [40, 220],
};

export function gerarDadosOperacionais(entrada: {
  pacientes: readonly Paciente[];
  medicos: readonly Medico[];
  agora: Date;
}): DadosOperacionais {
  const rand = criarAleatorio(1510);
  const agoraMs = entrada.agora.getTime();
  const hoje = dataDoInstante(entrada.agora);
  const autor = autorAtual();
  const iso = (ms: number) => new Date(ms).toISOString();
  const atras = (min: number) => iso(agoraMs - min * MIN);
  const base = (id: string, criadoEm: string) => ({
    id,
    criadoEm,
    atualizadoEm: criadoEm,
    versao: 1,
  });
  const embaralhar = <T>(lista: readonly T[]) => {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };

  // ───────────────────────── pessoas ─────────────────────────
  const ativos = [...entrada.pacientes]
    .filter((p) => p.ativo && !p.obito)
    .sort((a, b) => a.id.localeCompare(b.id));
  const idadeDe = (p: Paciente) => idade(p.dataNascimento, hoje);
  const nomeDe = new Map(entrada.pacientes.map((p) => [p.id, p]));
  const medicosAtivos = [...entrada.medicos]
    .filter((m) => m.ativo)
    .sort((a, b) => a.id.localeCompare(b.id));
  const medicoEmergencia =
    medicosAtivos.find((m) => m.departamentoId === 'emergencia') ?? medicosAtivos[0];
  const medicoPediatria =
    medicosAtivos.find((m) => m.departamentoId === 'pediatria') ?? medicosAtivos[0];
  // Responsáveis pelas internações: clínicos (os cardiologistas ficam com as consultas, e os
  // fluxos de inativação de médico da demonstração continuam livres de pendências, R-X4).
  const clinicos = medicosAtivos.filter((m) => DEPARTAMENTOS_INTERNACAO.includes(m.departamentoId));
  const medicosAdultos =
    clinicos.length > 0 ? clinicos : medicosAtivos.filter((m) => m.departamentoId !== 'pediatria');
  const medicoPara = (p: Paciente, i: number) =>
    (idadeDe(p) < 18
      ? medicoPediatria
      : (medicosAdultos[i % Math.max(1, medicosAdultos.length)] ?? medicoPediatria)
    )?.id;

  // Primeiro os pacientes de exemplo (ids `pac-…`); os cadastrados pelo usuário só se faltar gente.
  const ehExemplo = (p: Paciente) => p.id.startsWith('pac-');
  const pool = [
    ...embaralhar(ativos.filter(ehExemplo)),
    ...embaralhar(ativos.filter((p) => !ehExemplo(p))),
  ];
  /** Para os históricos (encerrados), também só os de exemplo quando houver o bastante. */
  const historico = pool.filter(ehExemplo).length >= 20 ? pool.filter(ehExemplo) : pool;
  const usados = new Set<string>();
  const pegar = (filtro: (p: Paciente) => boolean): Paciente | undefined => {
    const p = pool.find((x) => !usados.has(x.id) && filtro(x));
    if (p) usados.add(p.id);
    return p;
  };
  const adulto = (p: Paciente) => idadeDe(p) >= 18;
  const crianca = (p: Paciente) => idadeDe(p) < 18;

  // ───────────────────────── leitos ─────────────────────────
  const leitos: Leito[] = [];
  const criarLeito = (
    codigo: string,
    setorId: SetorId,
    perfil: Leito['perfil'],
    isolamento: boolean,
    quarto?: string,
  ) =>
    leitos.push({
      ...base(`lei-${codigo.toLowerCase()}`, atras(60 * 24 * 90)),
      codigo,
      setorId,
      ...(quarto ? { quarto } : {}),
      perfil,
      isolamento,
      status: 'livre',
      desde: atras(inteiro(rand, 120, 60 * 24 * 3)),
    });
  for (let n = 1; n <= 30; n++)
    criarLeito(
      `UTI-${String(n).padStart(2, '0')}`,
      'uti',
      n >= 27 ? 'pediatrico' : 'adulto',
      n <= 4,
    );
  for (let q = 101; q <= 135; q++)
    for (const lado of ['A', 'B'])
      criarLeito(
        `ENF-${q}${lado}`,
        'enfermaria',
        q >= 131 ? 'pediatrico' : 'adulto',
        q <= 103,
        String(q),
      );
  for (let n = 201; n <= 220; n++)
    criarLeito(`APT-${n}`, 'apartamento', 'adulto', n <= 202, String(n));
  for (let n = 1; n <= 10; n++)
    criarLeito(
      `OBS-${String(n).padStart(2, '0')}`,
      'observacao',
      n >= 9 ? 'pediatrico' : 'adulto',
      n === 1,
    );
  const leito = (codigo: string) => leitos.find((l) => l.codigo === codigo)!;
  const atualizarLeito = (l: Leito, mudancas: Partial<Leito>) => Object.assign(l, mudancas);

  const internacoes: Internacao[] = [];
  const atendimentos: Atendimento[] = [];
  const solicitacoes: SolicitacaoLeito[] = [];
  let seqInt = 0;
  let seqAte = 0;
  let seqSol = 0;

  // ───────────────────────── atendimentos abertos (antes, para reservar os pacientes) ─────────
  type Abertos = {
    paciente?: (p: Paciente) => boolean;
    provisorio?: Atendimento['provisorio'];
    status: StatusAtendimento;
    risco?: CorRisco;
    chegada: number; // minutos atrás
    triagem?: number;
    chamado?: number;
    observacao?: { leito: string; ha: number };
    pedido?: {
      ha: number;
      setor: 'uti' | 'enfermaria';
      reservarEm?: { leito: string; ha: number };
      antes: StatusAtendimento;
    };
    sinais?: SinaisVitais;
    imediata?: boolean;
  };
  const especAbertos: Abertos[] = [
    {
      provisorio: {
        descricao: 'Homem, ~40 anos, camiseta azul',
        sexo: 'masculino',
        idadeAproximada: 40,
      },
      status: 'aguardando_atendimento',
      risco: 'vermelho',
      chegada: 3,
      imediata: true,
    },
    {
      paciente: adulto,
      status: 'aguardando_atendimento',
      risco: 'laranja',
      chegada: 32,
      triagem: 26,
      sinais: { pas: 150, pad: 95, fc: 112, fr: 28, temperatura: 37.8, spo2: 89, dor: 6 },
    },
    {
      paciente: adulto,
      status: 'aguardando_atendimento',
      risco: 'laranja',
      chegada: 22,
      triagem: 18,
      sinais: { pas: 168, pad: 100, fc: 98, fr: 22, spo2: 95, dor: 8 },
    },
    {
      paciente: adulto,
      status: 'aguardando_atendimento',
      risco: 'amarelo',
      chegada: 41,
      triagem: 35,
      sinais: { pas: 130, pad: 85, fc: 92, temperatura: 38.6, spo2: 97, dor: 4 },
    },
    {
      paciente: adulto,
      status: 'aguardando_atendimento',
      risco: 'verde',
      chegada: 50,
      triagem: 44,
      sinais: { pas: 122, pad: 78, fc: 80, spo2: 98, dor: 3 },
    },
    {
      paciente: adulto,
      status: 'aguardando_atendimento',
      risco: 'azul',
      chegada: 70,
      triagem: 62,
      sinais: { pas: 118, pad: 76, fc: 72, spo2: 99, dor: 1 },
    },
    { paciente: adulto, status: 'aguardando_triagem', chegada: 5 },
    {
      provisorio: {
        descricao: 'Mulher, ~70 anos, cabelo grisalho',
        sexo: 'feminino',
        idadeAproximada: 70,
      },
      status: 'aguardando_triagem',
      chegada: 20,
    },
    {
      paciente: adulto,
      status: 'em_atendimento',
      risco: 'amarelo',
      chegada: 90,
      triagem: 84,
      chamado: 60,
      sinais: { pas: 140, pad: 90, fc: 88, spo2: 96, dor: 5 },
    },
    {
      paciente: crianca,
      status: 'em_observacao',
      risco: 'verde',
      chegada: 360,
      triagem: 350,
      chamado: 320,
      observacao: { leito: 'OBS-09', ha: 300 },
      sinais: { fc: 110, fr: 26, temperatura: 38.2, spo2: 97 },
    },
    {
      paciente: adulto,
      status: 'em_observacao',
      risco: 'amarelo',
      chegada: 27 * 60,
      triagem: 27 * 60 - 8,
      chamado: 27 * 60 - 40,
      observacao: { leito: 'OBS-05', ha: 26 * 60 },
      sinais: { pas: 100, pad: 60, fc: 104, spo2: 94, temperatura: 37.9 },
    },
    {
      paciente: adulto,
      status: 'aguardando_leito',
      risco: 'laranja',
      chegada: 7 * 60,
      triagem: 7 * 60 - 6,
      chamado: 7 * 60 - 15,
      pedido: {
        ha: 5 * 60 + 10,
        setor: 'uti',
        reservarEm: { leito: 'UTI-12', ha: 150 },
        antes: 'em_atendimento',
      },
      sinais: { pas: 92, pad: 58, fc: 124, fr: 30, spo2: 90, temperatura: 38.9 },
    },
    {
      paciente: adulto,
      status: 'aguardando_leito',
      risco: 'amarelo',
      chegada: 9 * 60,
      triagem: 9 * 60 - 10,
      chamado: 9 * 60 - 50,
      observacao: { leito: 'OBS-03', ha: 8 * 60 },
      pedido: { ha: 5 * 60, setor: 'enfermaria', antes: 'em_observacao' },
      sinais: { pas: 135, pad: 88, fc: 90, spo2: 95, temperatura: 37.5 },
    },
  ];

  const novoAtendimento = (
    dados: Omit<Atendimento, 'id' | 'criadoEm' | 'atualizadoEm' | 'versao' | 'numero'>,
  ) => {
    const a: Atendimento = { ...base(`ate-${++seqAte}`, dados.chegadaEm), numero: '', ...dados };
    atendimentos.push(a);
    return a;
  };
  const triagemDe = (em: string, risco: CorRisco, sinais: SinaisVitais): Triagem => ({
    em,
    profissional: sortear(rand, PROFISSIONAIS),
    risco,
    sinais,
    autor,
  });
  const sinaisNormais = (): SinaisVitais => ({
    pas: inteiro(rand, 110, 145),
    pad: inteiro(rand, 65, 92),
    fc: inteiro(rand, 64, 98),
    fr: inteiro(rand, 14, 20),
    temperatura: 36 + inteiro(rand, 0, 14) / 10,
    spo2: inteiro(rand, 95, 99),
    dor: inteiro(rand, 0, 7),
  });

  for (const e of especAbertos) {
    const paciente = e.paciente ? pegar(e.paciente) : undefined;
    if (e.paciente && !paciente) continue;
    const chegadaEm = atras(e.chegada);
    const eventos: EventoAtendimento[] = [{ tipo: 'chegada', em: chegadaEm, autor }];
    const triagens: Triagem[] = [];
    let prazo: string | undefined;
    if (e.imediata) prazo = calcularPrazo({}, { risco: 'vermelho', em: chegadaEm });
    if (e.triagem !== undefined && e.risco) {
      const em = atras(e.triagem);
      triagens.push(triagemDe(em, e.risco, e.sinais ?? sinaisNormais()));
      prazo = calcularPrazo({}, { risco: e.risco, em });
      eventos.push({ tipo: 'triagem', em, autor, para: e.risco });
    }
    const medicoId = e.chamado !== undefined ? medicoEmergencia?.id : undefined;
    if (e.chamado !== undefined && prazo) {
      const em = atras(e.chamado);
      eventos.push({
        tipo: 'chamado',
        em,
        autor,
        medicoId,
        excessoMin: Math.max(
          0,
          Math.floor((new Date(em).getTime() - new Date(prazo).getTime()) / MIN),
        ),
      });
    }
    const a = novoAtendimento({
      ...(paciente ? { pacienteId: paciente.id } : { provisorio: e.provisorio }),
      chegadaEm,
      modoChegada: e.imediata
        ? 'samu'
        : sortear(rand, ['meios_proprios', 'meios_proprios', 'ambulancia', 'samu'] as const),
      queixa: sortear(rand, QUEIXAS),
      ...(e.risco ? { risco: e.risco } : {}),
      ...(prazo ? { prazo } : {}),
      triagens,
      reavaliacoes: [],
      status: e.status,
      ...(medicoId ? { medicoId } : {}),
      eventos,
    });
    if (e.observacao) {
      const l = leito(e.observacao.leito);
      const em = atras(e.observacao.ha);
      a.leitoObservacaoId = l.id;
      a.eventos.push({ tipo: 'observacao', em, autor, para: l.codigo });
      atualizarLeito(l, { status: 'ocupado', atendimentoId: a.id, desde: em });
    }
    if (e.pedido && paciente) {
      const em = atras(e.pedido.ha);
      const s: SolicitacaoLeito = {
        ...base(`sol-${++seqSol}`, em),
        origem: 'emergencia',
        atendimentoId: a.id,
        pacienteId: paciente.id,
        setorDesejado: e.pedido.setor,
        precaucao: 'padrao',
        motivo: a.queixa,
        prioridade: a.risco ?? 'amarelo',
        status: 'pendente',
        autor,
      };
      if (e.pedido.reservarEm) {
        const l = leito(e.pedido.reservarEm.leito);
        const reservadaEm = atras(e.pedido.reservarEm.ha);
        Object.assign(s, { status: 'reservada', leitoReservadoId: l.id, reservadaEm });
        atualizarLeito(l, { status: 'reservado', solicitacaoId: s.id, desde: reservadaEm });
      }
      solicitacoes.push(s);
      Object.assign(a, { solicitacaoId: s.id, statusAntesDoLeito: e.pedido.antes });
      a.eventos.push({ tipo: 'leito_solicitado', em, autor, para: e.pedido.setor });
    }
  }

  // Uma internação eletiva pedida para amanhã (L9).
  const eletivo = pegar(adulto);
  if (eletivo) {
    solicitacoes.push({
      ...base(`sol-${++seqSol}`, atras(180)),
      origem: 'eletiva',
      pacienteId: eletivo.id,
      setorDesejado: 'apartamento',
      precaucao: 'padrao',
      motivo: 'Artroplastia de quadril programada',
      dataPrevista: somarDias(hoje, 1),
      prioridade: 'verde',
      status: 'pendente',
      autor,
    });
  }

  // ───────────────────────── leitos fora de uso ─────────────────────────
  const reservados = new Set(['UTI-12']);
  const higienizacao: {
    codigo: string;
    ha: number;
    tipo: TipoHigienizacao;
    precaucao: Precaucao;
  }[] = [
    { codigo: 'UTI-15', ha: 25, tipo: 'terminal', precaucao: 'padrao' },
    { codigo: 'ENF-118A', ha: 75, tipo: 'terminal', precaucao: 'padrao' },
    { codigo: 'ENF-102B', ha: 200, tipo: 'isolamento', precaucao: 'contato' },
  ];
  const bloqueado = 'ENF-125B';
  const foraDeUso = new Set([...reservados, ...higienizacao.map((h) => h.codigo), bloqueado]);
  atualizarLeito(leito(bloqueado), {
    status: 'bloqueado',
    desde: atras(2 * 24 * 60),
    bloqueio: {
      motivo: 'Manutenção',
      previsaoLiberacao: somarDias(hoje, 1),
      em: atras(2 * 24 * 60),
      autor,
    },
  });

  // ───────────────────────── internações ativas ─────────────────────────
  const inicioAtual = new Map<string, number>();
  let indice = 0;
  for (const setorId of ['uti', 'enfermaria', 'apartamento'] as const) {
    const alvo = OCUPACAO_ALVO[setorId];
    const doSetor = leitos.filter((l) => l.setorId === setorId && !foraDeUso.has(l.codigo));
    const escolher = (perfil: Leito['perfil'], n: number) =>
      embaralhar(doSetor.filter((l) => l.perfil === perfil && l.status === 'livre')).slice(0, n);
    const pedi = escolher('pediatrico', alvo.pediatricos);
    const adultos = escolher('adulto', alvo.adultos + (alvo.pediatricos - pedi.length));
    for (const l of [...pedi, ...adultos].sort((a, b) => a.codigo.localeCompare(b.codigo))) {
      const paciente = pegar(l.perfil === 'pediatrico' ? crianca : adulto);
      if (!paciente) continue;
      const i = indice++;
      // As primeiras 2 têm alta prevista vencida; as 3 seguintes, para hoje (R-L8).
      const diasAtras = i < 5 ? inteiro(rand, 3, 9) : inteiro(rand, 0, 12);
      const inicioMs = agoraMs - diasAtras * DIA - inteiro(rand, 30, 20 * 60) * MIN;
      const inicio = iso(inicioMs);
      const precaucao: Precaucao = l.isolamento
        ? sortear(rand, ['contato', 'goticulas', 'aerossois', 'padrao'] as const)
        : 'padrao';
      const previsaoAlta =
        i < 2
          ? somarDias(hoje, -1 - i)
          : i < 5
            ? hoje
            : rand() < 0.75
              ? somarDias(hoje, inteiro(rand, 1, 10))
              : undefined;
      const daEmergencia = diasAtras <= 5 && rand() < 0.4;
      const int: Internacao = {
        ...base(`int-${++seqInt}`, inicio),
        pacienteId: paciente.id,
        leitoId: l.id,
        medicoResponsavelId: medicoPara(paciente, i) ?? '',
        origem: daEmergencia ? 'emergencia' : rand() < 0.15 ? 'transferencia_externa' : 'eletiva',
        motivo: sortear(rand, MOTIVOS_INTERNACAO),
        precaucao,
        inicio,
        ...(previsaoAlta ? { previsaoAlta } : {}),
        status: 'ativa',
        eventos: [{ tipo: 'internada', em: inicio, autor, para: l.codigo }],
      };
      if (int.origem === 'transferencia_externa') int.hospitalOrigem = sortear(rand, HOSPITAIS);
      internacoes.push(int);
      inicioAtual.set(paciente.id, inicioMs);
      atualizarLeito(l, { status: 'ocupado', internacaoId: int.id, desde: inicio });
    }
  }

  // Internações vindas da emergência: atendimento encerrado por internação + pedido atendido.
  for (const int of internacoes.filter((x) => x.origem === 'emergencia')) {
    const inicioMs = new Date(int.inicio).getTime();
    const chegadaMs = inicioMs - inteiro(rand, 3, 8) * HORA;
    const risco = sortear(rand, ['laranja', 'amarelo', 'amarelo', 'vermelho'] as const);
    const triagemEm = iso(chegadaMs + inteiro(rand, 4, 12) * MIN);
    const prazo = calcularPrazo({}, { risco, em: triagemEm });
    const chamadoEm = iso(new Date(triagemEm).getTime() + inteiro(rand, ...ESPERA[risco]) * MIN);
    const pedidoEm = iso(inicioMs - inteiro(rand, 40, 150) * MIN);
    const sol: SolicitacaoLeito = {
      ...base(`sol-${++seqSol}`, pedidoEm),
      origem: 'emergencia',
      pacienteId: int.pacienteId,
      setorDesejado: (leitos.find((l) => l.id === int.leitoId)!.setorId as 'uti') ?? 'enfermaria',
      precaucao: int.precaucao,
      motivo: int.motivo,
      prioridade: risco,
      status: 'atendida',
      internacaoId: int.id,
      autor,
    };
    const a = novoAtendimento({
      pacienteId: int.pacienteId,
      chegadaEm: iso(chegadaMs),
      modoChegada: sortear(rand, ['ambulancia', 'samu', 'meios_proprios'] as const),
      queixa: sortear(rand, QUEIXAS),
      risco,
      prazo,
      triagens: [triagemDe(triagemEm, risco, sinaisNormais())],
      reavaliacoes: [],
      status: 'encerrado',
      medicoId: medicoEmergencia?.id,
      solicitacaoId: sol.id,
      desfecho: {
        tipo: 'internacao',
        em: int.inicio,
        internacaoId: int.id,
        registradoEm: int.inicio,
        statusAnterior: 'aguardando_leito',
      },
      eventos: [
        { tipo: 'chegada', em: iso(chegadaMs), autor },
        { tipo: 'triagem', em: triagemEm, autor, para: risco },
        { tipo: 'chamado', em: chamadoEm, autor, medicoId: medicoEmergencia?.id },
        { tipo: 'leito_solicitado', em: pedidoEm, autor, para: sol.setorDesejado },
        { tipo: 'desfecho', em: int.inicio, autor, para: 'internacao' },
      ],
    });
    sol.atendimentoId = a.id;
    solicitacoes.push(sol);
    Object.assign(int, { atendimentoId: a.id, solicitacaoId: sol.id });
  }

  // ───────────────────────── internações encerradas (últimos 30 dias) ─────────────────────────
  const periodos = new Map<string, [number, number][]>();
  const livreNoPeriodo = (pacienteId: string, ini: number, fim: number) =>
    (inicioAtual.get(pacienteId) ?? Infinity) > fim &&
    !(periodos.get(pacienteId) ?? []).some(([a, b]) => ini < b && a < fim);
  const leitosInternacao = leitos.filter((l) => l.setorId !== 'observacao');
  const encerrar = (altaMs: number, l: Leito, tipo: TipoAlta, precaucao: Precaucao = 'padrao') => {
    for (let tentativa = 0; tentativa < 40; tentativa++) {
      const p = sortear(rand, historico);
      if ((l.perfil === 'pediatrico') !== idadeDe(p) < 18) continue;
      const inicioMs = altaMs - inteiro(rand, 1, 8) * DIA - inteiro(rand, 0, 600) * MIN;
      if (!livreNoPeriodo(p.id, inicioMs, altaMs)) continue;
      periodos.set(p.id, [...(periodos.get(p.id) ?? []), [inicioMs, altaMs]]);
      const inicio = iso(inicioMs);
      const em = iso(altaMs);
      internacoes.push({
        ...base(`int-${++seqInt}`, inicio),
        atualizadoEm: em,
        versao: 2,
        pacienteId: p.id,
        leitoId: l.id,
        medicoResponsavelId: medicoPara(p, seqInt) ?? '',
        origem: rand() < 0.2 ? 'transferencia_externa' : 'eletiva',
        ...(rand() < 0.2 ? { hospitalOrigem: sortear(rand, HOSPITAIS) } : {}),
        motivo: sortear(rand, MOTIVOS_INTERNACAO),
        precaucao,
        inicio,
        status: 'encerrada',
        alta: {
          tipo,
          em,
          registradaEm: em,
          ...(tipo === 'transferencia' ? { hospitalDestino: sortear(rand, HOSPITAIS) } : {}),
        },
        eventos: [
          { tipo: 'internada', em: inicio, autor, para: l.codigo },
          { tipo: 'alta', em, autor, para: tipo },
        ],
      });
      return true;
    }
    return false;
  };
  // Corrige a origem: transferência externa precisa do hospital (M25).
  const corrigirOrigem = () => {
    for (const i of internacoes) {
      if (i.origem === 'transferencia_externa' && !i.hospitalOrigem)
        i.hospitalOrigem = sortear(rand, HOSPITAIS);
      if (i.origem !== 'transferencia_externa') delete i.hospitalOrigem;
    }
  };
  // As 3 altas que deixaram leitos em higienização agora.
  for (const h of higienizacao) {
    const l = leito(h.codigo);
    const altaMs = agoraMs - h.ha * MIN;
    encerrar(altaMs, l, 'melhorada', h.precaucao);
    atualizarLeito(l, {
      status: 'higienizacao',
      desde: iso(altaMs),
      higienizacao: { tipo: h.tipo },
    });
  }
  for (let k = 0; k < 60; k++) {
    const altaMs = agoraMs - (6 * HORA + k * 12 * HORA + inteiro(rand, 0, 300) * MIN);
    const tipo: TipoAlta = rand() < 0.1 ? 'a_pedido' : rand() < 0.1 ? 'transferencia' : 'melhorada';
    encerrar(altaMs, sortear(rand, leitosInternacao), tipo);
  }
  corrigirOrigem();

  // ───────────────────────── atendimentos encerrados (últimos 7 dias) ─────────────────────────
  for (let k = 0; k < 56; k++) {
    const chegadaMs = agoraMs - (3 * HORA + k * 3 * HORA + inteiro(rand, 0, 120) * MIN);
    const risco = sortear(rand, [
      'laranja',
      'amarelo',
      'amarelo',
      'verde',
      'verde',
      'verde',
      'azul',
    ] as const);
    const p =
      historico.find(
        (x) => !usados.has(x.id) && inicioAtual.get(x.id) === undefined && rand() < 0.3,
      ) ?? historico.find((x) => !usados.has(x.id) && inicioAtual.get(x.id) === undefined);
    if (!p) break;
    const triagemMs = chegadaMs + inteiro(rand, 3, 15) * MIN;
    const prazo = calcularPrazo({}, { risco, em: iso(triagemMs) });
    const evasao = rand() < 0.07;
    const chamadoMs = triagemMs + inteiro(rand, ...ESPERA[risco]) * MIN;
    const fimMs = evasao ? chamadoMs + 40 * MIN : chamadoMs + inteiro(rand, 30, 240) * MIN;
    if (fimMs > agoraMs - 5 * MIN) continue;
    const tipo: TipoDesfecho = evasao ? 'evasao' : rand() < 0.06 ? 'transferencia' : 'alta';
    const eventos: EventoAtendimento[] = [
      { tipo: 'chegada', em: iso(chegadaMs), autor },
      { tipo: 'triagem', em: iso(triagemMs), autor, para: risco },
    ];
    if (!evasao) {
      eventos.push({
        tipo: 'chamado',
        em: iso(chamadoMs),
        autor,
        medicoId: medicoEmergencia?.id,
        excessoMin: Math.max(0, Math.floor((chamadoMs - new Date(prazo).getTime()) / MIN)),
      });
    }
    eventos.push({ tipo: 'desfecho', em: iso(fimMs), autor, para: tipo });
    novoAtendimento({
      pacienteId: p.id,
      chegadaEm: iso(chegadaMs),
      modoChegada: sortear(rand, [
        'meios_proprios',
        'meios_proprios',
        'ambulancia',
        'samu',
      ] as const),
      queixa: sortear(rand, QUEIXAS),
      risco,
      prazo,
      triagens: [triagemDe(iso(triagemMs), risco, sinaisNormais())],
      reavaliacoes: [],
      status: 'encerrado',
      ...(evasao ? {} : { medicoId: medicoEmergencia?.id }),
      desfecho: {
        tipo,
        em: iso(fimMs),
        registradoEm: iso(fimMs),
        statusAnterior: evasao ? 'aguardando_atendimento' : 'em_atendimento',
        ...(tipo === 'transferencia' ? { hospitalDestino: sortear(rand, HOSPITAIS) } : {}),
      },
      eventos,
    });
  }

  // Números E-0001… por dia da chegada (A8), na ordem de chegada.
  const porDia = new Map<string, number>();
  for (const a of [...atendimentos].sort((x, y) => x.chegadaEm.localeCompare(y.chegadaEm))) {
    const dia = dataDoInstante(a.chegadaEm);
    const n = (porDia.get(dia) ?? 0) + 1;
    porDia.set(dia, n);
    a.numero = formatarNumeroAtendimento(n);
  }

  // ───────────────────────── farmácia ─────────────────────────
  const farmacia = gerarFarmacia({
    rand,
    agoraMs,
    hoje,
    autor,
    internacoes,
    atendimentos,
    pacientes: nomeDe,
    medicosAtivos: new Set(medicosAtivos.map((m) => m.id)),
    medicoPadrao: medicosAtivos[0]?.id ?? '',
  });

  return {
    leitos,
    internacoes,
    solicitacoes,
    atendimentos,
    ...farmacia,
    resumos: gerarResumos(rand, hoje, internacoes),
  };
}

// ───────────────────────── farmácia (simulação em ordem de tempo) ─────────────────────────

interface EntradaFarmacia {
  rand: () => number;
  agoraMs: number;
  hoje: string;
  autor: string;
  internacoes: readonly Internacao[];
  atendimentos: readonly Atendimento[];
  pacientes: ReadonlyMap<string, Paciente>;
  medicosAtivos: ReadonlySet<string>;
  medicoPadrao: string;
}

function gerarFarmacia(e: EntradaFarmacia) {
  const { rand, agoraMs, hoje, autor } = e;
  const iso = (ms: number) => new Date(ms).toISOString();
  const criado = iso(agoraMs - 200 * DIA);

  const medicamentos: Medicamento[] = MODELOS_MEDICAMENTOS.map((m) => ({
    id: m.id,
    criadoEm: criado,
    atualizadoEm: criado,
    versao: 1,
    nome: m.nome,
    ...(m.nomeComercial ? { nomeComercial: m.nomeComercial } : {}),
    principioAtivo: m.principioAtivo,
    ...(m.classe ? { classe: m.classe } : {}),
    concentracao: m.concentracao,
    forma: m.forma,
    unidade: m.unidade,
    ...(m.controlado ? { controlado: { lista: m.controlado } } : {}),
    ...(m.unidadesPorEmbalagem ? { unidadesPorEmbalagem: m.unidadesPorEmbalagem } : {}),
    estoqueMinimo: m.estoqueMinimo,
    ativo: true,
  }));
  const modelo = new Map(MODELOS_MEDICAMENTOS.map((m) => [m.id, m]));

  const lotes: Lote[] = [];
  const movimentacoes: Movimentacao[] = [];
  const dispensacoes: Dispensacao[] = [];
  type Evento = { ms: number; aplicar: () => void };
  const eventos: Evento[] = [];
  let seqLote = 0;
  let seqMov = 0;
  let seqDis = 0;

  const novoLote = (
    medicamentoId: string,
    validade: string,
    quantidade: number,
    entradaMs: number,
  ): Lote => {
    const antiga = entradaMs < agoraMs - 58 * DIA; // fora da retenção de movimentações (60 dias)
    const entradaEm = iso(entradaMs);
    const lote: Lote = {
      id: `lot-${++seqLote}`,
      criadoEm: entradaEm,
      atualizadoEm: entradaEm,
      versao: 1,
      medicamentoId,
      numero: `L${String(23000 + seqLote * 7).padStart(5, '0')}`,
      validade,
      fabricante: sortear(rand, ['EMS', 'Medley', 'Eurofarma', 'Cristália', 'Hipolabor']),
      quantidadeInicial: quantidade,
      quantidadeAtual: antiga ? quantidade : 0,
      entradaEm,
      saldoArquivado: antiga ? quantidade : 0,
    };
    lotes.push(lote);
    if (!antiga) {
      eventos.push({
        ms: entradaMs,
        aplicar: () => {
          lote.quantidadeAtual += quantidade;
          movimentacoes.push({
            id: `mov-${++seqMov}`,
            tipo: 'entrada',
            medicamentoId,
            loteId: lote.id,
            quantidade,
            saldoLoteApos: lote.quantidadeAtual,
            autor,
            em: entradaEm,
          });
        },
      });
    }
    return lote;
  };

  const mais = (dias: number) => somarDias(hoje, dias);
  for (const m of MODELOS_MEDICAMENTOS) {
    if (m.papel === 'baixo') {
      novoLote(
        m.id,
        mais(inteiro(rand, 200, 500)),
        Math.max(1, Math.round(m.estoqueMinimo * 0.6)),
        agoraMs - inteiro(rand, 5, 40) * DIA,
      );
      continue;
    }
    if (m.papel === 'zerado') {
      novoLote(m.id, mais(300), 30, agoraMs - 25 * DIA);
      continue;
    }
    const grande = m.estoqueMinimo * 3 + 150;
    novoLote(m.id, mais(inteiro(rand, 90, 540)), grande, agoraMs - inteiro(rand, 70, 150) * DIA);
    novoLote(
      m.id,
      mais(inteiro(rand, 300, 720)),
      Math.round(grande / 2),
      agoraMs - inteiro(rand, 10, 50) * DIA,
    );
  }

  // Destinos válidos num instante: internação ativa naquele momento ou atendimento aberto.
  const destinos = (ms: number) => [
    ...e.internacoes
      .filter((i) => {
        const ini = new Date(i.inicio).getTime();
        const fim = i.alta ? new Date(i.alta.em).getTime() : Infinity;
        return ini <= ms && ms < fim;
      })
      .map((i) => ({
        tipo: 'internacao' as const,
        id: i.id,
        pacienteId: i.pacienteId,
        medicoId: i.medicoResponsavelId,
      })),
    ...e.atendimentos
      .filter((a) => {
        if (!a.pacienteId || !a.medicoId) return false;
        const ini = new Date(a.chegadaEm).getTime() + 60 * MIN;
        const fim = a.desfecho ? new Date(a.desfecho.em).getTime() : Infinity;
        return ini <= ms && ms < fim;
      })
      .map((a) => ({
        tipo: 'emergencia' as const,
        id: a.id,
        pacienteId: a.pacienteId!,
        medicoId: a.medicoId!,
      })),
  ];

  const disponiveis = (medicamentoId: string, ms: number) => {
    const dia = dataDoInstante(new Date(ms));
    return lotes
      .filter(
        (l) =>
          l.medicamentoId === medicamentoId &&
          new Date(l.entradaEm).getTime() <= ms &&
          l.validade >= dia &&
          l.quantidadeAtual > 0,
      )
      .sort(
        (a, b) => a.validade.localeCompare(b.validade) || a.entradaEm.localeCompare(b.entradaEm),
      );
  };
  const dispensar = (ms: number, forcado?: { medicamentoId: string; quantidade: number }) => {
    const opcoes = destinos(ms);
    if (opcoes.length === 0) return;
    const d = sortear(rand, opcoes);
    const paciente = e.pacientes.get(d.pacienteId);
    const sorteaveis = MODELOS_MEDICAMENTOS.filter((m) => !m.papel);
    const pedidos = forcado
      ? [forcado]
      : Array.from({ length: inteiro(rand, 1, 3) }, () => {
          const m = sortear(rand, sorteaveis);
          return {
            medicamentoId: m.id,
            quantidade:
              m.unidade === 'comprimido' || m.unidade === 'capsula'
                ? inteiro(rand, 2, 14)
                : inteiro(rand, 1, 6),
          };
        }).filter(
          (p, i, todos) => todos.findIndex((x) => x.medicamentoId === p.medicamentoId) === i,
        );
    const id = `dis-${++seqDis}`;
    const em = iso(ms);
    const itens: Dispensacao['itens'] = [];
    const alertas: Dispensacao['alertasConfirmados'] = [];
    for (const pedido of pedidos) {
      const m = modelo.get(pedido.medicamentoId)!;
      const ordem = disponiveis(m.id, ms);
      if (ordem.reduce((s, l) => s + l.quantidadeAtual, 0) < pedido.quantidade) continue;
      const alergia = correspondenciaAlergia(paciente?.alergias, m);
      if (alergia && !forcado && rand() < 0.7) continue; // na maioria das vezes, troca o medicamento
      const lotesItem: { loteId: string; quantidade: number }[] = [];
      let restante = pedido.quantidade;
      for (const l of ordem) {
        if (restante === 0) break;
        const usar = Math.min(restante, l.quantidadeAtual);
        l.quantidadeAtual -= usar;
        restante -= usar;
        lotesItem.push({ loteId: l.id, quantidade: usar });
        movimentacoes.push({
          id: `mov-${++seqMov}`,
          tipo: 'dispensacao',
          medicamentoId: m.id,
          loteId: l.id,
          quantidade: usar,
          saldoLoteApos: l.quantidadeAtual,
          dispensacaoId: id,
          autor,
          em,
        });
      }
      itens.push({
        medicamentoId: m.id,
        quantidade: pedido.quantidade,
        lotes: lotesItem,
        devolvido: 0,
      });
      if (alergia) {
        alertas.push({
          tipo: 'alergia',
          medicamentoId: m.id,
          termo: alergia.termo,
          justificativa: 'Prescrição conferida com o médico responsável.',
        });
      }
      if (m.controlado) alertas.push({ tipo: 'controlado', medicamentoId: m.id });
    }
    if (itens.length === 0) return;
    dispensacoes.push({
      id,
      criadoEm: em,
      atualizadoEm: em,
      versao: 1,
      pacienteId: d.pacienteId,
      destino: { tipo: d.tipo, id: d.id },
      medicoSolicitanteId: e.medicosAtivos.has(d.medicoId) ? d.medicoId : e.medicoPadrao,
      itens,
      alertasConfirmados: alertas,
      status: 'realizada',
      em,
      autor,
    });
  };

  // ~5 dispensações por dia nos últimos 30 dias; 3 que zeram a dexametasona.
  for (let dia = 29; dia >= 0; dia--) {
    for (let k = 0; k < 5; k++) {
      const ms = agoraMs - dia * DIA - inteiro(rand, 30, 23 * 60) * MIN;
      if (ms < agoraMs - 10 * MIN) eventos.push({ ms, aplicar: () => dispensar(ms) });
    }
  }
  for (const dias of [20, 12, 5]) {
    const ms = agoraMs - dias * DIA + 3 * HORA;
    eventos.push({
      ms,
      aplicar: () => dispensar(ms, { medicamentoId: 'med-dexametasona-4', quantidade: 10 }),
    });
  }
  eventos.sort((a, b) => a.ms - b.ms).forEach((ev) => ev.aplicar());

  // 5 lotes vencendo em até 60 dias e 2 vencidos aguardando descarte (R-F6). Entram depois
  // da simulação, com o saldo antigo já arquivado, para que o FEFO não os consuma.
  const normais = MODELOS_MEDICAMENTOS.filter((m) => !m.papel && !m.controlado);
  [10, 20, 30, 45, Math.min(55, VENCENDO_DIAS)].forEach((dias, i) =>
    novoLote(
      normais[i * 3].id,
      mais(dias),
      inteiro(rand, 30, 80),
      agoraMs - inteiro(rand, 100, 160) * DIA,
    ),
  );
  [-3, -12].forEach((dias, i) =>
    novoLote(normais[i * 5 + 1].id, mais(dias), 20, agoraMs - inteiro(rand, 100, 160) * DIA),
  );

  // Algumas devoluções parciais (F4), no dia seguinte, ao mesmo lote (ainda válido).
  for (const d of dispensacoes.filter((_, i) => i % 23 === 7)) {
    const item = d.itens[0];
    const ultima = item.lotes[item.lotes.length - 1];
    const lote = lotes.find((l) => l.id === ultima.loteId)!;
    const ms = Math.min(new Date(d.em).getTime() + DIA, agoraMs - HORA);
    if (lote.validade < hoje || ms <= new Date(d.em).getTime()) continue;
    lote.quantidadeAtual += 1;
    item.devolvido = 1;
    d.versao = 2;
    movimentacoes.push({
      id: `mov-${++seqMov}`,
      tipo: 'devolucao',
      medicamentoId: item.medicamentoId,
      loteId: lote.id,
      quantidade: 1,
      saldoLoteApos: lote.quantidadeAtual,
      dispensacaoId: d.id,
      motivo: 'Não utilizado',
      autor,
      em: iso(ms),
    });
  }

  return { medicamentos, lotes, movimentacoes, dispensacoes };
}

// ───────────────────────── resumos mensais (A14, A15) ─────────────────────────

/**
 * Últimos 12 meses completos, com o mesmo desenho do gráfico atual, numa escala coerente
 * com os dados do dia a dia (~70 internações por mês). O mês que ainda tem internações vivas
 * (até 30 dias) recebe só a diferença, para não contar duas vezes.
 */
function gerarResumos(
  rand: () => number,
  hoje: string,
  internacoes: readonly Internacao[],
): ResumoMensal[] {
  const [ano, mes] = hoje.split('-').map(Number);
  const vivas = new Map<string, number>();
  for (const i of internacoes) {
    const m = dataDoInstante(i.inicio).slice(0, 7);
    vivas.set(m, (vivas.get(m) ?? 0) + 1);
  }
  const resumos: ResumoMensal[] = [];
  for (let k = 12; k >= 1; k--) {
    const total = ano * 12 + (mes - 1) - k;
    const a = Math.floor(total / 12);
    const m = (total % 12) + 1;
    const id = `${a}-${String(m).padStart(2, '0')}`;
    const forma = FORMA_ANO[m - 1];
    const internacoesMes = Math.max(0, Math.round(forma * 0.055) - (vivas.get(id) ?? 0));
    const atendimentos = Math.round(forma * 0.18);
    const porCor = {
      vermelho: Math.round(atendimentos * 0.03),
      laranja: Math.round(atendimentos * 0.12),
      amarelo: Math.round(atendimentos * 0.35),
      verde: Math.round(atendimentos * 0.4),
      azul: Math.round(atendimentos * 0.1),
    };
    resumos.push({
      id,
      internacoes: internacoesMes,
      altasPorTipo: {
        melhorada: Math.round(internacoesMes * 0.85),
        a_pedido: Math.round(internacoesMes * 0.06),
        transferencia: Math.round(internacoesMes * 0.06),
        obito: Math.round(internacoesMes * 0.03),
      },
      atendimentosPorCor: porCor,
      atendimentosPorDesfecho: {
        alta: Math.round(atendimentos * 0.78),
        internacao: Math.round(atendimentos * 0.12),
        transferencia: Math.round(atendimentos * 0.04),
        evasao: Math.round(atendimentos * 0.05),
        obito: Math.round(atendimentos * 0.01),
      },
      esperaPorCor: Object.fromEntries(
        (Object.keys(porCor) as CorRisco[]).map((cor) => {
          const [min, max] = ESPERA[cor];
          const n = porCor[cor];
          return [cor, { soma: n * Math.round((min + max) / 2 + inteiro(rand, -2, 2)), n }];
        }),
      ),
      dispensacoes: Math.round(forma * 0.12),
      saidasPorMedicamento: {},
    });
  }
  return resumos;
}
