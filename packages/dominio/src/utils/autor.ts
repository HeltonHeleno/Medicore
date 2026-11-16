import { to } from '../i18n/pt-BR/operacoes';

/**
 * R-X9: quem fez a ação. Até existir login (BL-02), todos os registros usam o mesmo autor;
 * com o login, esta função passa a devolver o usuário da sessão, sem mudar o formato.
 */
export const autorAtual = (): string => to.autorDemonstracao;
