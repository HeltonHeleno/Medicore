/**
 * R-X8: situação hospitalar de um paciente, para os cadastros (detalhe do paciente, aviso
 * no agendamento) e para a etiqueta do `ComboboxPaciente` ("Internado em UTI-07").
 */
import { repoAtendimentos, repoInternacoes, repoLeitos } from './colecoes-operacoes';
import { to } from '../i18n/pt-BR/operacoes';
import { executar } from './infra';
import { situacaoDoPaciente } from './operacoes-comum';

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

export const situacaoHospitalar = (pacienteId: string): Promise<SituacaoResumida> =>
  executar(() => resumir(pacienteId));

/** Situação de todos os pacientes internados ou em atendimento (id do paciente → situação). */
export const situacoesHospitalares = (): Promise<Record<string, SituacaoResumida>> =>
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
export const etiquetasHospitalares = (): Promise<Record<string, string>> =>
  situacoesHospitalares().then((mapa) =>
    Object.fromEntries(
      Object.entries(mapa).flatMap(([id, s]) => {
        const e = etiquetaSituacao(s);
        return e ? [[id, e]] : [];
      }),
    ),
  );
