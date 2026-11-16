/**
 * Fase 25 — Cliente HTTP dos cadastros e da agenda, com **as mesmas assinaturas** dos serviços
 * do navegador (`apps/web/src/services/pacientes.ts`, `medicos.ts`, `consultas.ts`…).
 *
 * - Nos testes da API (25.T.1), o transporte é o `inject` do Fastify: os testes de serviço do
 *   navegador rodam, com as mesmas asserções, contra a API e o banco.
 * - Na Fase 27, o transporte passa a ser o `fetch`, e os serviços do navegador chamam este
 *   cliente (BL-01.7).
 *
 * Os erros voltam como as classes de sempre (`erroDeResposta`).
 */
import type { EntradaAgendamento } from '../schemas/consulta';
import type { EntradaMedico } from '../schemas/medico';
import type { EntradaPaciente } from '../schemas/paciente';
import type { PendenciaModulo } from '../erros';
import type { DepartamentoBase } from '../config/departamentos';
import type {
  Atividade,
  Consulta,
  ConsultaDetalhada,
  Disponibilidade,
  FiltrosAgenda,
  FiltrosMedicos,
  FiltrosPacientes,
  HorarioAgenda,
  Medico,
  MedicoResumo,
  Paciente,
  PacienteResumo,
  Paginado,
  UF,
} from '../types';
import { erroDeResposta } from '../contrato/erros';

export interface RequisicaoApi {
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE';
  caminho: string;
  consulta?: Record<string, string | number | boolean | undefined>;
  corpo?: unknown;
  /** Vai no `If-Match` (R-API1). */
  versao?: number;
}

export interface RespostaApi {
  status: number;
  corpo: unknown;
}

/** Quem leva a requisição até a API (`fetch` no navegador, `inject` nos testes). */
export type TransporteApi = (requisicao: RequisicaoApi) => Promise<RespostaApi>;

export function criarChamada(transporte: TransporteApi) {
  return async function chamar<T>(requisicao: RequisicaoApi): Promise<T> {
    const consulta = Object.fromEntries(
      Object.entries(requisicao.consulta ?? {}).filter(([, v]) => v !== undefined && v !== ''),
    );
    const r = await transporte({ ...requisicao, consulta });
    if (r.status >= 400) throw erroDeResposta(r.status, r.corpo);
    return r.corpo as T;
  };
}

const enc = encodeURIComponent;

export function criarClienteCadastros(transporte: TransporteApi) {
  const chamar = criarChamada(transporte);

  // ─────────── pacientes ───────────
  const pacienteComCpf = (cpf: string, ignorarId?: string) =>
    chamar<{ id: string; nomeExibicao: string } | null>({
      metodo: 'GET',
      caminho: `/pacientes/cpf/${enc(cpf)}`,
      consulta: { ignorarId },
    });

  const pacientes = {
    listarPacientes: (filtros: FiltrosPacientes = {}) =>
      chamar<Paginado<PacienteResumo>>({
        metodo: 'GET',
        caminho: '/pacientes',
        consulta: { ...filtros },
      }),
    obterPaciente: (id: string) =>
      chamar<Paciente>({ metodo: 'GET', caminho: `/pacientes/${enc(id)}` }),
    pacienteComCpf,
    cpfDisponivel: async (cpf: string, ignorarId?: string) =>
      (await pacienteComCpf(cpf, ignorarId)) === null,
    pacienteTemConsultas: async (id: string) =>
      (
        await chamar<{ temConsultas: boolean }>({
          metodo: 'GET',
          caminho: `/pacientes/${enc(id)}/tem-consultas`,
        })
      ).temConsultas,
    consultasFuturasDoPaciente: (id: string) =>
      chamar<Consulta[]>({ metodo: 'GET', caminho: `/pacientes/${enc(id)}/consultas-futuras` }),
    pendenciasDoPaciente: (id: string) =>
      chamar<PendenciaModulo[]>({ metodo: 'GET', caminho: `/pacientes/${enc(id)}/pendencias` }),
    criarPaciente: (entrada: EntradaPaciente) =>
      chamar<Paciente>({ metodo: 'POST', caminho: '/pacientes', corpo: entrada }),
    atualizarPaciente: (id: string, entrada: EntradaPaciente, versao: number) =>
      chamar<Paciente>({ metodo: 'PUT', caminho: `/pacientes/${enc(id)}`, corpo: entrada, versao }),
    inativarPaciente: async (id: string, motivo?: string) =>
      (
        await chamar<{ consultasCanceladas: number }>({
          metodo: 'POST',
          caminho: `/pacientes/${enc(id)}/inativar`,
          corpo: { motivo },
        })
      ).consultasCanceladas,
    reativarPaciente: (id: string) =>
      chamar<Paciente>({ metodo: 'POST', caminho: `/pacientes/${enc(id)}/reativar` }),
    excluirPaciente: async (id: string) => {
      await chamar<null>({ metodo: 'DELETE', caminho: `/pacientes/${enc(id)}` });
    },
  };

  // ─────────── médicos ───────────
  const medicoComCrm = (numero: string, uf: UF, ignorarId?: string) =>
    chamar<{ id: string; nomeExibicao: string } | null>({
      metodo: 'GET',
      caminho: `/medicos/crm/${enc(uf)}/${enc(numero)}`,
      consulta: { ignorarId },
    });

  const medicos = {
    listarDepartamentos: () =>
      chamar<DepartamentoBase[]>({ metodo: 'GET', caminho: '/departamentos' }),
    listarMedicos: (filtros: FiltrosMedicos = {}) =>
      chamar<Paginado<MedicoResumo>>({
        metodo: 'GET',
        caminho: '/medicos',
        consulta: { ...filtros },
      }),
    obterMedico: (id: string) => chamar<Medico>({ metodo: 'GET', caminho: `/medicos/${enc(id)}` }),
    medicoComCrm,
    crmDisponivel: async (numero: string, uf: UF, ignorarId?: string) =>
      (await medicoComCrm(numero, uf, ignorarId)) === null,
    consultasFuturasDoMedico: (id: string) =>
      chamar<Consulta[]>({ metodo: 'GET', caminho: `/medicos/${enc(id)}/consultas-futuras` }),
    consultasAfetadas: (id: string, nova: Disponibilidade) =>
      chamar<Consulta[]>({
        metodo: 'POST',
        caminho: `/medicos/${enc(id)}/consultas-afetadas`,
        corpo: nova,
      }),
    pendenciasDoMedico: (id: string) =>
      chamar<PendenciaModulo[]>({ metodo: 'GET', caminho: `/medicos/${enc(id)}/pendencias` }),
    criarMedico: (entrada: EntradaMedico) =>
      chamar<Medico>({ metodo: 'POST', caminho: '/medicos', corpo: entrada }),
    atualizarMedico: (id: string, entrada: EntradaMedico, versao: number) =>
      chamar<{ medico: Medico; consultasForaDoHorario: number }>({
        metodo: 'PUT',
        caminho: `/medicos/${enc(id)}`,
        corpo: entrada,
        versao,
      }),
    inativarMedico: (id: string, motivo?: string) =>
      chamar<Medico>({
        metodo: 'POST',
        caminho: `/medicos/${enc(id)}/inativar`,
        corpo: { motivo },
      }),
    reativarMedico: (id: string) =>
      chamar<Medico>({ metodo: 'POST', caminho: `/medicos/${enc(id)}/reativar` }),
  };

  // ─────────── agenda ───────────
  const grade = (
    medicoId: string,
    data: string,
    duracaoMin: number,
    pacienteId?: string,
    ignorarConsultaId?: string,
  ) => ({ medicoId, data, duracaoMin, pacienteId, ignorarConsultaId });

  const consultas = {
    listarConsultas: (filtros: FiltrosAgenda = {}) =>
      chamar<ConsultaDetalhada[]>({
        metodo: 'GET',
        caminho: '/consultas',
        consulta: { ...filtros },
      }),
    obterConsulta: (id: string) =>
      chamar<ConsultaDetalhada>({ metodo: 'GET', caminho: `/consultas/${enc(id)}` }),
    horariosLivres: (...args: Parameters<typeof grade>) =>
      chamar<HorarioAgenda[]>({
        metodo: 'GET',
        caminho: '/agenda/horarios',
        consulta: grade(...args),
      }),
    proximoDiaDisponivel: async (...args: Parameters<typeof grade>) =>
      (
        await chamar<{ data: string | null }>({
          metodo: 'GET',
          caminho: '/agenda/proximo-dia',
          consulta: grade(...args),
        })
      ).data,
    agendarConsulta: (entrada: EntradaAgendamento) =>
      chamar<ConsultaDetalhada>({ metodo: 'POST', caminho: '/consultas', corpo: entrada }),
    reagendarConsulta: (id: string, entrada: EntradaAgendamento, versao: number) =>
      chamar<ConsultaDetalhada>({
        metodo: 'PUT',
        caminho: `/consultas/${enc(id)}`,
        corpo: entrada,
        versao,
      }),
    cancelarConsulta: (id: string, motivo: string, versao: number) =>
      chamar<ConsultaDetalhada>({
        metodo: 'POST',
        caminho: `/consultas/${enc(id)}/cancelar`,
        corpo: { motivo },
        versao,
      }),
    concluirConsulta: (id: string) =>
      chamar<ConsultaDetalhada>({ metodo: 'POST', caminho: `/consultas/${enc(id)}/concluir` }),
    marcarFalta: (id: string) =>
      chamar<ConsultaDetalhada>({ metodo: 'POST', caminho: `/consultas/${enc(id)}/faltou` }),
    registrarEmLote: async (ids: string[], acao: 'concluida' | 'faltou') =>
      (
        await chamar<{ total: number }>({
          metodo: 'POST',
          caminho: '/consultas/lote',
          corpo: { ids, acao },
        })
      ).total,
  };

  // ─────────── Painel ───────────
  const painel = {
    listarAtividades: ({ limite = 10 }: { limite?: number } = {}) =>
      chamar<Atividade[]>({ metodo: 'GET', caminho: '/atividades', consulta: { limite } }),
    indicadoresPainel: () =>
      chamar<{ pacientesAtivos: number; medicosPlantao: number }>({
        metodo: 'GET',
        caminho: '/indicadores/cadastros',
      }),
  };

  return { ...pacientes, ...medicos, ...consultas, ...painel };
}

export type ClienteCadastros = ReturnType<typeof criarClienteCadastros>;
