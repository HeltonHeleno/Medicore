import { defineConfig, devices } from '@playwright/test';

const PORTA = 4173;

/**
 * Testes de ponta a ponta (Fase 14). Rodam contra o build de produção (`vite preview`),
 * com o navegador no fuso do hospital e em português.
 *
 * Primeira vez: `npx playwright install chromium`. Depois: `npm run test:e2e`.
 * Para usar um Chromium já instalado, defina PW_CHROMIUM_PATH com o caminho do executável.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
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
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
