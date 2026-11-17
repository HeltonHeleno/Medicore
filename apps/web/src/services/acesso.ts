/**
 * Fase 28 (BL-02) — Acesso no modo navegador (dados locais): não há login. Todas as ações ficam
 * liberadas e as telas de acesso não aparecem. No modo API, `services/api/acesso.ts` toma o lugar
 * deste arquivo (mesmas funções; ver `vite.config.ts`).
 */
import type {
  ContaDemonstracao,
  EntradaUsuario,
  OpcoesAcesso,
  RespostaSessao,
  UsuarioAdministrado,
  UsuarioComLink,
} from '@medicore/dominio/contrato/acesso';

/** Este modo tem login? */
export const COM_LOGIN: boolean = false;

/** A sessão atual (`null` sem login). */
export const sessaoAtual = (): RespostaSessao | null => null;
/** A sessão terminou com a tela aberta (E-19)? */
export const sessaoTerminou = (): boolean => false;
export const assinarSessao =
  (_aoMudar: () => void): (() => void) =>
  () => {};
export const carregarSessao = async (): Promise<RespostaSessao | null> => null;

const semLogin = async (): Promise<never> => {
  throw new Error('Sem login no modo navegador.');
};

export const opcoesAcesso = async (): Promise<OpcoesAcesso> => ({
  demonstracao: false,
  email: false,
});
export const entrar: (email: string, senha: string) => Promise<RespostaSessao> = semLogin;
export const entrarDemonstracao: (conta: ContaDemonstracao) => Promise<RespostaSessao> = semLogin;
export const confirmarMfa: (codigo: string) => Promise<RespostaSessao> = semLogin;
export const configurarMfa: () => Promise<{ segredo: string; qrSvg: string }> = semLogin;
export const concluirMfa: (
  codigo: string,
) => Promise<RespostaSessao & { codigosRecuperacao: string[] }> = semLogin;
export const conferirConvite: (token: string) => Promise<{ nome: string; email: string }> =
  semLogin;
export const aceitarConvite: (token: string, senha: string) => Promise<RespostaSessao> = semLogin;
export const esqueciSenha: (email: string) => Promise<void> = semLogin;
export const redefinirSenha: (token: string, senha: string) => Promise<void> = semLogin;
export const sair = async (): Promise<void> => {};
/** Depois da etapa do MFA, a sessão ativa passa a valer (e o aviso de sessão terminada some). */
export const usarSessao = (_s: RespostaSessao | null): void => {};

export const listarUsuarios: () => Promise<UsuarioAdministrado[]> = semLogin;
export const obterUsuario: (id: string) => Promise<UsuarioAdministrado> = semLogin;
export const convidarUsuario: (e: EntradaUsuario) => Promise<UsuarioComLink> = semLogin;
export const editarUsuario: (
  id: string,
  e: EntradaUsuario,
  versao: number,
) => Promise<UsuarioAdministrado> = semLogin;
export const desativarUsuario: (id: string) => Promise<UsuarioAdministrado> = semLogin;
export const reativarUsuario: (id: string) => Promise<UsuarioAdministrado> = semLogin;
export const desbloquearUsuario: (id: string) => Promise<UsuarioAdministrado> = semLogin;
export const redefinirMfaUsuario: (id: string) => Promise<UsuarioAdministrado> = semLogin;
export const novoLinkUsuario: (id: string) => Promise<UsuarioComLink> = semLogin;
