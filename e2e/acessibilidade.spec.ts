import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/** 14.2.5 — axe em todas as rotas, nos temas claro e escuro. */
const ROTAS = [
  '/',
  '/pacientes',
  '/pacientes?busca=ana&status=todos',
  '/pacientes/novo',
  '/pacientes/pac-ana-silva',
  '/pacientes/pac-ana-silva/editar',
  '/medicos',
  '/medicos/novo',
  '/medicos/med-paulo-mendes',
  '/medicos/med-paulo-mendes/editar',
  '/consultas',
  '/consultas?status=pendentes',
  '/consultas?visao=medico',
  '/consultas/nova?pacienteId=pac-ana-silva&medicoId=med-paulo-mendes',
  '/consultas/con-hoje-1030',
  '/consultas/con-hoje-1200/editar',
  '/perfil',
  '/leitos',
  '/emergencia',
  '/farmacia',
  '/analises',
  '/configuracoes',
  '/pacientes/nao-existe',
  '/rota-que-nao-existe',
];

const REGRAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function semViolacoes(page: Page) {
  // Espera os dados chegarem (sem esqueletos) antes de analisar.
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  const { violations } = await new AxeBuilder({ page }).withTags(REGRAS).analyze();
  const resumo = violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );
  expect(resumo).toEqual([]);
}

for (const tema of ['claro', 'escuro'] as const) {
  test.describe(`tema ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        (valor) => localStorage.setItem('medicore-tema', valor),
        tema === 'claro' ? 'light' : 'dark',
      );
    });

    for (const rota of ROTAS) {
      test(`axe: ${rota}`, async ({ page }) => {
        await page.goto(rota);
        await semViolacoes(page);
      });
    }

    test('axe: formulário com erros (resumo aberto)', async ({ page }) => {
      await page.goto('/pacientes/novo');
      await page.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByText(/campos precisam de correção/)).toBeVisible();
      await semViolacoes(page);
    });

    test('axe: diálogo de cancelamento aberto', async ({ page }) => {
      await page.goto('/consultas/con-hoje-1200');
      await page.getByRole('button', { name: 'Cancelar consulta' }).first().click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await semViolacoes(page);
    });

    test('axe: busca de paciente (combobox) aberta', async ({ page }) => {
      await page.goto('/consultas/nova');
      await page.getByRole('combobox', { name: /^Paciente/ }).fill('ana');
      await expect(page.getByRole('option').first()).toBeVisible();
      await semViolacoes(page);
    });

    test('axe: celular (375px) no Painel, na lista e na agenda', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      for (const rota of ['/', '/pacientes', '/consultas']) {
        await page.goto(rota);
        await semViolacoes(page);
        const largura = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(largura, `rolagem horizontal em ${rota}`).toBeLessThanOrEqual(375);
      }
    });
  });
}
