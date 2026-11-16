/**
 * Fase 25 — Textos derivados dos cadastros, iguais no navegador e na API (listas, atividades,
 * pendências).
 */
import { t } from '../i18n/pt-BR';
import type { Disponibilidade, Medico, Paciente } from '../types';

/** R-P6: nome social, quando houver, é o nome exibido. */
export const nomeExibicaoPaciente = (p: Pick<Paciente, 'nome' | 'nomeSocial'>) =>
  p.nomeSocial || p.nome;

export const nomeExibicaoMedico = (m: Pick<Medico, 'tratamento' | 'nome'>) =>
  `${m.tratamento} ${m.nome}`;

/** "Seg a Sex · 08:00–17:00" ou "Seg, Qua, Sex · 08:00–12:00". */
export function resumirDisponibilidade(d: Disponibilidade): string {
  const dias = [...d.diasSemana].sort((a, b) => a - b);
  const nomes = t.diasSemanaCurto;
  const consecutivos =
    dias.length >= 3 && dias.every((dia, i) => i === 0 || dia === dias[i - 1]! + 1);
  const texto = consecutivos
    ? t.diasAte(nomes[dias[0]!], nomes[dias[dias.length - 1]!])
    : dias.map((dia) => nomes[dia]).join(', ');
  return `${texto} · ${d.inicio}–${d.fim}`;
}
