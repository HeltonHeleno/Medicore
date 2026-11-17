import { defineConfig, devices } from '@playwright/test';

const PORTA = 4173;

/**
 * Fase 27 (27.T.1) — Modo API: `E2E_API=http://localhost:3100` e `E2E_DATABASE_URL` (o banco de
 * teste, com o usuário dono das tabelas). Sobem a API (migrada, com as rotas de teste) e o app
 * construído com `VITE_API_URL`. Rodam os cenários 1 a 10 e o acesso, um de cada vez (um banco só).
 */
const API = process.env.E2E_API;
const BANCO = process.env.E2E_DATABASE_URL;
/** Usuário da aplicação no banco de teste (papel `medicore_app`, sem DELETE em movimentações). */
const BANCO_APP = process.env.E2E_DATABASE_URL_APP ?? BANCO;
const servidorApi = API && {
  command: 'npm run db:migrar -w @medicore/api && npx tsx ../api/src/principal.ts',
  url: `${API}/api/v1/saude`,
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
  env: {
    AMBIENTE: 'teste',
    ROTAS_TESTE: 'sim',
    ROTINAS: 'nao',
    LOG_NIVEL: 'warn',
    PORTA: new URL(API).port,
    DATABASE_URL: BANCO_APP ?? '',
    DATABASE_URL_MIGRACAO: BANCO ?? '',
  },
};

/**
 * Testes de ponta a ponta (Fase 14). Rodam contra o build de produção (`vite preview`),
 * com o navegador no fuso do hospital e em português.
 *
 * Primeira vez: `npx playwright install chromium`. Depois: `npm run test:e2e`.
 * Para usar um Chromium já instalado, defina PW_CHROMIUM_PATH com o caminho do executável.
 */
export default defineConfig({
  testDir: './e2e',
  // Modo API: só os cenários de ponta a ponta (27.T.1), um de cada vez.
  // Fase 28: e o acesso (login, MFA, sessão, perfis), que só existe no modo API.
  ...(API ? { testMatch: /(cenario\d+-.*|acesso)\.spec\.ts/ } : { testIgnore: /acesso\.spec\.ts/ }),
  fullyParallel: !API,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: API ? 1 : process.env.CI ? 2 : undefined,
  // Na CI (Fase 22): anotações no PR e o relatório HTML, anexado quando algum teste falha.
  reporter: process.env.CI
    ? [['github'], ['dot'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: `http://localhost:${PORTA}`,
    timezoneId: 'America/Sao_Paulo',
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    ...(servidorApi ? [servidorApi] : []),
    {
      command: `npm run build && npm run preview -- --port ${PORTA} --strictPort`,
      url: `http://localhost:${PORTA}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // Fase 28: o app chama `/api` no próprio endereço e o `vite preview` repassa à API (como o
      // `middleware.ts` na Vercel): o cookie da sessão é do próprio app.
      env: API ? { VITE_API_URL: '/', VITE_API_PROXY: API } : {},
    },
  ],
});
