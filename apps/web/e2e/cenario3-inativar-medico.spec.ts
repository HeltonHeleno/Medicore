import { expect, test, toast } from './fixtures.ts';

/** 14.2.3 — inativar médico com consultas futuras → bloqueio → cancelar → inativar (P8). */
test('inativação do médico fica bloqueada até cancelar as consultas futuras', async ({ page }) => {
  await page.goto('/medicos/med-rafael-costa');
  await page.getByRole('button', { name: 'Mais ações para Dr. Rafael Costa' }).click();
  await page.getByRole('menuitem', { name: 'Inativar' }).click();
  const dialogo = page.getByRole('alertdialog', { name: 'Inativar Dr. Rafael Costa?' });
  const inativar = dialogo.getByRole('button', { name: 'Inativar' });
  const cancelar = dialogo.getByRole('button', { name: /^Cancelar consulta de / });

  // Bloqueado enquanto houver consultas futuras.
  await expect(dialogo).toContainText(/consultas? futuras? agendadas?/);
  await expect(inativar).toBeDisabled();
  const total = await cancelar.count();
  expect(total).toBeGreaterThan(0);

  // Cancela uma a uma dentro do próprio diálogo.
  for (let restantes = total; restantes > 0; restantes--) {
    await cancelar.first().click();
    await dialogo
      .getByRole('textbox', { name: 'Motivo do cancelamento' })
      .fill('Médico de licença');
    await dialogo.getByRole('button', { name: 'Confirmar cancelamento' }).click();
    await expect(cancelar).toHaveCount(restantes - 1);
  }

  await expect(dialogo).toContainText('Não há consultas futuras');
  await expect(inativar).toBeEnabled();
  await dialogo.getByRole('textbox', { name: 'Motivo da inativação (opcional)' }).fill('Licença');
  await inativar.click();
  await toast(page, 'Médico inativado.');
  await expect(page.getByText(/Médico inativo desde 09\/11\/2026 — motivo: Licença/)).toBeVisible();

  // O médico some do agendamento.
  await page.goto('/consultas/nova');
  await expect(
    page.getByRole('combobox', { name: /^Médico/ }).locator('option', { hasText: 'Rafael Costa' }),
  ).toHaveCount(0);
});
