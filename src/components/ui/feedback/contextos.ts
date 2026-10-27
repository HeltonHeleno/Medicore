import { createContext, type ReactNode } from 'react';

export interface OpcoesConfirmacao {
  titulo: string;
  mensagem?: ReactNode;
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
  /** Ação destrutiva: botão vermelho e foco inicial em "Cancelar". */
  perigo?: boolean;
  /** Exige digitar este texto para liberar o botão (exclusão definitiva, P5). */
  exigirTexto?: string;
}

export type Confirmar = (opcoes: OpcoesConfirmacao) => Promise<boolean>;

export const ContextoConfirmacao = createContext<Confirmar | null>(null);

export type TipoToast = 'sucesso' | 'erro' | 'aviso';

export interface OpcoesToast {
  acao?: { rotulo: string; aoClicar: () => void };
  /** Em ms. Padrão: 5000; erros ficam até serem fechados. */
  duracao?: number;
}

export interface ApiToast {
  sucesso: (mensagem: string, opcoes?: OpcoesToast) => string;
  erro: (mensagem: string, opcoes?: OpcoesToast) => string;
  aviso: (mensagem: string, opcoes?: OpcoesToast) => string;
  fechar: (id: string) => void;
}

export const ContextoToast = createContext<ApiToast | null>(null);
