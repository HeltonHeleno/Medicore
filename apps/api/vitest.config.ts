import { defineConfig } from 'vitest/config';

/**
 * Testes da API (Fase 24). Cada arquivo de teste ganha um banco novo, migrado, num servidor
 * PostgreSQL 16: o de `TEST_DATABASE_URL` (CI com serviço, ou local) ou um contêiner
 * (Testcontainers) iniciado uma vez para a rodada inteira.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    globalSetup: ['./test/apoio/servidor-postgres.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: { TZ: 'UTC' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // `principal.ts` só liga as peças; o esquema é declarativo (conferido pelos testes de migração).
      exclude: ['src/principal.ts', 'src/banco/esquema.ts'],
      reporter: ['text', 'text-summary', 'html'],
      thresholds: {
        'src/**': { statements: 85, branches: 80, functions: 85, lines: 85 },
      },
    },
  },
});
