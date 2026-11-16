/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" faz todas as chamadas do serviço simulado falharem. */
  readonly VITE_SIMULAR_ERRO?: string;
  /** "producao" esconde o banner de demonstração (só com backend real). */
  readonly VITE_AMBIENTE?: string;
  /** Chave pública do Sentry (Fase 23). Sem ela, nenhum erro sai do navegador. */
  readonly VITE_SENTRY_DSN?: string;
}

/** Versão do `package.json`, injetada no build (Fase 23: `release` do Sentry). */
declare const __VERSAO_APP__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
