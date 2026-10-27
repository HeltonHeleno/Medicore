import { expect, novaAba, test, toast } from './fixtures.ts';

const DIA = '2026-11-24'; // terça, fora da janela dos dados de exemplo
const url = (pacienteId: string) =>
  `/consultas/nova?pacienteId=${pacienteId}&medicoId=med-paulo-mendes&data=${DIA}`;

/** 14.2.4 — duas abas agendando o mesmo horário: a segunda recebe E-04 e nada é gravado em dobro. */
test('duas abas escolhem o mesmo horário; a segunda é avisada', async ({ page, context }) => {
  const outra = await novaAba(context);
  await page.goto(url('pac-ana-silva'));
  await outra.goto(url('pac-lucas-ferreira'));

  for (const aba of [page, outra]) {
    await aba.getByRole('radio', { name: /^10:00$/ }).click();
    await expect(aba.getByRole('radio', { name: /^10:00/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  }

  // A primeira aba salva.
  await page.getByRole('button', { name: 'Agendar', exact: true }).click();
  await toast(page, /Consulta agendada: .* às 10:00/);

  // A segunda é avisada pelo evento `storage` antes mesmo de salvar...
  await expect(
    outra.getByText('O horário 10:00 não está mais disponível. Escolha outro.'),
  ).toBeVisible();
  await expect(outra.getByRole('radio', { name: /^10:00/ })).toHaveAttribute(
    'aria-label',
    /Ocupado/,
  );
  // ...e, se tentar salvar assim mesmo, o formulário pede outro horário.
  await outra.getByRole('button', { name: 'Agendar', exact: true }).click();
  await expect(outra).toHaveURL(/\/consultas\/nova/);
  await expect(outra.getByRole('alert').filter({ hasText: 'Escolha um horário' })).toBeVisible();

  const total = await outra.evaluate(
    (dia) =>
      (
        JSON.parse(localStorage.getItem('medicore:consultas:v1')!) as {
          medicoId: string;
          inicio: string;
        }[]
      ).filter((c) => c.medicoId === 'med-paulo-mendes' && c.inicio === `${dia}T13:00:00.000Z`)
        .length,
    DIA,
  );
  expect(total).toBe(1);
});

/** Variante sem o evento `storage` (atrasado): a segunda aba só descobre ao salvar (E-04). */
test('sem o aviso entre abas, a segunda recebe E-04 ao salvar', async ({ page, context }) => {
  const outra = await novaAba(context);
  // A segunda aba deixa de reconhecer os avisos de outras abas.
  await outra.addInitScript(() => {
    window.addEventListener('storage', (e) => e.stopImmediatePropagation(), { capture: true });
  });
  await page.goto(url('pac-ana-silva'));
  await outra.goto(url('pac-lucas-ferreira'));
  for (const aba of [page, outra]) await aba.getByRole('radio', { name: /^10:00$/ }).click();

  await page.getByRole('button', { name: 'Agendar', exact: true }).click();
  await toast(page, /Consulta agendada: .* às 10:00/);
  await expect(outra.getByRole('radio', { name: /^10:00/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  await outra.getByRole('button', { name: 'Agendar', exact: true }).click();
  await expect(
    outra.getByText('Este horário acabou de ser ocupado', { exact: true }),
  ).toBeVisible();
  await expect(outra).toHaveURL(/\/consultas\/nova/);
});
