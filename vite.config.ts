import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Separa as bibliotecas em pacotes com nomes claros e cache independente.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              priority: 20,
              test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|clsx)[\\/]/,
            },
            {
              name: 'graficos',
              priority: 10,
              test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|es-toolkit|decimal\.js-light|immer|reselect|redux|@reduxjs[\\/]toolkit|redux-thunk|react-redux|use-sync-external-store|eventemitter3|tiny-invariant)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    passWithNoTests: true,
    // Os testes de ponta a ponta (Playwright) ficam em e2e/ e rodam com `npm run test:e2e`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    // Roda em UTC para provar que as datas usam o fuso do hospital, não o do computador (M3).
    env: { TZ: 'UTC' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/pages/UiShowcase.tsx',
        'src/pages/vitrine/**',
      ],
      reporter: ['text', 'text-summary', 'html'],
      // Metas: utils/ ≥ 90% e services/ ≥ 85% (Fase 8); components/ui/ ≥ 70%.
      thresholds: {
        'src/utils/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'src/services/**': { statements: 85, branches: 85, functions: 85, lines: 85 },
        'src/components/ui/**': { statements: 70, branches: 70, functions: 70, lines: 70 },
      },
    },
  },
});
