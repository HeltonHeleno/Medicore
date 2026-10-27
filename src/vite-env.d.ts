/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" faz todas as chamadas do serviço simulado falharem. */
  readonly VITE_SIMULAR_ERRO?: string;
  /** "producao" esconde o banner de demonstração (só com backend real). */
  readonly VITE_AMBIENTE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
