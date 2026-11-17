/**
 * Fase 28 (BL-02.6, D30) — Perfis e permissões por **ação** (RBAC). É a matriz da seção
 * "Perfis de acesso" de `PLANO_MELHORIAS_MEDICORE.md`, usada pela API (confere cada rota, negado por
 * padrão) e pelo navegador (esconde o que o perfil não pode fazer).
 *
 * Um usuário pode ter mais de um perfil: vale a soma das permissões.
 */

export const PERFIS = [
  'administrador',
  'recepcao',
  'enfermagem',
  'medico',
  'nir',
  'farmacia',
  'gestao',
] as const;
export type Perfil = (typeof PERFIS)[number];

/** R-AU2: perfis que exigem o segundo fator (TOTP). */
export const PERFIS_COM_MFA: readonly Perfil[] = ['administrador', 'gestao'];

export const ACOES = [
  /** Painel, listas e detalhes (somente leitura). */
  'ver',
  /** Usuários, perfis e parâmetros (BL-02.5, BL-50). */
  'usuarios.administrar',
  /** Cadastrar, editar, inativar, reativar e excluir paciente (P1–P5). */
  'pacientes.editar',
  /** Ver o CPF completo (sem a máscara). */
  'pacientes.verCpf',
  /** Cadastrar e editar médico; disponibilidade (P6–P8, BL-10). */
  'medicos.editar',
  /** Agendar, reagendar, cancelar e registrar consultas (P9–P13). */
  'agenda.editar',
  /** Chegada e identificação na emergência (E1, E7). */
  'emergencia.chegada',
  /** Triagem e reavaliação (E2, E10). */
  'emergencia.triagem',
  /** Chamar, observação, desfecho, pedir leito (E3–E6). */
  'emergencia.atendimento',
  /** Reabrir atendimento (E9). */
  'emergencia.reabrir',
  /** Internar, transferir, editar a internação (L1, L2, L7). */
  'internacao.editar',
  /** Alta e desfazer alta (L3, L8). */
  'internacao.alta',
  /** Higienização (L4). */
  'leitos.higienizacao',
  /** Bloquear leito, pedidos de leito e reservas (L5, L6, L9). */
  'leitos.bloqueio',
  /** Catálogo, lotes, entrada, ajuste, descarte, bloqueio de lote (F1, F2, F5–F7, F9). */
  'farmacia.estoque',
  /** Dispensar, devolver, estornar (F3, F4, F8). */
  'farmacia.dispensacao',
  /** Consultar a auditoria (BL-03, Fase 29). */
  'auditoria.ver',
  /** Atender o pedido do titular: acessos e cópia dos dados do paciente (BL-03.4). */
  'titular.atender',
  /** Relatórios e análises (BL-40, BL-42). */
  'relatorios.ver',
] as const;
export type Acao = (typeof ACOES)[number];

const TODOS = PERFIS;

/** A matriz. Cada ação lista os perfis que podem fazê-la. */
export const PERMISSOES: Record<Acao, readonly Perfil[]> = {
  ver: TODOS,
  'usuarios.administrar': ['administrador'],
  'pacientes.editar': ['administrador', 'recepcao', 'enfermagem', 'medico'],
  'pacientes.verCpf': ['administrador', 'recepcao', 'medico'],
  'medicos.editar': ['administrador', 'recepcao', 'gestao'],
  'agenda.editar': ['administrador', 'recepcao', 'medico'],
  'emergencia.chegada': ['administrador', 'recepcao', 'enfermagem'],
  'emergencia.triagem': ['enfermagem', 'medico'],
  'emergencia.atendimento': ['enfermagem', 'medico'],
  'emergencia.reabrir': ['enfermagem', 'medico', 'gestao'],
  'internacao.editar': ['medico', 'nir'],
  'internacao.alta': ['medico', 'nir', 'gestao'],
  'leitos.higienizacao': ['enfermagem', 'nir'],
  'leitos.bloqueio': ['nir', 'gestao'],
  'farmacia.estoque': ['farmacia'],
  'farmacia.dispensacao': ['farmacia'],
  'auditoria.ver': ['administrador', 'gestao'],
  'titular.atender': ['administrador'],
  'relatorios.ver': ['administrador', 'farmacia', 'gestao'],
};

/** O usuário (com estes perfis) pode fazer a ação? */
export const pode = (perfis: readonly Perfil[], acao: Acao): boolean =>
  perfis.some((p) => PERMISSOES[acao].includes(p));

/** Exige o segundo fator (R-AU2)? */
export const exigeMfa = (perfis: readonly Perfil[]): boolean =>
  perfis.some((p) => PERFIS_COM_MFA.includes(p));

export const ehPerfil = (valor: unknown): valor is Perfil =>
  typeof valor === 'string' && (PERFIS as readonly string[]).includes(valor);
