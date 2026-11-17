/**
 * Fase 28 (BL-02, R-AU1, R-AU5) — Senhas, tokens e TOTP.
 *
 * - Senha: Argon2id (parâmetros mínimos da OWASP: 19 MiB, 2 passadas). Nunca volta em resposta, log
 *   ou monitoramento.
 * - Tokens (cookie de sessão, links de convite e de redefinição): 32 bytes aleatórios; o banco guarda
 *   só o SHA-256.
 * - TOTP (RFC 6238): 6 dígitos, 30 s, SHA-1 (o que os aplicativos autenticadores aceitam), com uma
 *   janela de ±1 passo para relógios um pouco fora.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { SENHAS_COMUNS } from './senhas-comuns';

const ARGON2 = {
  algorithm: 2 /* Argon2id */,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const hashSenha = (senha: string) => hash(senha, ARGON2);

export async function senhaConfere(hashGravado: string | null | undefined, senha: string) {
  // Sem hash (conta sem senha), confere contra um hash qualquer: o tempo de resposta é o mesmo.
  try {
    return await verify(hashGravado ?? HASH_FALSO, senha);
  } catch {
    return false;
  }
}
const HASH_FALSO =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$4i5lsiJbIQumi7uE8Z5PGhSo2zR6g+/QUHdXyk7ImDY';

export const TAMANHO_MINIMO_SENHA = 12;
const COMUNS = new Set(SENHAS_COMUNS);

/**
 * BL-02.2: a senha nova tem 12 caracteres ou mais e não está na lista de senhas conhecidas — nem ela,
 * nem a parte de letras dela ("Senha2026!!!!" vira "senha"). Devolve o motivo, ou `null` se serve.
 */
export function problemaDaSenha(senha: string, email?: string): 'curta' | 'comum' | null {
  if (senha.length < TAMANHO_MINIMO_SENHA) return 'curta';
  const minuscula = senha.toLowerCase();
  const letras = minuscula.normalize('NFD').replace(/[^a-z]/g, '');
  const usuario = email?.split('@')[0]?.toLowerCase();
  if (COMUNS.has(minuscula) || (letras.length >= 3 && COMUNS.has(letras))) return 'comum';
  if (usuario && usuario.length >= 4 && minuscula.includes(usuario)) return 'comum';
  if (new Set(minuscula).size <= 3) return 'comum';
  if (
    '01234567890123456789'.includes(minuscula) ||
    'qwertyuiopasdfghjklzxcvbnm'.includes(minuscula)
  )
    return 'comum';
  return null;
}

// ─────────── tokens ───────────

export const novoToken = () => randomBytes(32).toString('base64url');
export const resumoToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function iguais(a: string, b: string): boolean {
  const x = createHash('sha256').update(a).digest();
  const y = createHash('sha256').update(b).digest();
  return timingSafeEqual(x, y);
}

// ─────────── TOTP ───────────

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function paraBase32(bytes: Buffer): string {
  let bits = 0;
  let valor = 0;
  let saida = '';
  for (const byte of bytes) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      saida += BASE32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) saida += BASE32[(valor << (5 - bits)) & 31];
  return saida;
}

export function deBase32(texto: string): Buffer {
  const limpo = texto.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let valor = 0;
  const saida: number[] = [];
  for (const c of limpo) {
    const i = BASE32.indexOf(c);
    if (i < 0) throw new Error('base32 inválido');
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      saida.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(saida);
}

export const novoSegredoTotp = () => paraBase32(randomBytes(20));

export const PASSO_TOTP_S = 30;

/** Código de 6 dígitos de um passo (RFC 4226/6238). */
export function codigoTotp(segredo: string, passo: number): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(passo));
  const hmac = createHmac('sha1', deBase32(segredo)).update(contador).digest();
  const deslocamento = hmac[hmac.length - 1]! & 0xf;
  const numero = (hmac.readUInt32BE(deslocamento) & 0x7fffffff) % 1_000_000;
  return String(numero).padStart(6, '0');
}

/** Confere o código no passo atual e nos vizinhos (±30 s). */
export function totpConfere(segredo: string, codigo: string, agoraMs: number): boolean {
  if (!/^\d{6}$/.test(codigo)) return false;
  const passo = Math.floor(agoraMs / 1000 / PASSO_TOTP_S);
  return [-1, 0, 1].some((d) => iguais(codigoTotp(segredo, passo + d), codigo));
}

/** `otpauth://` para o QR code (o aplicativo mostra "MediCore" e o e-mail). */
export const uriTotp = (segredo: string, email: string) =>
  `otpauth://totp/${encodeURIComponent(`MediCore:${email}`)}?secret=${segredo}&issuer=MediCore&algorithm=SHA1&digits=6&period=${PASSO_TOTP_S}`;

/** Dez códigos de recuperação, `ABCD-EFGH`, sem letras ambíguas. */
export function novosCodigosRecuperacao(): string[] {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 10 }, () => {
    const b = randomBytes(8);
    const c = [...b].map((x) => alfabeto[x % alfabeto.length]).join('');
    return `${c.slice(0, 4)}-${c.slice(4)}`;
  });
}

export const normalizarCodigoRecuperacao = (codigo: string) =>
  codigo.toUpperCase().replace(/[^A-Z0-9]/g, '');
