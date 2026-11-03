/**
 * Ajudantes dos testes dos módulos operacionais (Fase 15).
 */
import { repoMedicos, repoPacientes } from '../../services/colecoes';
import {
  garantirSemeadura,
  repoAtendimentos,
  repoInternacoes,
  repoLeitos,
  repoSolicitacoes,
  retratoAtual,
} from '../../services/colecoes-operacoes';
import type { Leito, Paciente, SetorId } from '../../types';
import { verificarConsistencia } from '../../utils/consistencia';
import { idade } from '../../utils/datas';
import { agora } from '../../utils/relogio';
import { prepararServicos } from './servicos';

/** Relógio fixo, armazenamento limpo e os dados de exemplo dos módulos já semeados. */
export function prepararOperacoes(instante: string) {
  prepararServicos(instante);
  beforeEach(() => garantirSemeadura());
}

/** 15.8.3: falha mostrando as violações das invariantes INV-1 a INV-10. */
export function esperarConsistente() {
  const violacoes = verificarConsistencia(retratoAtual(), agora().getTime());
  expect(violacoes, JSON.stringify(violacoes, null, 1)).toEqual([]);
}

/** Paciente ativo sem internação ativa, sem atendimento aberto e sem pedido de leito. */
export function pacienteLivre(
  opcoes: { menor?: boolean; comAlergia?: string; pular?: number } = {},
): Paciente {
  const ocupados = new Set([
    ...repoInternacoes
      .todos()
      .filter((i) => i.status === 'ativa')
      .map((i) => i.pacienteId),
    ...repoAtendimentos
      .todos()
      .filter((a) => a.status !== 'encerrado' && a.pacienteId)
      .map((a) => a.pacienteId!),
    ...repoSolicitacoes
      .todos()
      .filter((s) => s.status === 'pendente' || s.status === 'reservada')
      .map((s) => s.pacienteId),
  ]);
  const lista = repoPacientes
    .todos()
    .filter(
      (p) =>
        p.ativo &&
        !ocupados.has(p.id) &&
        (opcoes.menor ? idade(p.dataNascimento) < 18 : idade(p.dataNascimento) >= 18) &&
        (opcoes.comAlergia === undefined || (p.alergias ?? '').includes(opcoes.comAlergia)),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const p = lista[opcoes.pular ?? 0];
  if (!p) throw new Error('Sem paciente livre nos dados de exemplo');
  return p;
}

/** Leito livre de um setor e perfil (o primeiro pelo código). */
export function leitoLivre(
  setorId: SetorId,
  opcoes: { perfil?: Leito['perfil']; isolamento?: boolean; pular?: number } = {},
): Leito {
  const lista = repoLeitos
    .todos()
    .filter(
      (l) =>
        l.setorId === setorId &&
        l.status === 'livre' &&
        l.perfil === (opcoes.perfil ?? 'adulto') &&
        (opcoes.isolamento === undefined || l.isolamento === opcoes.isolamento),
    )
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
  const l = lista[opcoes.pular ?? 0];
  if (!l) throw new Error(`Sem leito livre em ${setorId}`);
  return l;
}

export const leitoPorCodigo = (codigo: string) =>
  repoLeitos.todos().find((l) => l.codigo === codigo)!;

/** Médico clínico ativo (responsável pelas internações de exemplo). */
export const medicoClinico = () => repoMedicos.obter('med-helena-duarte')!;
export const MEDICO_INATIVO = 'med-sergio-tavares';
export const MEDICO_EMERGENCIA = 'med-marcos-ribeiro';

/**
 * Simula "outra aba": grava direto no localStorage, sem passar pelo repositório.
 * A próxima transação relê a coleção (M34).
 */
export function gravarComoOutraAba<T extends { id: string }>(
  colecao: string,
  mudar: (itens: T[]) => T[],
) {
  const chave = `medicore:${colecao}:v1`;
  const itens = JSON.parse(localStorage.getItem(chave)!) as T[];
  localStorage.setItem(chave, JSON.stringify(mudar(itens)));
}

export const agoraIso = () => agora().toISOString();
