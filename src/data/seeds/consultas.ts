/**
 * ~40 consultas de exemplo, da semana passada à próxima, sempre relativas a `agora()`.
 * - Os 4 horários de hoje que o Painel mostra (09:00, 10:30, 12:00, 16:00) são fixos.
 * - As demais são sorteadas (semente fixa) só em horários que respeitam a agenda:
 *   expediente, pausa e nenhum conflito de médico ou de paciente.
 * - Passadas viram concluídas, faltas ou canceladas; duas ficam "aguardando registro" (R-C7).
 */
import {
  TIPOS_CONSULTA,
  type Consulta,
  type EventoConsulta,
  type Medico,
  type Paciente,
  type StatusConsulta,
} from '../../types';
import { atendeNoDia, gerarHorarios, intervaloDe, type Intervalo } from '../../utils/agenda';
import { hojeNoFuso, idade, instanteNoFuso, somarDias } from '../../utils/datas';
import { agora } from '../../utils/relogio';
import { criarAleatorio, inteiro, sortear } from './gerador';
import { semearMedicos } from './medicos';
import { semearPacientes } from './pacientes';

/** Prefixo das consultas fixas de hoje (podem cair fora da agenda num fim de semana). */
export const PREFIXO_FIXAS = 'con-hoje-';

const FIXAS: { hora: string; pacienteId: string; medicoId: string; status: StatusConsulta }[] = [
  {
    hora: '09:00',
    pacienteId: 'pac-joao-pereira',
    medicoId: 'med-paulo-mendes',
    status: 'concluida',
  },
  {
    hora: '10:30',
    pacienteId: 'pac-mariana-alves',
    medicoId: 'med-fernanda-lima',
    status: 'agendada',
  },
  {
    hora: '12:00',
    pacienteId: 'pac-carlos-santos',
    medicoId: 'med-beatriz-nogueira',
    status: 'agendada',
  },
  {
    hora: '16:00',
    pacienteId: 'pac-daniel-oliveira',
    medicoId: 'med-helena-duarte',
    status: 'cancelada',
  },
];

const MOTIVOS = [
  'Dor no peito ao fazer esforço',
  'Retorno com exames',
  'Dor de cabeça frequente',
  'Check-up anual',
  'Dor no joelho direito',
  'Febre há três dias',
  'Acompanhamento de pressão alta',
  undefined,
  undefined,
];
const MOTIVOS_CANCELAMENTO = [
  'Paciente pediu para remarcar',
  'Médico em congresso',
  'Paciente sem transporte',
];

const QUANTIDADE_SORTEADAS = 36;

const somaCodigos = (texto: string) =>
  [...texto].reduce((soma, ch, i) => soma + ch.charCodeAt(0) * (i + 1), 0);
const DIA_MS = 86_400_000;

export function semearConsultas(): Consulta[] {
  const rand = criarAleatorio(4242);
  const momento = agora();
  const hoje = hojeNoFuso();
  const medicos = semearMedicos().filter((m) => m.ativo);
  const pacientes = semearPacientes().filter((p) => p.ativo);
  const criancas = pacientes.filter((p) => idade(p.dataNascimento, hoje) < 18);
  const adultos = pacientes.filter((p) => idade(p.dataNascimento, hoje) >= 18);

  const consultas: Consulta[] = [];
  const ocupMedico = new Map<string, Intervalo[]>();
  const ocupPaciente = new Map<string, Intervalo[]>();
  const ocupacao = (mapa: Map<string, Intervalo[]>, id: string) => mapa.get(id) ?? [];

  function statusPara(inicio: string, fim: string, pedido?: StatusConsulta): StatusConsulta {
    const comecou = new Date(inicio).getTime() <= momento.getTime();
    const terminou = new Date(fim).getTime() <= momento.getTime();
    if (pedido) return pedido === 'cancelada' || comecou ? pedido : 'agendada';
    if (!terminou) return rand() < 0.88 ? 'agendada' : 'cancelada';
    const r = rand();
    return r < 0.7 ? 'concluida' : r < 0.82 ? 'faltou' : 'cancelada';
  }

  function criar(
    id: string,
    medico: Medico,
    paciente: Paciente,
    inicio: string,
    pedido?: StatusConsulta,
  ) {
    const duracaoMin = medico.disponibilidade.duracaoPadraoMin;
    const intervalo = intervaloDe(inicio, duracaoMin);
    const fim = new Date(intervalo.fim).toISOString();
    const status = statusPara(inicio, fim, pedido);
    // Agendada de 1 a 10 dias antes; se isso cair no futuro, um pouco antes de "agora"
    // (recuo derivado do id, sem consumir o sorteio, para não mudar os demais dados).
    const recuoMs = (30 + ((somaCodigos(id) * 37) % (3 * 24 * 60))) * 60_000;
    const criadoEm = new Date(
      Math.min(intervalo.inicio - inteiro(rand, 1, 10) * DIA_MS, momento.getTime() - recuoMs),
    ).toISOString();

    const eventos: EventoConsulta[] = [{ tipo: 'agendada', em: criadoEm }];
    let motivoCancelamento: string | undefined;
    if (status === 'cancelada') {
      motivoCancelamento = sortear(rand, MOTIVOS_CANCELAMENTO);
      // Cancelada até 1 h antes; se isso cair no futuro, um pouco antes de "agora".
      const em = new Date(Math.min(intervalo.inicio - 3_600_000, momento.getTime() - recuoMs / 3));
      eventos.push({
        tipo: 'cancelada',
        em: new Date(Math.max(em.getTime(), new Date(criadoEm).getTime())).toISOString(),
        detalhe: motivoCancelamento,
      });
    } else if (status === 'concluida' || status === 'faltou') {
      eventos.push({
        tipo: status,
        em: new Date(Math.min(intervalo.fim, momento.getTime())).toISOString(),
      });
    }

    const motivo = sortear(rand, MOTIVOS);
    consultas.push({
      id,
      criadoEm,
      atualizadoEm: eventos[eventos.length - 1].em,
      versao: eventos.length,
      pacienteId: paciente.id,
      medicoId: medico.id,
      departamentoId: medico.departamentoId,
      inicio,
      duracaoMin,
      tipo: sortear(rand, TIPOS_CONSULTA),
      status,
      ...(motivo ? { motivo } : {}),
      ...(motivoCancelamento ? { motivoCancelamento } : {}),
      eventos,
    });
    ocupMedico.set(medico.id, [...ocupacao(ocupMedico, medico.id), intervalo]);
    ocupPaciente.set(paciente.id, [...ocupacao(ocupPaciente, paciente.id), intervalo]);
  }

  // 1. As quatro de hoje que aparecem no Painel.
  for (const f of FIXAS) {
    const medico = medicos.find((m) => m.id === f.medicoId)!;
    const paciente = pacientes.find((p) => p.id === f.pacienteId)!;
    const inicio = instanteNoFuso(hoje, f.hora).toISOString();
    criar(`${PREFIXO_FIXAS}${f.hora.replace(':', '')}`, medico, paciente, inicio, f.status);
  }

  // 2. Sorteadas em horários válidos.
  for (let tentativa = 0, n = 0; n < QUANTIDADE_SORTEADAS && tentativa < 2000; tentativa++) {
    const medico = sortear(rand, medicos);
    const dia = somarDias(hoje, inteiro(rand, -7, 7));
    if (!atendeNoDia(medico.disponibilidade, dia)) continue;

    const paciente = sortear(rand, medico.departamentoId === 'pediatria' ? criancas : adultos);
    const livres = gerarHorarios({
      disponibilidade: medico.disponibilidade,
      data: dia,
      duracaoMin: medico.disponibilidade.duracaoPadraoMin,
      ocupacoesMedico: ocupacao(ocupMedico, medico.id),
      ocupacoesPaciente: ocupacao(ocupPaciente, paciente.id),
      agora: new Date(0), // passado também vale: o histórico precisa de consultas antigas
    }).filter((h) => h.livre);
    if (livres.length === 0) continue;

    n++;
    criar(`con-${String(n).padStart(3, '0')}`, medico, paciente, sortear(rand, livres).inicio);
  }

  // 3. Duas concluídas recentes ficam sem registro → "Aguardando registro" (R-C7).
  const limite = momento.getTime() - 3 * DIA_MS;
  const pendentes = consultas
    .filter((c) => !c.id.startsWith(PREFIXO_FIXAS) && c.status === 'concluida')
    .filter((c) => new Date(c.inicio).getTime() >= limite)
    .slice(0, 2);
  for (const c of pendentes) {
    c.status = 'agendada';
    c.eventos = c.eventos.slice(0, 1);
    c.versao = 1;
    c.atualizadoEm = c.criadoEm;
  }

  return consultas.sort((a, b) => a.inicio.localeCompare(b.inicio));
}
