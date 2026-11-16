import { NOMES_OPERACOES } from '../services/nomes-colecoes-operacoes';
import type { SituacaoResumida } from '../services/situacao-hospitalar';
import { useColecao } from './useColecao';

/**
 * 20.10 e 20.11: situação e histórico hospitalar nos cadastros. O serviço vem com `import()`,
 * como os indicadores do Painel (D20), para os detalhes de paciente e médico não carregarem
 * os módulos operacionais inteiros.
 */
const carregar = () => import('../services/situacao-hospitalar');

const COLECOES = [
  NOMES_OPERACOES.internacoes,
  NOMES_OPERACOES.atendimentos,
  NOMES_OPERACOES.solicitacoes,
  NOMES_OPERACOES.dispensacoes,
  NOMES_OPERACOES.leitos,
];

export const useHistoricoPaciente = (pacienteId: string) =>
  useColecao(
    () =>
      carregar().then((m) =>
        Promise.all([m.situacaoHospitalar(pacienteId), m.historicoHospitalar(pacienteId)]).then(
          ([situacao, historico]) => ({ situacao, historico }),
        ),
      ),
    [pacienteId],
    COLECOES,
  );

export const useVinculosMedico = (medicoId: string) =>
  useColecao(
    () => carregar().then((m) => m.vinculosDoMedico(medicoId)),
    [medicoId],
    [...COLECOES, 'pacientes'],
  );

/** R-X8: situação resumida para o aviso do agendamento (vazia sem paciente). */
export const useSituacaoResumida = (pacienteId: string) =>
  useColecao(
    () =>
      pacienteId
        ? carregar().then((m) => m.situacaoHospitalar(pacienteId))
        : Promise.resolve<SituacaoResumida>({}),
    [pacienteId],
    COLECOES,
  );
