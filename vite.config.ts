import { readFileSync } from 'node:fs';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string;
};

/**
 * Fase 23 (BL-05.1): com `SENTRY_AUTH_TOKEN` (só no build da Vercel), os mapas de código são
 * gerados, enviados ao Sentry e apagados de `dist/` antes da publicação. Sem o token (local, CI),
 * o build não gera mapas e não fala com o Sentry.
 */
const enviarMapas = Boolean(process.env.SENTRY_AUTH_TOKEN);

// https://vite.dev/config/
export default defineConfig({
  define: {
    __VERSAO_APP__: JSON.stringify(version),
  },
  plugins: [
    react(),
    tailwindcss(),
    enviarMapas &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT ?? 'medicore-web',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: { name: `medicore@${version}` },
        sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
        telemetry: false,
      }),
  ],
  build: {
    sourcemap: enviarMapas ? 'hidden' : false,
    rolldownOptions: {
      output: {
        // Separa as bibliotecas em pacotes com nomes claros e cache independente.
        codeSplitting: {
          // Cada grupo leva só os arquivos que casam com o teste; as dependências
          // compartilhadas ficam onde já estavam.
          includeDependenciesRecursively: false,
          groups: [
            {
              name: 'react',
              priority: 20,
              test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|clsx)[\\/]/,
            },
            // Fase 20: um pacote por módulo operacional (páginas, componentes, serviço e
            // textos). Menos arquivos na lista de pré-carga do pacote inicial (RS-12).
            {
              name: 'modulo-leitos',
              priority: 5,
              test: /src[\\/]((pages|components)[\\/]leitos[\\/]|hooks[\\/]useAcoesLeito)/,
            },
            {
              name: 'modulo-emergencia',
              priority: 5,
              test: /src[\\/]((pages|components)[\\/]emergencia[\\/]|hooks[\\/]useAcoesAtendimento)/,
            },
            {
              name: 'modulo-farmacia',
              priority: 5,
              test: /src[\\/]((pages|components)[\\/]farmacia[\\/])/,
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
