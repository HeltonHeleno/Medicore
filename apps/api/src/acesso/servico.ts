/**
 * Fase 28 (BL-02.1 a BL-02.5) — Contas, sessões, convites, segundo fator e redefinição de senha.
 *
 * Regras (especificação, D29):
 * - R-AU1 senha com Argon2id; R-AU2 MFA obrigatório para Administrador e Gestão;
 * - R-AU3 bloqueio progressivo por e-mail (5 erros → 15 min; 10 → 1 h), exista a conta ou não;
 * - sessão: 30 min sem uso ou 12 h desde a entrada; o cookie leva um token, o banco guarda o hash;
 * - convite: 48 h; redefinição: 30 min; os dois de uso único; "esqueci a senha" responde igual
 *   exista a conta ou não, e a senha nova encerra todas as sessões;
 * - R-AU5: senha, código e token nunca vão para log, resposta (fora o próprio link para o admin
 *   quando não há e-mail) ou monitoramento.
 */
import {
  ErroConflito,
  ErroLimite,
  ErroNaoEncontrado,
  ErroValidacao,
} from '@medicore/dominio/erros';
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import { to } from '@medicore/dominio/i18n/pt-BR/operacoes';
import { ehPerfil, exigeMfa, PERFIS, type Perfil } from '@medicore/dominio/permissoes';
import { gerarId } from '@medicore/dominio/utils/id';
import { agora } from '@medicore/dominio/utils/relogio';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import QRCode from 'qrcode';
import type { Banco } from '../banco/conexao';
import { deLinha } from '../banco/conversao';
import {
  codigosRecuperacao,
  convites,
  medicos,
  perfisUsuario,
  sessoes,
  tentativasLogin,
  usuarios,
} from '../banco/esquema';
import { conferirVersao } from '../servicos/comum';
import {
  hashSenha,
  iguais,
  normalizarCodigoRecuperacao,
  novoSegredoTotp,
  novosCodigosRecuperacao,
  novoToken,
  problemaDaSenha,
  resumoToken,
  senhaConfere,
  totpConfere,
  uriTotp,
} from './segredos';

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
export const INATIVIDADE_MS = 30 * MINUTO;
export const DURACAO_MAXIMA_MS = 12 * HORA;
export const ETAPA_MFA_MS = 5 * MINUTO;
export const VALIDADE_CONVITE_MS = 48 * HORA;
export const VALIDADE_REDEFINICAO_MS = 30 * MINUTO;
/** Atualiza o "último uso" da sessão no máximo uma vez por minuto (menos gravações). */
const TOQUE_MS = MINUTO;

/** R-AU3: a partir de quantos erros, por quanto tempo. */
export const BLOQUEIOS = [
  { falhas: 10, ms: HORA },
  { falhas: 5, ms: 15 * MINUTO },
] as const;

export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
  perfis: Perfil[];
  medicoId?: string;
  mfaAtivo: boolean;
  demonstracao: boolean;
}

export interface Sessao {
  id: string;
  etapa: 'mfa' | 'ativa';
  csrf: string;
  usuario: UsuarioSessao;
}

/** O que a tela recebe ao entrar ou ao perguntar pela sessão (nada de hash, segredo ou token). */
export interface RespostaSessao {
  etapa: 'mfa' | 'configurar_mfa' | 'ativa';
  csrf: string;
  usuario: Omit<UsuarioSessao, 'mfaAtivo'>;
  expiraEm: string;
}

const momento = () => agora().toISOString();
const ms = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : 0);
const emailNormal = (email: string) => email.trim().toLowerCase();

type LinhaUsuario = typeof usuarios.$inferSelect;

async function perfisDe(banco: Banco, ids: string[]): Promise<Map<string, Perfil[]>> {
  const mapa = new Map<string, Perfil[]>(ids.map((id) => [id, []]));
  if (!ids.length) return mapa;
  const linhas = await banco
    .select()
    .from(perfisUsuario)
    .where(inArray(perfisUsuario.usuarioId, ids))
    .orderBy(asc(perfisUsuario.perfil));
  for (const l of linhas) if (ehPerfil(l.perfil)) mapa.get(l.usuarioId)?.push(l.perfil);
  return mapa;
}

const paraUsuarioSessao = (u: LinhaUsuario, perfis: Perfil[]): UsuarioSessao => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  perfis,
  ...(u.medicoId ? { medicoId: u.medicoId } : {}),
  mfaAtivo: u.mfaAtivo,
  demonstracao: u.demonstracao,
});

export function respostaDaSessao(s: Sessao, expiraEm: string): RespostaSessao {
  const { mfaAtivo, ...usuario } = s.usuario;
  return {
    etapa: s.etapa === 'ativa' ? 'ativa' : mfaAtivo ? 'mfa' : 'configurar_mfa',
    csrf: s.csrf,
    usuario,
    expiraEm,
  };
}

// ─────────── sessões ───────────

async function criarSessao(
  banco: Banco,
  u: UsuarioSessao,
  etapa: 'mfa' | 'ativa',
): Promise<{ token: string; sessao: Sessao; expiraEm: string }> {
  const token = novoToken();
  const agoraMs = agora().getTime();
  const expiraEm = new Date(agoraMs + (etapa === 'mfa' ? ETAPA_MFA_MS : DURACAO_MAXIMA_MS));
  const csrf = novoToken();
  await banco.insert(sessoes).values({
    id: resumoToken(token),
    usuarioId: u.id,
    etapa,
    csrf,
    criadaEm: momento(),
    ultimoUsoEm: momento(),
    expiraEm: expiraEm.toISOString(),
  });
  if (etapa === 'ativa') {
    await banco.update(usuarios).set({ ultimoAcessoEm: momento() }).where(eq(usuarios.id, u.id));
  }
  return {
    token,
    sessao: { id: resumoToken(token), etapa, csrf, usuario: u },
    expiraEm: expiraEm.toISOString(),
  };
}

/**
 * A sessão do cookie, se ainda vale: não encerrada, dentro das 12 h, com uso nos últimos 30 min e
 * com o usuário ativo. Atualiza o "último uso".
 */
export async function sessaoDoToken(
  banco: Banco,
  token: string | undefined,
): Promise<{ sessao: Sessao; expiraEm: string } | null> {
  if (!token) return null;
  const id = resumoToken(token);
  const [linha] = await banco
    .select({ s: sessoes, u: usuarios })
    .from(sessoes)
    .innerJoin(usuarios, eq(usuarios.id, sessoes.usuarioId))
    .where(and(eq(sessoes.id, id), isNull(sessoes.encerradaEm)));
  if (!linha) return null;
  const agoraMs = agora().getTime();
  const s = deLinha<typeof sessoes.$inferSelect>(sessoes, linha.s as never);
  const u = deLinha<LinhaUsuario>(usuarios, linha.u as never);
  const vencida =
    ms(s.expiraEm) <= agoraMs ||
    (s.etapa === 'ativa' && ms(s.ultimoUsoEm) + INATIVIDADE_MS <= agoraMs) ||
    !u.ativo;
  if (vencida) {
    await banco.update(sessoes).set({ encerradaEm: momento() }).where(eq(sessoes.id, id));
    return null;
  }
  if (agoraMs - ms(s.ultimoUsoEm) >= TOQUE_MS) {
    await banco.update(sessoes).set({ ultimoUsoEm: momento() }).where(eq(sessoes.id, id));
  }
  const perfis = (await perfisDe(banco, [u.id])).get(u.id) ?? [];
  const inatividade = s.etapa === 'ativa' ? agoraMs + INATIVIDADE_MS : ms(s.expiraEm);
  return {
    sessao: { id, etapa: s.etapa, csrf: s.csrf, usuario: paraUsuarioSessao(u, perfis) },
    expiraEm: new Date(Math.min(ms(s.expiraEm), inatividade)).toISOString(),
  };
}

export async function encerrarSessao(banco: Banco, sessaoId: string): Promise<void> {
  await banco.update(sessoes).set({ encerradaEm: momento() }).where(eq(sessoes.id, sessaoId));
}

export async function encerrarSessoesDoUsuario(banco: Banco, usuarioId: string): Promise<void> {
  await banco
    .update(sessoes)
    .set({ encerradaEm: momento() })
    .where(and(eq(sessoes.usuarioId, usuarioId), isNull(sessoes.encerradaEm)));
}

// ─────────── entrar (BL-02.1) ───────────

async function conferirBloqueio(banco: Banco, email: string): Promise<void> {
  const [t] = await banco.select().from(tentativasLogin).where(eq(tentativasLogin.email, email));
  const ate = ms(t?.bloqueadoAte ? new Date(t.bloqueadoAte).toISOString() : null);
  const falta = ate - agora().getTime();
  if (falta > 0) throw new ErroLimite(Math.ceil(falta / 1000));
}

async function registrarFalha(banco: Banco, email: string): Promise<void> {
  const [t] = await banco.select().from(tentativasLogin).where(eq(tentativasLogin.email, email));
  const falhas = (t?.falhas ?? 0) + 1;
  const regra = BLOQUEIOS.find((b) => falhas >= b.falhas);
  // Bloqueia ao chegar em 5 e em 10 (e de novo a cada 5 depois disso).
  const bloquear = regra && (falhas === 5 || falhas % 5 === 0);
  const bloqueadoAte = bloquear ? new Date(agora().getTime() + regra.ms).toISOString() : null;
  await banco
    .insert(tentativasLogin)
    .values({ email, falhas, bloqueadoAte, ultimaEm: momento() })
    .onConflictDoUpdate({
      target: tentativasLogin.email,
      set: { falhas, bloqueadoAte, ultimaEm: momento() },
    });
  if (bloqueadoAte) throw new ErroLimite(Math.ceil(regra!.ms / 1000));
}

const limparFalhas = (banco: Banco, email: string) =>
  banco.delete(tentativasLogin).where(eq(tentativasLogin.email, email));

async function usuarioPorEmail(banco: Banco, email: string) {
  const [u] = await banco
    .select()
    .from(usuarios)
    .where(sql`lower(${usuarios.email}) = ${emailNormal(email)}`);
  if (!u) return undefined;
  const linha = deLinha<LinhaUsuario>(usuarios, u as never);
  return { linha, perfis: (await perfisDe(banco, [linha.id])).get(linha.id) ?? [] };
}

/**
 * E-mail e senha. Mensagem única para e-mail ou senha errados; conta desativada tem a própria
 * (BL-02.1). Com MFA, a sessão nasce na etapa `mfa` (5 min para o código).
 */
export async function entrar(banco: Banco, emailDigitado: string, senha: string) {
  const email = emailNormal(emailDigitado);
  await conferirBloqueio(banco, email);
  const achado = await usuarioPorEmail(banco, email);
  const confere = await senhaConfere(achado?.linha.senhaHash, senha);
  if (!achado || !confere || !achado.linha.senhaHash) {
    await registrarFalha(banco, email);
    throw new ErroConflito('codigo_incorreto', ta.login.incorretos, { campo: 'senha' });
  }
  if (!achado.linha.ativo) {
    throw new ErroConflito('conta_desativada', ta.login.contaDesativada);
  }
  await limparFalhas(banco, email);
  const u = paraUsuarioSessao(achado.linha, achado.perfis);
  return criarSessao(banco, u, exigeMfa(u.perfis) ? 'mfa' : 'ativa');
}

/** Contas de demonstração: um usuário por perfil e a "equipe completa" (todos os perfis). */
export const CONTAS_DEMONSTRACAO = [...PERFIS, 'todos'] as const;
export type ContaDemonstracao = (typeof CONTAS_DEMONSTRACAO)[number];

/** Só nos ambientes sem dados reais (D28): entra sem senha nem MFA. */
export async function entrarDemonstracao(banco: Banco, conta: ContaDemonstracao) {
  const id = `usu-demo-${conta}`;
  const perfis: Perfil[] = conta === 'todos' ? [...PERFIS] : [conta];
  // A equipe completa assina como o autor de sempre da demonstração (sem login).
  const nome = conta === 'todos' ? to.autorDemonstracao : `${ta.perfis[conta]} (demonstração)`;
  await banco
    .insert(usuarios)
    .values({
      id,
      nome,
      email: `${conta}@demonstracao.medicore`,
      demonstracao: true,
      // O médico de exemplo da clínica geral: o perfil Médico pede o cadastro ligado (D30).
      ...(perfis.includes('medico') ? { medicoId: 'med-helena-duarte' } : {}),
    })
    .onConflictDoNothing();
  await banco
    .insert(perfisUsuario)
    .values(perfis.map((perfil) => ({ usuarioId: id, perfil })))
    .onConflictDoNothing();
  const achado = await usuarioPorEmail(banco, `${conta}@demonstracao.medicore`);
  return criarSessao(banco, paraUsuarioSessao(achado!.linha, achado!.perfis), 'ativa');
}

// ─────────── segundo fator (BL-02.2) ───────────

/** Etapa `mfa` com o MFA já configurado: confere o código do aplicativo ou um de recuperação. */
export async function confirmarMfa(banco: Banco, sessao: Sessao, codigo: string) {
  if (sessao.etapa !== 'mfa' || !sessao.usuario.mfaAtivo) {
    throw new ErroConflito('transicao_invalida', ta.mfa.expirado);
  }
  const email = emailNormal(sessao.usuario.email);
  await conferirBloqueio(banco, email);
  const [u] = await banco.select().from(usuarios).where(eq(usuarios.id, sessao.usuario.id));
  const digitado = codigo.trim();
  let ok = !!u?.mfaSegredo && totpConfere(u.mfaSegredo, digitado, agora().getTime());
  if (!ok && digitado.length > 6)
    ok = await usarCodigoRecuperacao(banco, sessao.usuario.id, digitado);
  if (!ok) {
    await registrarFalha(banco, email);
    throw new ErroConflito('codigo_incorreto', ta.mfa.incorreto, { campo: 'codigo' });
  }
  await limparFalhas(banco, email);
  await encerrarSessao(banco, sessao.id);
  return criarSessao(banco, sessao.usuario, 'ativa');
}

async function usarCodigoRecuperacao(banco: Banco, usuarioId: string, codigo: string) {
  const resumo = resumoToken(normalizarCodigoRecuperacao(codigo));
  const usados = await banco
    .update(codigosRecuperacao)
    .set({ usadoEm: momento() })
    .where(
      and(
        eq(codigosRecuperacao.usuarioId, usuarioId),
        eq(codigosRecuperacao.codigoHash, resumo),
        isNull(codigosRecuperacao.usadoEm),
      ),
    )
    .returning({ id: codigosRecuperacao.id });
  return usados.length === 1;
}

/** Primeira configuração: gera o segredo (ou mostra o mesmo de novo, até ser confirmado). */
export async function iniciarConfiguracaoMfa(banco: Banco, sessao: Sessao) {
  if (sessao.etapa !== 'mfa' || sessao.usuario.mfaAtivo) {
    throw new ErroConflito('transicao_invalida', ta.mfa.expirado);
  }
  const [u] = await banco.select().from(usuarios).where(eq(usuarios.id, sessao.usuario.id));
  const segredo = u?.mfaSegredo ?? novoSegredoTotp();
  if (!u?.mfaSegredo) {
    await banco
      .update(usuarios)
      .set({ mfaSegredo: segredo })
      .where(eq(usuarios.id, sessao.usuario.id));
  }
  const uri = uriTotp(segredo, sessao.usuario.email);
  const qr = await QRCode.toString(uri, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  return { segredo, qrSvg: qr };
}

/** Confirma o primeiro código: liga o MFA, gera os códigos de recuperação e ativa a sessão. */
export async function concluirConfiguracaoMfa(banco: Banco, sessao: Sessao, codigo: string) {
  if (sessao.etapa !== 'mfa' || sessao.usuario.mfaAtivo) {
    throw new ErroConflito('transicao_invalida', ta.mfa.expirado);
  }
  const [u] = await banco.select().from(usuarios).where(eq(usuarios.id, sessao.usuario.id));
  if (!u?.mfaSegredo || !totpConfere(u.mfaSegredo, codigo.trim(), agora().getTime())) {
    throw new ErroConflito('codigo_incorreto', ta.mfa.incorreto, { campo: 'codigo' });
  }
  const codigos = novosCodigosRecuperacao();
  await banco.transaction(async (tx) => {
    await tx.update(usuarios).set({ mfaAtivo: true }).where(eq(usuarios.id, u.id));
    await tx.delete(codigosRecuperacao).where(eq(codigosRecuperacao.usuarioId, u.id));
    await tx.insert(codigosRecuperacao).values(
      codigos.map((c) => ({
        id: gerarId(),
        usuarioId: u.id,
        codigoHash: resumoToken(normalizarCodigoRecuperacao(c)),
      })),
    );
  });
  await encerrarSessao(banco, sessao.id);
  const nova = await criarSessao(banco, { ...sessao.usuario, mfaAtivo: true }, 'ativa');
  return { ...nova, codigosRecuperacao: codigos };
}

// ─────────── convites e senha (BL-02.2, BL-02.3) ───────────

async function criarLink(banco: Banco, usuarioId: string, tipo: 'convite' | 'redefinicao') {
  const token = novoToken();
  const validade = tipo === 'convite' ? VALIDADE_CONVITE_MS : VALIDADE_REDEFINICAO_MS;
  // O link novo invalida os anteriores do mesmo tipo.
  await banco
    .update(convites)
    .set({ usadoEm: momento() })
    .where(
      and(eq(convites.usuarioId, usuarioId), eq(convites.tipo, tipo), isNull(convites.usadoEm)),
    );
  await banco.insert(convites).values({
    id: resumoToken(token),
    usuarioId,
    tipo,
    criadoEm: momento(),
    expiraEm: new Date(agora().getTime() + validade).toISOString(),
  });
  return token;
}

async function linkValido(banco: Banco, token: string, tipo: 'convite' | 'redefinicao') {
  const [c] = await banco
    .select({ c: convites, u: usuarios })
    .from(convites)
    .innerJoin(usuarios, eq(usuarios.id, convites.usuarioId))
    .where(and(eq(convites.id, resumoToken(token)), eq(convites.tipo, tipo)));
  if (
    !c ||
    c.c.usadoEm ||
    ms(new Date(c.c.expiraEm).toISOString()) <= agora().getTime() ||
    !c.u.ativo
  ) {
    return null;
  }
  return c;
}

/** Para a tela do convite mostrar "Olá, Fulana". */
export async function conferirConvite(banco: Banco, token: string) {
  const c = await linkValido(banco, token, 'convite');
  if (!c) throw new ErroNaoEncontrado(ta.convite.invalido);
  return { nome: c.u.nome, email: c.u.email };
}

function validarSenhaNova(senha: string, email: string) {
  const problema = problemaDaSenha(senha, email);
  if (problema) throw new ErroValidacao({ senha: ta.senha[problema] });
}

/** Aceita o convite: define a senha e já entra (na etapa do MFA, se o perfil exigir). */
export async function aceitarConvite(banco: Banco, token: string, senha: string) {
  const c = await linkValido(banco, token, 'convite');
  if (!c) throw new ErroNaoEncontrado(ta.convite.invalido);
  validarSenhaNova(senha, c.u.email);
  const senhaHash = await hashSenha(senha);
  const marcado = await banco
    .update(convites)
    .set({ usadoEm: momento() })
    .where(and(eq(convites.id, c.c.id), isNull(convites.usadoEm)))
    .returning({ id: convites.id });
  if (marcado.length !== 1) throw new ErroNaoEncontrado(ta.convite.invalido);
  await banco.update(usuarios).set({ senhaHash }).where(eq(usuarios.id, c.u.id));
  const achado = await usuarioPorEmail(banco, c.u.email);
  const u = paraUsuarioSessao(achado!.linha, achado!.perfis);
  return criarSessao(banco, u, exigeMfa(u.perfis) ? 'mfa' : 'ativa');
}

/** "Esqueci a senha": a resposta é a mesma exista a conta ou não; o link só vai por e-mail. */
export async function pedirRedefinicao(banco: Banco, emailDigitado: string) {
  const achado = await usuarioPorEmail(banco, emailDigitado);
  if (!achado || !achado.linha.ativo || achado.linha.demonstracao) return null;
  const token = await criarLink(banco, achado.linha.id, 'redefinicao');
  return { token, nome: achado.linha.nome, email: achado.linha.email };
}

/** Senha nova pelo link: encerra todas as sessões (BL-02.3). */
export async function redefinirSenha(banco: Banco, token: string, senha: string) {
  const c = await linkValido(banco, token, 'redefinicao');
  if (!c) throw new ErroNaoEncontrado(ta.redefinir.invalido);
  validarSenhaNova(senha, c.u.email);
  const senhaHash = await hashSenha(senha);
  await banco.transaction(async (tx) => {
    const marcado = await tx
      .update(convites)
      .set({ usadoEm: momento() })
      .where(and(eq(convites.id, c.c.id), isNull(convites.usadoEm)))
      .returning({ id: convites.id });
    if (marcado.length !== 1) throw new ErroNaoEncontrado(ta.redefinir.invalido);
    await tx.update(usuarios).set({ senhaHash }).where(eq(usuarios.id, c.u.id));
    await tx
      .update(sessoes)
      .set({ encerradaEm: momento() })
      .where(and(eq(sessoes.usuarioId, c.u.id), isNull(sessoes.encerradaEm)));
  });
  await limparFalhas(banco, emailNormal(c.u.email));
}

// ─────────── administrar usuários (BL-02.5) ───────────

export interface UsuarioAdministrado {
  id: string;
  versao: number;
  nome: string;
  email: string;
  perfis: Perfil[];
  medicoId?: string;
  ativo: boolean;
  /** Ainda não aceitou o convite (sem senha). */
  convidado: boolean;
  bloqueadoAte?: string;
  mfaAtivo: boolean;
  ultimoAcessoEm?: string;
  criadoEm: string;
}

export interface EntradaUsuario {
  nome: string;
  email: string;
  perfis: Perfil[];
  medicoId?: string;
}

async function administrado(banco: Banco, linhas: LinhaUsuario[]): Promise<UsuarioAdministrado[]> {
  const perfis = await perfisDe(
    banco,
    linhas.map((l) => l.id),
  );
  const bloqueios = linhas.length
    ? await banco
        .select()
        .from(tentativasLogin)
        .where(
          inArray(
            tentativasLogin.email,
            linhas.map((l) => emailNormal(l.email)),
          ),
        )
    : [];
  const agoraMs = agora().getTime();
  const bloqueado = new Map(
    bloqueios
      .filter((b) => b.bloqueadoAte && new Date(b.bloqueadoAte).getTime() > agoraMs)
      .map((b) => [b.email, new Date(b.bloqueadoAte!).toISOString()]),
  );
  return linhas.map((l) => ({
    id: l.id,
    versao: l.versao,
    nome: l.nome,
    email: l.email,
    perfis: perfis.get(l.id) ?? [],
    ...(l.medicoId ? { medicoId: l.medicoId } : {}),
    ativo: l.ativo,
    convidado: !l.senhaHash,
    ...(bloqueado.has(emailNormal(l.email))
      ? { bloqueadoAte: bloqueado.get(emailNormal(l.email))! }
      : {}),
    mfaAtivo: l.mfaAtivo,
    ...(l.ultimoAcessoEm ? { ultimoAcessoEm: l.ultimoAcessoEm } : {}),
    criadoEm: l.criadoEm,
  }));
}

export async function listarUsuarios(banco: Banco): Promise<UsuarioAdministrado[]> {
  const linhas = (await banco
    .select()
    .from(usuarios)
    .where(eq(usuarios.demonstracao, false))
    .orderBy(sql`${usuarios.nome} collate pt_br_base`, asc(usuarios.id))) as Record<
    string,
    unknown
  >[];
  return administrado(
    banco,
    linhas.map((l) => deLinha<LinhaUsuario>(usuarios, l)),
  );
}

async function obterLinha(banco: Banco, id: string): Promise<LinhaUsuario> {
  const [u] = await banco.select().from(usuarios).where(eq(usuarios.id, id));
  if (!u || u.demonstracao) throw new ErroNaoEncontrado(ta.usuarios.naoEncontrado);
  return deLinha<LinhaUsuario>(usuarios, u as never);
}

export async function obterUsuario(banco: Banco, id: string) {
  return (await administrado(banco, [await obterLinha(banco, id)]))[0]!;
}

async function validarEntrada(banco: Banco, e: EntradaUsuario, ignorarId?: string) {
  const campos: Record<string, string> = {};
  const perfis = [...new Set(e.perfis)].filter(ehPerfil);
  if (perfis.length === 0) campos.perfis = ta.usuarios.perfilObrigatorio;
  if (perfis.includes('medico') && !e.medicoId) campos.medicoId = ta.usuarios.medicoObrigatorio;
  if (e.medicoId) {
    const [m] = await banco.select().from(medicos).where(eq(medicos.id, e.medicoId));
    if (!m || !m.ativo) campos.medicoId = ta.usuarios.medicoInvalido;
  }
  if (Object.keys(campos).length) throw new ErroValidacao(campos);
  const [outro] = await banco
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(sql`lower(${usuarios.email}) = ${emailNormal(e.email)}`);
  if (outro && outro.id !== ignorarId) {
    throw new ErroConflito('usuario_duplicado', ta.usuarios.emailDuplicado, { campo: 'email' });
  }
  return { ...e, perfis, email: e.email.trim(), nome: e.nome.trim() };
}

async function gravarPerfis(
  banco: Pick<Banco, 'delete' | 'insert'>,
  usuarioId: string,
  perfis: Perfil[],
) {
  await banco.delete(perfisUsuario).where(eq(perfisUsuario.usuarioId, usuarioId));
  await banco.insert(perfisUsuario).values(perfis.map((perfil) => ({ usuarioId, perfil })));
}

/** E-17: sempre sobra um Administrador ativo (com senha). */
async function conferirUltimoAdministrador(banco: Banco, saindoId: string) {
  const [{ n }] = (
    await banco.execute<{ n: number }>(sql`
      select count(*)::int as n from ${usuarios} u
        join ${perfisUsuario} p on p.usuario_id = u.id and p.perfil = 'administrador'
       where u.ativo and not u.demonstracao and u.id <> ${saindoId}`)
  ).rows as [{ n: number }];
  if (n === 0) throw new ErroConflito('ultimo_administrador', ta.usuarios.ultimoAdministrador);
}

/** Convida: cria a conta sem senha e o link de 48 h. */
export async function convidar(banco: Banco, entrada: EntradaUsuario) {
  const e = await validarEntrada(banco, entrada);
  const id = gerarId();
  await banco.transaction(async (tx) => {
    await tx.insert(usuarios).values({
      id,
      nome: e.nome,
      email: e.email,
      ...(e.medicoId ? { medicoId: e.medicoId } : {}),
      criadoEm: momento(),
      atualizadoEm: momento(),
    });
    await gravarPerfis(tx, id, e.perfis);
  });
  const token = await criarLink(banco, id, 'convite');
  return { usuario: await obterUsuario(banco, id), token };
}

export async function editarUsuario(
  banco: Banco,
  id: string,
  entrada: EntradaUsuario,
  versao: number,
) {
  const atual = await obterLinha(banco, id);
  conferirVersao(atual, versao);
  const e = await validarEntrada(banco, entrada, id);
  const perfisAtuais = (await perfisDe(banco, [id])).get(id) ?? [];
  if (
    perfisAtuais.includes('administrador') &&
    !e.perfis.includes('administrador') &&
    atual.ativo
  ) {
    await conferirUltimoAdministrador(banco, id);
  }
  await banco.transaction(async (tx) => {
    await tx
      .update(usuarios)
      .set({
        nome: e.nome,
        email: e.email,
        medicoId: e.perfis.includes('medico') ? (e.medicoId ?? null) : null,
        versao: atual.versao + 1,
        atualizadoEm: momento(),
      })
      .where(eq(usuarios.id, id));
    await gravarPerfis(tx, id, e.perfis);
  });
  // Perfis novos (com MFA) valem na próxima entrada: as sessões abertas terminam.
  if (JSON.stringify(perfisAtuais) !== JSON.stringify([...e.perfis].sort())) {
    await encerrarSessoesDoUsuario(banco, id);
  }
  return obterUsuario(banco, id);
}

export async function desativarUsuario(banco: Banco, id: string) {
  const atual = await obterLinha(banco, id);
  if (!atual.ativo) return obterUsuario(banco, id);
  await conferirUltimoAdministrador(banco, id);
  await banco
    .update(usuarios)
    .set({
      ativo: false,
      inativadoEm: momento(),
      versao: atual.versao + 1,
      atualizadoEm: momento(),
    })
    .where(eq(usuarios.id, id));
  await encerrarSessoesDoUsuario(banco, id);
  return obterUsuario(banco, id);
}

export async function reativarUsuario(banco: Banco, id: string) {
  const atual = await obterLinha(banco, id);
  await banco
    .update(usuarios)
    .set({ ativo: true, inativadoEm: null, versao: atual.versao + 1, atualizadoEm: momento() })
    .where(eq(usuarios.id, id));
  return obterUsuario(banco, id);
}

export async function desbloquearUsuario(banco: Banco, id: string) {
  const atual = await obterLinha(banco, id);
  await limparFalhas(banco, emailNormal(atual.email));
  return obterUsuario(banco, id);
}

/** Apaga o segundo fator: a pessoa configura de novo na próxima entrada. */
export async function redefinirMfa(banco: Banco, id: string) {
  const atual = await obterLinha(banco, id);
  await banco.transaction(async (tx) => {
    await tx
      .update(usuarios)
      .set({ mfaAtivo: false, mfaSegredo: null, versao: atual.versao + 1, atualizadoEm: momento() })
      .where(eq(usuarios.id, id));
    await tx.delete(codigosRecuperacao).where(eq(codigosRecuperacao.usuarioId, id));
  });
  await encerrarSessoesDoUsuario(banco, id);
  return obterUsuario(banco, id);
}

/** Novo link de convite (sem senha ainda) ou de senha nova (com senha), gerado pelo administrador. */
export async function novoLinkDoUsuario(banco: Banco, id: string) {
  const atual = await obterLinha(banco, id);
  const tipo = atual.senhaHash ? 'redefinicao' : 'convite';
  const token = await criarLink(banco, id, tipo);
  return { tipo, token, usuario: await obterUsuario(banco, id) } as const;
}

/** Conta inicial (linha de comando): Administrador convidado, para o primeiro acesso. */
export async function criarPrimeiroAdministrador(banco: Banco, nome: string, email: string) {
  const [{ n }] = (
    await banco.execute<{ n: number }>(sql`
      select count(*)::int as n from ${usuarios} where not demonstracao`)
  ).rows as [{ n: number }];
  if (n > 0) throw new Error('Já existem usuários: use a tela de usuários para convidar.');
  return convidar(banco, { nome, email, perfis: ['administrador'] });
}

export { iguais };
