/** Fase 27 — Lista usada pelo `vite.config.ts` (troca no build) e pelo teste do modo API. */
/** Serviços que, no modo API, são trocados pelos de `src/services/api/` (mesmos nomes). */
export const SERVICOS_DO_MODO_API = [
  'pacientes',
  'medicos',
  'consultas',
  'atividades',
  'painel',
  'leitos',
  'emergencia',
  'farmacia',
  'situacao-hospitalar',
  'indicadores-operacionais',
  'demo',
  'inicializacao-operacoes',
  'repositorio',
  'colecoes',
  'colecoes-operacoes',
  // Fase 28: login, sessão e usuários.
  'acesso',
] as const;
