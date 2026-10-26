/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

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
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/pages/UiShowcase.tsx',
      ],
      reporter: ['text-summary', 'html'],
      // Meta do plano: mínimo de 70% em utils/ e components/ui/.
      thresholds: {
        'src/utils/**': { statements: 70, branches: 70, functions: 70, lines: 70 },
        'src/components/ui/**': { statements: 70, branches: 70, functions: 70, lines: 70 },
      },
    },
  },
});
