import { defineConfig } from 'vitest/config';

/**
 * Testes do domínio (Fase 24, D22): algoritmos puros, esquemas, erros e dados de exemplo.
 * Rodam em Node e em UTC, para provar que as datas usam o fuso do hospital (M3).
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: { TZ: 'UTC' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Os dados de exemplo são exercitados pelos testes do app e pela semeadura da API.
      exclude: ['src/__tests__/**', 'src/i18n/**', 'src/types/**', 'src/seeds/**'],
      reporter: ['text', 'text-summary', 'html'],
      // Meta do domínio (Plano de melhorias, rotina de fechamento): ≥ 90%; algoritmos como na Fase 8.
      thresholds: {
        lines: 90,
        statements: 90,
        'src/utils/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
      },
    },
  },
});
