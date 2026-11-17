/** Fase 28 — Nomes dos perfis (à parte de `acesso.ts`: o cabeçalho usa em toda tela). */
import type { Perfil } from '../../permissoes';

export const nomesPerfis = {
  administrador: 'Administrador',
  recepcao: 'Recepção',
  enfermagem: 'Enfermagem',
  medico: 'Médico',
  nir: 'NIR',
  farmacia: 'Farmácia',
  gestao: 'Gestão',
} satisfies Record<Perfil, string>;
