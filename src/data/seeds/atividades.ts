/**
 * Linha do tempo de exemplo, derivada do histórico das consultas de exemplo
 * (mesmos nomes e horários que as telas mostram). Só entram eventos já ocorridos.
 */
import { t } from '../../i18n/pt-BR';
import type { Atividade, TipoAtividade, TipoEventoConsulta } from '../../types';
import { agora } from '../../utils/relogio';
import { semearConsultas } from './consultas';
import { semearMedicos } from './medicos';
import { semearPacientes } from './pacientes';

/** Quantas atividades de exemplo manter (as mais recentes). */
const QUANTIDADE = 20;

const TIPOS: Record<TipoEventoConsulta, TipoAtividade> = {
  agendada: 'consulta_agendada',
  reagendada: 'consulta_reagendada',
  concluida: 'consulta_concluida',
  faltou: 'consulta_faltou',
  cancelada: 'consulta_cancelada',
};

export function semearAtividades(): Atividade[] {
  // Um minuto antes de "agora", para que qualquer ação real fique sempre acima.
  const limite = agora().getTime() - 60_000;
  const pacientes = new Map(semearPacientes().map((p) => [p.id, p.nomeSocial || p.nome]));
  const medicos = new Map(semearMedicos().map((m) => [m.id, `${m.tratamento} ${m.nome}`]));
  const txt = t.textosAtividade;

  const atividades: Atividade[] = [];
  for (const consulta of semearConsultas()) {
    const paciente = pacientes.get(consulta.pacienteId) ?? '';
    const medico = medicos.get(consulta.medicoId) ?? '';
    consulta.eventos.forEach((evento, i) => {
      const descricao = {
        agendada: () => txt.consultaAgendada(paciente, medico),
        reagendada: () => txt.consultaReagendada(paciente, medico),
        concluida: () => txt.consultaConcluida(paciente),
        faltou: () => txt.consultaFaltou(paciente),
        cancelada: () => txt.consultaCancelada(paciente),
      }[evento.tipo]();
      atividades.push({
        id: `atv-${consulta.id}-${i}`,
        tipo: TIPOS[evento.tipo],
        descricao,
        em: new Date(Math.min(new Date(evento.em).getTime(), limite)).toISOString(),
        referenciaId: consulta.id,
      });
    });
  }

  return atividades
    .sort((a, b) => b.em.localeCompare(a.em) || b.id.localeCompare(a.id))
    .slice(0, QUANTIDADE);
}
