/**
 * Fase 28 (BL-02) — Acesso no modo API: a sessão vem do cookie (HttpOnly) e é guardada aqui, com o
 * código de segurança das gravações. Toma o lugar de `services/acesso.ts` (ver `vite.config.ts`).
 */
import { criarClienteAcesso } from '@medicore/dominio/cliente/acesso';
import type { RespostaSessao } from '@medicore/dominio/contrato/acesso';
import type * as L from '../acesso';
import { transporte } from './cliente';
import { aoTerminarSessao, definirCodigoSeguranca } from './rede';

const c = criarClienteAcesso(transporte);

export const COM_LOGIN: typeof L.COM_LOGIN = true;

let sessao: RespostaSessao | null = null;
let terminou = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((fn) => fn());

export const usarSessao: typeof L.usarSessao = (s) => {
  sessao = s;
  if (s?.etapa === 'ativa') terminou = false;
  definirCodigoSeguranca(s?.csrf ?? null);
  avisar();
};

// Um 401 com a tela aberta: a sessão terminou (E-19). Os dados da tela continuam.
aoTerminarSessao(() => {
  if (!sessao || terminou) return;
  terminou = true;
  avisar();
});

export const sessaoAtual: typeof L.sessaoAtual = () => sessao;
export const sessaoTerminou: typeof L.sessaoTerminou = () => terminou;
export const assinarSessao: typeof L.assinarSessao = (fn) => {
  ouvintes.add(fn);
  return () => void ouvintes.delete(fn);
};

export const carregarSessao: typeof L.carregarSessao = async () => {
  const s = await c.sessao();
  usarSessao(s);
  return s;
};

const comSessao =
  <A extends unknown[]>(fn: (...a: A) => Promise<RespostaSessao>) =>
  async (...a: A) => {
    const s = await fn(...a);
    usarSessao(s);
    return s;
  };

export const opcoesAcesso: typeof L.opcoesAcesso = c.opcoes;
export const entrar: typeof L.entrar = comSessao(c.entrar);
export const entrarDemonstracao: typeof L.entrarDemonstracao = comSessao(c.entrarDemonstracao);
export const confirmarMfa: typeof L.confirmarMfa = comSessao(c.confirmarMfa);
export const configurarMfa: typeof L.configurarMfa = c.configurarMfa;
export const concluirMfa: typeof L.concluirMfa = async (codigo) => {
  const r = await c.concluirMfa(codigo);
  const { codigosRecuperacao: _, ...s } = r;
  usarSessao(s);
  return r;
};
export const conferirConvite: typeof L.conferirConvite = c.conferirConvite;
export const aceitarConvite: typeof L.aceitarConvite = comSessao(c.aceitarConvite);
export const esqueciSenha: typeof L.esqueciSenha = c.esqueciSenha;
export const redefinirSenha: typeof L.redefinirSenha = c.redefinirSenha;
export const sair: typeof L.sair = async () => {
  try {
    await c.sair();
  } finally {
    terminou = false;
    usarSessao(null);
  }
};

export const listarUsuarios: typeof L.listarUsuarios = c.listarUsuarios;
export const obterUsuario: typeof L.obterUsuario = c.obterUsuario;
export const convidarUsuario: typeof L.convidarUsuario = c.convidarUsuario;
export const editarUsuario: typeof L.editarUsuario = c.editarUsuario;
export const desativarUsuario: typeof L.desativarUsuario = c.desativarUsuario;
export const reativarUsuario: typeof L.reativarUsuario = c.reativarUsuario;
export const desbloquearUsuario: typeof L.desbloquearUsuario = c.desbloquearUsuario;
export const redefinirMfaUsuario: typeof L.redefinirMfaUsuario = c.redefinirMfaUsuario;
export const novoLinkUsuario: typeof L.novoLinkUsuario = c.novoLinkUsuario;
