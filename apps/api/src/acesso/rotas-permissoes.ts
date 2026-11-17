/**
 * Fase 28 (BL-02.6) — Que ação cada rota da API exige. A guarda (`guarda.ts`) confere esta tabela
 * em toda requisição; uma rota de gravação que não está aqui **impede a API de subir** (negado por
 * padrão). As leituras (`GET`) sem linha própria exigem só `ver` (qualquer perfil com sessão).
 *
 * `publica`: sem sessão (saúde, documentação, entrada e as rotas que têm a própria chave).
 */
import type { Acao } from '@medicore/dominio/permissoes';

export type Exigencia = Acao | 'publica';

/** Prefixos públicos: as rotas de acesso cuidam da própria sessão (etapa do MFA, convite…). */
export const PREFIXOS_PUBLICOS = ['/api/v1/auth/', '/api/v1/_teste/', '/api/v1/docs'] as const;

export const ROTAS: Record<string, Exigencia> = {
  'GET /api/v1/saude': 'publica',
  'GET /api/v1/openapi.json': 'publica',
  // A rota das rotinas confere a chave do Cloud Scheduler (Fase 27).
  'POST /api/v1/rotinas/executar': 'publica',

  // Usuários (BL-02.5): até a leitura é só do Administrador.
  'GET /api/v1/usuarios': 'usuarios.administrar',
  'POST /api/v1/usuarios': 'usuarios.administrar',
  'GET /api/v1/usuarios/:id': 'usuarios.administrar',
  'PUT /api/v1/usuarios/:id': 'usuarios.administrar',
  'POST /api/v1/usuarios/:id/desativar': 'usuarios.administrar',
  'POST /api/v1/usuarios/:id/reativar': 'usuarios.administrar',
  'POST /api/v1/usuarios/:id/desbloquear': 'usuarios.administrar',
  'POST /api/v1/usuarios/:id/redefinir-mfa': 'usuarios.administrar',
  'POST /api/v1/usuarios/:id/link': 'usuarios.administrar',

  // Pacientes (P1–P5)
  'POST /api/v1/pacientes': 'pacientes.editar',
  'PUT /api/v1/pacientes/:id': 'pacientes.editar',
  'DELETE /api/v1/pacientes/:id': 'pacientes.editar',
  'POST /api/v1/pacientes/:id/inativar': 'pacientes.editar',
  'POST /api/v1/pacientes/:id/reativar': 'pacientes.editar',

  // Médicos (P6–P8). "Consultas afetadas" é uma pergunta (POST pelo tamanho do corpo).
  'POST /api/v1/medicos': 'medicos.editar',
  'PUT /api/v1/medicos/:id': 'medicos.editar',
  'POST /api/v1/medicos/:id/inativar': 'medicos.editar',
  'POST /api/v1/medicos/:id/reativar': 'medicos.editar',
  'POST /api/v1/medicos/:id/consultas-afetadas': 'medicos.editar',

  // Agenda (P9–P13)
  'POST /api/v1/consultas': 'agenda.editar',
  'POST /api/v1/consultas/lote': 'agenda.editar',
  'PUT /api/v1/consultas/:id': 'agenda.editar',
  'POST /api/v1/consultas/:id/cancelar': 'agenda.editar',
  'POST /api/v1/consultas/:id/concluir': 'agenda.editar',
  'POST /api/v1/consultas/:id/faltou': 'agenda.editar',

  // Emergência (E1–E10)
  'POST /api/v1/atendimentos': 'emergencia.chegada',
  'POST /api/v1/atendimentos/:id/vincular': 'emergencia.chegada',
  'POST /api/v1/atendimentos/:id/triagem': 'emergencia.triagem',
  'POST /api/v1/atendimentos/:id/reavaliacao': 'emergencia.triagem',
  'POST /api/v1/atendimentos/:id/chamar': 'emergencia.atendimento',
  'POST /api/v1/atendimentos/:id/retomar': 'emergencia.atendimento',
  'POST /api/v1/atendimentos/:id/observacao': 'emergencia.atendimento',
  'POST /api/v1/atendimentos/:id/pedir-leito': 'emergencia.atendimento',
  'POST /api/v1/atendimentos/:id/encerrar': 'emergencia.atendimento',
  'POST /api/v1/atendimentos/:id/reabrir': 'emergencia.reabrir',

  // Internação e leitos (L1–L9)
  'POST /api/v1/internacoes': 'internacao.editar',
  'PUT /api/v1/internacoes/:id': 'internacao.editar',
  'POST /api/v1/internacoes/:id/transferir': 'internacao.editar',
  'POST /api/v1/internacoes/:id/alta': 'internacao.alta',
  'POST /api/v1/internacoes/:id/desfazer-alta': 'internacao.alta',
  'POST /api/v1/leitos/higienizacao': 'leitos.higienizacao',
  'POST /api/v1/leitos/:id/reverter-higienizacao': 'leitos.higienizacao',
  'POST /api/v1/leitos/:id/bloquear': 'leitos.bloqueio',
  'POST /api/v1/leitos/:id/desbloquear': 'leitos.bloqueio',
  'POST /api/v1/solicitacoes': 'leitos.bloqueio',
  'POST /api/v1/solicitacoes/:id/reservar': 'leitos.bloqueio',
  'POST /api/v1/solicitacoes/:id/cancelar': 'leitos.bloqueio',
  'POST /api/v1/solicitacoes/:id/cancelar-reserva': 'leitos.bloqueio',

  // Farmácia (F1–F9)
  'POST /api/v1/medicamentos': 'farmacia.estoque',
  'PUT /api/v1/medicamentos/:id': 'farmacia.estoque',
  'POST /api/v1/medicamentos/:id/inativar': 'farmacia.estoque',
  'POST /api/v1/medicamentos/:id/reativar': 'farmacia.estoque',
  'POST /api/v1/lotes': 'farmacia.estoque',
  'POST /api/v1/lotes/descarte': 'farmacia.estoque',
  'POST /api/v1/lotes/:id/ajuste': 'farmacia.estoque',
  'POST /api/v1/lotes/:id/bloquear': 'farmacia.estoque',
  'POST /api/v1/lotes/:id/desbloquear': 'farmacia.estoque',
  'POST /api/v1/dispensacoes': 'farmacia.dispensacao',
  'POST /api/v1/dispensacoes/:id/itens/:indice/devolucao': 'farmacia.dispensacao',
  'POST /api/v1/dispensacoes/:id/estornar': 'farmacia.dispensacao',
};

/** A exigência da rota, ou `undefined` (rota de gravação sem dono: a API não sobe). */
export function exigenciaDaRota(metodo: string, url: string): Exigencia | undefined {
  // Pré-requisição do CORS: responde o próprio plugin, sem dados.
  if (metodo === 'OPTIONS') return 'publica';
  const m = metodo === 'HEAD' ? 'GET' : metodo;
  const exata = ROTAS[`${m} ${url}`];
  if (exata) return exata;
  if (PREFIXOS_PUBLICOS.some((p) => url.startsWith(p) || `${url}/` === p)) return 'publica';
  return m === 'GET' ? 'ver' : undefined;
}
