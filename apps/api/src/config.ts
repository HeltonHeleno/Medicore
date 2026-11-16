/**
 * Fase 24 (24.2.1) — Configuração da API, lida das variáveis de ambiente e validada com zod.
 * Uma variável errada impede a API de subir, com a lista do que está errado (sem os valores).
 */
import { z } from 'zod';

export const AMBIENTES = [
  'desenvolvimento',
  'teste',
  'homologacao',
  'demonstracao',
  'producao',
] as const;
export type Ambiente = (typeof AMBIENTES)[number];

const esquema = z.object({
  PORTA: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  AMBIENTE: z.enum(AMBIENTES).default('desenvolvimento'),
  /** Conexão da aplicação: usuário do papel `medicore_app` (sem UPDATE/DELETE em movimentações). */
  DATABASE_URL: z.string().url(),
  /** Conexão de quem roda as migrações (dono das tabelas). Sem ela, usa a `DATABASE_URL`. */
  DATABASE_URL_MIGRACAO: z.string().url().optional(),
  /** Tamanho do pool de conexões. */
  BANCO_CONEXOES: z.coerce.number().int().min(1).max(100).default(10),
  LOG_NIVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Monitoramento (BL-05.2). Sem a chave, nenhum erro sai do servidor. */
  SENTRY_DSN: z.string().url().optional(),
  /** Publica a documentação em `/api/v1/docs` (desligar só se a produção exigir). */
  DOCS: z
    .enum(['sim', 'nao'])
    .default('sim')
    .transform((v) => v === 'sim'),
});

export type Config = z.infer<typeof esquema>;

export class ErroConfiguracao extends Error {
  readonly problemas: string[];
  constructor(problemas: string[]) {
    super(`Configuração inválida:\n- ${problemas.join('\n- ')}`);
    this.name = 'ErroConfiguracao';
    this.problemas = problemas;
  }
}

/** Lê e valida a configuração. As mensagens citam o nome da variável, nunca o valor. */
export function lerConfig(ambiente: Record<string, string | undefined> = process.env): Config {
  const vazioComoAusente = Object.fromEntries(
    Object.entries(ambiente).filter(([, v]) => v !== undefined && v !== ''),
  );
  const resultado = esquema.safeParse(vazioComoAusente);
  if (!resultado.success) {
    throw new ErroConfiguracao(
      resultado.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    );
  }
  return resultado.data;
}
