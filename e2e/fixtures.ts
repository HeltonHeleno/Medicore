/**
 * Base dos testes de ponta a ponta.
 * - Cada teste roda num contexto novo do navegador: `localStorage` vazio, então os
 *   dados de exemplo são semeados de novo na primeira tela.
 * - O relógio do navegador é fixado (`page.clock`) antes de abrir a aplicação, para que
 *   os dados de exemplo (relativos a "agora") e os horários livres sejam sempre os mesmos.
 */
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

/** Segunda-feira, 09/11/2026, 09:40 no fuso do hospital. */
export const AGORA = new Date('2026-11-09T09:40:00-03:00');

/** Abre outra aba no mesmo contexto (mesmo `localStorage`), com o mesmo relógio. */
export async function novaAba(context: BrowserContext, relogio: Date = AGORA): Promise<Page> {
  const aba = await context.newPage();
  await aba.clock.install({ time: relogio });
  return aba;
}

/** Apaga os dados gravados (os dados de exemplo voltam no próximo carregamento). */
export async function limparDados(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const chave of Object.keys(localStorage)) {
      if (chave.startsWith('medicore:')) localStorage.removeItem(chave);
    }
  });
}

/** Espera um aviso (toast) com o texto informado. */
export const toast = (page: Page, texto: string | RegExp) =>
  expect(page.getByRole('region', { name: 'Notificações' }).getByText(texto)).toBeVisible();

export const test = base.extend<{ relogio: Date }>({
  relogio: [AGORA, { option: true }],
  page: async ({ page, relogio }, use) => {
    await page.clock.install({ time: relogio });
    await use(page);
  },
});

export { expect };
