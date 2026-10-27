import { createContext, useContext } from 'react';

/** O que o controle dentro de um `Campo` precisa para ficar acessível. */
export interface PropsAcessiveis {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
}

export const ContextoCampo = createContext<PropsAcessiveis | null>(null);

/** Lido por Input, Select, Textarea, InputMascarado e Combobox. Fora de um `Campo`, devolve `{}`. */
export function usePropsDoCampo(): Partial<PropsAcessiveis> {
  return useContext(ContextoCampo) ?? {};
}
