import { defineConfig } from 'drizzle-kit';

/** `npm run db:gerar` compara `src/banco/esquema.ts` com as migrações e gera a próxima. */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/banco/esquema.ts',
  out: './drizzle',
  casing: 'snake_case',
});
