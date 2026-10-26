/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" faz todas as chamadas do serviço simulado falharem. */
  readonly VITE_SIMULAR_ERRO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
