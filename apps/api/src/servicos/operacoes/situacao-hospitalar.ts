/**
 * R-X8: situação hospitalar de um paciente, para os cadastros (detalhe do paciente, aviso
 * no agendamento) e para a etiqueta do `ComboboxPaciente` ("Internado em UTI-07").
 *
 * Fase 26: cópia de `apps/web/src/services/situacao-hospitalar.ts` (que continua em uso no navegador até a
 * Fase 27), rodando sobre a unidade de trabalho da API (`unidade.ts`, R-API3). Mudou só o que é do
 * servidor: as leituras de tabelas que crescem sempre (consultas, movimentações) e a versão atual no 412.
 */
import { repoAtendimentos, repoDispensacoes, repoInternacoes, repoLeitos } from './repos';
import type { StatusAtendimento, TipoAlta, TipoDesfecho } from '@medicore/dominio/types';
import { agora } from '@medicore/dominio/utils/relogio';
import { to } from '@medicore/dominio/i18n/pt-BR/operacoes';
import { executar } from './repos';
import { atendimentoAberto, nomePaciente, situacaoDoPaciente } from './operacoes-comum';

export interface SituacaoResumida {
  internacao?: { id: string; leitoCodigo: string };
  atendimento?: { id: string; numero: string };
  solicitacao?: { id: string; status: string };
}

function resumir(pacienteId: string): SituacaoResumida {
  const s = situacaoDoPaciente(pacienteId);
  return {
    ...(s.internacao
      ? {
          internacao: {
            id: s.internacao.id,
            leitoCodigo: repoLeitos.obter(s.internacao.leitoId)?.codigo ?? '—',
          },
        }
      : {}),
    ...(s.atendimento
      ? { atendimento: { id: s.atendimento.id, numero: s.atendimento.numero } }
      : {}),
    ...(s.solicitacao
      ? { solicitacao: { id: s.solicitacao.id, status: s.solicitacao.status } }
      : {}),
  };
}

export const situacaoHospitalar = (pacienteId: string): SituacaoResumida =>
  executar(() => resumir(pacienteId));

/** Situação de todos os pacientes internados ou em atendimento (id do paciente → situação). */
export const situacoesHospitalares = (): Record<string, SituacaoResumida> =>
  executar(() => {
    const ids = new Set<string>();
    for (const i of repoInternacoes.todos()) if (i.status === 'ativa') ids.add(i.pacienteId);
    for (const a of repoAtendimentos.todos())
      if (a.status !== 'encerrado' && a.pacienteId) ids.add(a.pacienteId);
    return Object.fromEntries([...ids].map((id) => [id, resumir(id)]));
  });

/** Texto curto da situação: "Internado em UTI-07" ou "Emergência E-0039". */
export function etiquetaSituacao(s: SituacaoResumida): string | undefined {
  if (s.internacao) return to.etiquetaInternado(s.internacao.leitoCodigo);
  if (s.atendimento) return to.etiquetaEmergencia(s.atendimento.numero);
  return undefined;
}

/** Etiquetas de todos os pacientes internados ou em atendimento (id → texto), para o `ComboboxPaciente`. */
export const etiquetasHospitalares = (): Record<string, string> =>
  Object.fromEntries(
    Object.entries(situacoesHospitalares()).flatMap(([id, s]) => {
      const e = etiquetaSituacao(s);
      return e ? [[id, e]] : [];
    }),
  );

/** 20.10: janelas do histórico no detalhe do paciente. */
export const DIAS_HISTORICO_ATENDIMENTOS = 7;
export const DIAS_HISTORICO_DISPENSACOES = 30;

export interface HistoricoHospitalar {
  internacoes: {
    id: string;
    leitoCodigo: string;
    inicio: string;
    fim?: string;
    tipoAlta?: TipoAlta;
    arquivado: boolean;
  }[];
  atendimentos: {
    id: string;
    numero: string;
    chegadaEm: string;
    aberto: boolean;
    desfecho?: TipoDesfecho;
    arquivado: boolean;
  }[];
  dispensacoes: {
    id: string;
    em: string;
    itens: number;
    estornada: boolean;
    arquivado: boolean;
  }[];
}

const recentes = <T>(lista: T[], data: (x: T) => string) =>
  [...lista].sort((a, b) => data(b).localeCompare(data(a)));

/**
 * 20.10: internações (todas as que ficaram), atendimentos dos últimos 7 dias (e o aberto) e
 * dispensações dos últimos 30 dias, do mais recente para o mais antigo. Registros arquivados
 * (A15) vêm marcados, para a tela mostrar "registro arquivado" no lugar do link.
 */
export const historicoHospitalar = (pacienteId: string): HistoricoHospitalar =>
  executar(() => {
    const agoraMs = agora().getTime();
    const desde = (dias: number) => new Date(agoraMs - dias * 86_400_000).toISOString();
    const limiteAtendimentos = desde(DIAS_HISTORICO_ATENDIMENTOS);
    const limiteDispensacoes = desde(DIAS_HISTORICO_DISPENSACOES);
    const iso = (x: string) => new Date(x).toISOString();
    return {
      internacoes: recentes(
        repoInternacoes.todos().filter((i) => i.pacienteId === pacienteId),
        (i) => iso(i.inicio),
      ).map((i) => ({
        id: i.id,
        leitoCodigo: repoLeitos.obter(i.leitoId)?.codigo ?? '—',
        inicio: i.inicio,
        ...(i.alta ? { fim: i.alta.em, tipoAlta: i.alta.tipo } : {}),
        arquivado: !!i.arquivado,
      })),
      atendimentos: recentes(
        repoAtendimentos
          .todos()
          .filter(
            (a) =>
              a.pacienteId === pacienteId &&
              (a.status !== 'encerrado' || iso(a.chegadaEm) >= limiteAtendimentos),
          ),
        (a) => iso(a.chegadaEm),
      ).map((a) => ({
        id: a.id,
        numero: a.numero,
        chegadaEm: a.chegadaEm,
        aberto: a.status !== 'encerrado',
        ...(a.desfecho ? { desfecho: a.desfecho.tipo } : {}),
        arquivado: !!a.arquivado,
      })),
      dispensacoes: recentes(
        repoDispensacoes
          .todos()
          .filter((d) => d.pacienteId === pacienteId && iso(d.em) >= limiteDispensacoes),
        (d) => iso(d.em),
      ).map((d) => ({
        id: d.id,
        em: d.em,
        itens: d.itens.length,
        estornada: d.status === 'estornada',
        arquivado: !!d.arquivado,
      })),
    };
  });

export interface VinculosMedico {
  internacoes: { id: string; pacienteNome: string; leitoCodigo: string; inicio: string }[];
  atendimentos: {
    id: string;
    numero: string;
    pacienteNome: string;
    status: StatusAtendimento;
    chegadaEm: string;
  }[];
}

/** 20.11: internações ativas sob responsabilidade do médico e atendimentos em curso com ele. */
export const vinculosDoMedico = (medicoId: string): VinculosMedico =>
  executar(() => ({
    internacoes: repoInternacoes
      .todos()
      .filter((i) => i.medicoResponsavelId === medicoId && i.status === 'ativa')
      .map((i) => ({
        id: i.id,
        pacienteNome: nomePaciente(i.pacienteId),
        leitoCodigo: repoLeitos.obter(i.leitoId)?.codigo ?? '—',
        inicio: i.inicio,
      }))
      .sort((a, b) => a.leitoCodigo.localeCompare(b.leitoCodigo, 'pt-BR', { numeric: true })),
    atendimentos: repoAtendimentos
      .todos()
      .filter((a) => a.medicoId === medicoId && atendimentoAberto(a))
      .map((a) => ({
        id: a.id,
        numero: a.numero,
        pacienteNome: a.pacienteId ? nomePaciente(a.pacienteId) : (a.provisorio?.descricao ?? '—'),
        status: a.status,
        chegadaEm: a.chegadaEm,
      }))
      .sort((a, b) => a.numero.localeCompare(b.numero)),
  }));
