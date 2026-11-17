/**
 * Fase 28 (BL-02) — Contrato das rotas de acesso (`/auth`) e de usuários (`/usuarios`), usado pela
 * API (validação e documentação) e pelo navegador (tipos).
 */
import { z } from 'zod';
import { PERFIS } from '../permissoes';

const instante = z.string();
export const perfil = z.enum(PERFIS);

export const usuarioDaSessao = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string(),
  perfis: z.array(perfil),
  medicoId: z.string().optional(),
  demonstracao: z.boolean(),
});

/**
 * `ativa`: pode usar o sistema. `mfa`: falta o código do aplicativo. `configurar_mfa`: o perfil
 * exige o segundo fator e ele ainda não foi configurado.
 */
export const respostaSessao = z.object({
  etapa: z.enum(['ativa', 'mfa', 'configurar_mfa']),
  /** Vai no cabeçalho `X-CSRF-Token` de toda gravação (R-AU4). */
  csrf: z.string(),
  usuario: usuarioDaSessao,
  /** Quando a sessão termina se ninguém usar (30 min) ou de vez (12 h), o que vier antes. */
  expiraEm: instante,
});
export type RespostaSessao = z.infer<typeof respostaSessao>;

export const opcoesAcesso = z.object({
  /** Contas de demonstração (fora da produção). */
  demonstracao: z.boolean(),
  /** O servidor envia e-mails ("esqueci a senha" funciona). */
  email: z.boolean(),
});
export type OpcoesAcesso = z.infer<typeof opcoesAcesso>;

export const contaDemonstracao = z.enum([...PERFIS, 'todos']);
export type ContaDemonstracao = z.infer<typeof contaDemonstracao>;

export const entradaLogin = z.object({
  email: z.string().trim().min(1).max(254),
  senha: z.string().min(1).max(1024),
});

export const entradaCodigo = z.object({ codigo: z.string().trim().min(6).max(20) });

export const configuracaoMfa = z.object({ segredo: z.string(), qrSvg: z.string() });

export const sessaoComCodigos = respostaSessao.extend({
  codigosRecuperacao: z.array(z.string()),
});

export const entradaToken = z.object({ token: z.string().min(20).max(200) });
export const entradaSenhaNova = entradaToken.extend({ senha: z.string().min(1).max(1024) });
export const conviteConferido = z.object({ nome: z.string(), email: z.string() });

export const usuarioAdministrado = z.object({
  id: z.string(),
  versao: z.number().int(),
  nome: z.string(),
  email: z.string(),
  perfis: z.array(perfil),
  medicoId: z.string().optional(),
  ativo: z.boolean(),
  convidado: z.boolean(),
  bloqueadoAte: instante.optional(),
  mfaAtivo: z.boolean(),
  ultimoAcessoEm: instante.optional(),
  criadoEm: instante,
});
export type UsuarioAdministrado = z.infer<typeof usuarioAdministrado>;

export const entradaUsuario = z.object({
  nome: z.string().trim().min(3, 'Informe o nome completo.').max(120),
  email: z.string().trim().email('E-mail inválido.').max(254),
  perfis: z.array(perfil).max(7),
  medicoId: z.string().optional(),
});
export type EntradaUsuario = z.infer<typeof entradaUsuario>;

/** Resposta das ações que geram link (convite, nova senha). `link` só sem e-mail configurado. */
export const usuarioComLink = z.object({
  usuario: usuarioAdministrado,
  tipo: z.enum(['convite', 'redefinicao']),
  link: z.string().optional(),
  enviadoPara: z.string().optional(),
});
export type UsuarioComLink = z.infer<typeof usuarioComLink>;
