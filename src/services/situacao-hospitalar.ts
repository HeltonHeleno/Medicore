/**
 * R-X8: situação hospitalar de um paciente, para os cadastros (detalhe do paciente, aviso
 * no agendamento) e para a etiqueta do `ComboboxPaciente` ("Internado em UTI-07").
 */
import { repoAtendimentos, repoInternacoes, repoLeitos } from './colecoes-operacoes';
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
