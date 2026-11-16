import { abrir, expect, ler, test, toast, valorKpi } from './fixtures.ts';

/** 21.1.3 — alta → higienização → concluir → livre → "Leitos disponíveis" sobe 1. */
test('alta, higienização e o leito volta a contar como disponível', async ({ page }) => {
  await abrir(page, '/');
  const antes = await valorKpi(page, 'Leitos disponíveis');
  const [internacao] = (
    await ler<{ id: string; status: string; leitoId: string }>(page, 'internacoes')
  ).filter((i) => i.status === 'ativa');
  const leito = (await ler<{ id: string; codigo: string }>(page, 'leitos')).find(
    (l) => l.id === internacao.leitoId,
  )!;

  // L3: alta → leito em higienização (ainda não conta como disponível, A13)
  await abrir(page, `/leitos/internacoes/${internacao.id}`);
  await page.getByRole('button', { name: 'Dar alta' }).click();
  const alta = page.getByRole('dialog', { name: /^Dar alta a/ });
  await alta.getByRole('button', { name: 'Registrar alta' }).click();
  await toast(page, `Alta registrada. Leito ${leito.codigo} em higienização`);

  await page.getByRole('link', { name: 'Painel' }).first().click();
  await expect(page.locator('main h1').first()).toBeVisible();
  expect(await valorKpi(page, 'Leitos disponíveis')).toBe(antes);

  // L4: concluir a higienização no mapa → leito livre
  await page.getByRole('link', { name: 'Gestão de leitos' }).first().click();
  await page
    .getByRole('button', { name: `Concluir higienização do leito ${leito.codigo}` })
    .click();
  await toast(page, '1 leito liberado');
  await expect(
    page.getByRole('link', { name: new RegExp(`^${leito.codigo}, Livre`) }),
  ).toBeVisible();

  // O Painel sobe 1, sem recarregar a página
  await page.getByRole('link', { name: 'Painel' }).first().click();
  await expect.poll(() => valorKpi(page, 'Leitos disponíveis')).toBe(antes + 1);
});
