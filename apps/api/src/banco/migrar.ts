/**
 * Fase 24 (24.2.6) — Aplica as migrações de `drizzle/`. Idempotente: rodar de novo não muda nada.
 * Uso: `npm run db:migrar` (com `DATABASE_URL_MIGRACAO` ou `DATABASE_URL`).
 */
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { conectar, desconectar } from './conexao';

/** `apps/api/drizzle`, tanto rodando de `src/banco/` (tsx) quanto de `dist/` (build). */
export const PASTA_MIGRACOES = fileURLToPath(
  new URL(import.meta.url.includes('/dist/') ? '../drizzle' : '../../drizzle', import.meta.url),
);

export async function migrar(url: string, pasta = PASTA_MIGRACOES): Promise<void> {
  const banco = conectar(url, 1);
  try {
    await migrate(banco, { migrationsFolder: pasta });
  } finally {
    await desconectar(banco);
  }
}

// Linha de comando (`npm run db:…`): exercitada pela CI e pelo Docker Compose, não pelo Vitest.
/* v8 ignore start */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL_MIGRACAO || process.env.DATABASE_URL;
  if (!url) {
    console.error('Defina DATABASE_URL_MIGRACAO (ou DATABASE_URL).');
    process.exit(2);
  }
  await migrar(url);
  console.log('Migrações aplicadas.');
}
/* v8 ignore stop */
