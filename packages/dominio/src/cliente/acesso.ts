/**
 * Fase 28 (BL-02) — Cliente HTTP das rotas de acesso e de usuários, sobre o mesmo transporte dos
 * outros clientes (o navegador usa `fetch`; os testes, `inject`).
 */
import type {
  ContaDemonstracao,
  EntradaUsuario,
  OpcoesAcesso,
  RespostaSessao,
  UsuarioAdministrado,
  UsuarioComLink,
} from '../contrato/acesso';
import { erroDeResposta } from '../contrato/erros';
import { criarChamada, type TransporteApi } from './cadastros';

const enc = encodeURIComponent;

export function criarClienteAcesso(transporte: TransporteApi) {
  const chamar = criarChamada(transporte);
  const post = <T>(caminho: string, corpo?: unknown) =>
    chamar<T>({ metodo: 'POST', caminho, corpo: corpo ?? {} });

  return {
    opcoes: () => chamar<OpcoesAcesso>({ metodo: 'GET', caminho: '/auth/opcoes' }),
    /** A sessão do cookie, ou `null` sem sessão. */
    sessao: async (): Promise<RespostaSessao | null> => {
      const r = await transporte({ metodo: 'GET', caminho: '/auth/sessao' });
      if (r.status === 401) return null;
      if (r.status >= 400 || r.status === 0) throw erroDeResposta(r.status, r.corpo);
      return r.corpo as RespostaSessao;
    },
    entrar: (email: string, senha: string) =>
      post<RespostaSessao>('/auth/entrar', { email, senha }),
    entrarDemonstracao: (conta: ContaDemonstracao) =>
      post<RespostaSessao>('/auth/demonstracao', { conta }),
    confirmarMfa: (codigo: string) => post<RespostaSessao>('/auth/mfa', { codigo }),
    configurarMfa: () => post<{ segredo: string; qrSvg: string }>('/auth/mfa/configurar'),
    concluirMfa: (codigo: string) =>
      post<RespostaSessao & { codigosRecuperacao: string[] }>('/auth/mfa/confirmar', { codigo }),
    conferirConvite: (token: string) =>
      post<{ nome: string; email: string }>('/auth/convite/conferir', { token }),
    aceitarConvite: (token: string, senha: string) =>
      post<RespostaSessao>('/auth/convite', { token, senha }),
    esqueciSenha: async (email: string) => {
      await post<unknown>('/auth/esqueci', { email });
    },
    redefinirSenha: async (token: string, senha: string) => {
      await post<unknown>('/auth/redefinir', { token, senha });
    },
    sair: async () => {
      await post<unknown>('/auth/sair');
    },

    listarUsuarios: () => chamar<UsuarioAdministrado[]>({ metodo: 'GET', caminho: '/usuarios' }),
    obterUsuario: (id: string) =>
      chamar<UsuarioAdministrado>({ metodo: 'GET', caminho: `/usuarios/${enc(id)}` }),
    convidarUsuario: (entrada: EntradaUsuario) => post<UsuarioComLink>('/usuarios', entrada),
    editarUsuario: (id: string, entrada: EntradaUsuario, versao: number) =>
      chamar<UsuarioAdministrado>({
        metodo: 'PUT',
        caminho: `/usuarios/${enc(id)}`,
        corpo: entrada,
        versao,
      }),
    desativarUsuario: (id: string) => post<UsuarioAdministrado>(`/usuarios/${enc(id)}/desativar`),
    reativarUsuario: (id: string) => post<UsuarioAdministrado>(`/usuarios/${enc(id)}/reativar`),
    desbloquearUsuario: (id: string) =>
      post<UsuarioAdministrado>(`/usuarios/${enc(id)}/desbloquear`),
    redefinirMfaUsuario: (id: string) =>
      post<UsuarioAdministrado>(`/usuarios/${enc(id)}/redefinir-mfa`),
    novoLinkUsuario: (id: string) => post<UsuarioComLink>(`/usuarios/${enc(id)}/link`),
  };
}

export type ClienteAcesso = ReturnType<typeof criarClienteAcesso>;
