import { AGORA, expect, test, toast } from './fixtures.ts';

/** 14.2.1 — cadastrar paciente → agendar → ver no Painel → concluir. */
test('cadastrar paciente, agendar, ver no Painel e concluir', async ({ page }) => {
  // 1. Cadastro (P1)
  await page.goto('/pacientes/novo');
  await page.getByRole('textbox', { name: /^Nome completo/ }).fill('Zuleica Prado');
  await page.getByRole('textbox', { name: /^CPF/ }).fill('52998224725');
  await page.getByLabel(/^Data de nascimento/).fill('1985-03-10');
  await page.getByRole('combobox', { name: /^Sexo/ }).selectOption('feminino');
  await page.getByRole('textbox', { name: /^Telefone\s*\(/ }).fill('11987654321');
  await page.getByRole('checkbox', { name: /autoriza o uso dos dados/ }).check();
  await page.getByRole('button', { name: 'Salvar' }).click();
  await toast(page, 'Paciente cadastrado.');
  await expect(page.getByRole('heading', { level: 1, name: 'Zuleica Prado' })).toBeVisible();
  await expect(page.getByText('529.982.247-25').or(page.getByText('***.982.247-**'))).toBeVisible();

  // 2. Agendamento (P9) a partir do cadastro
  await page.getByRole('link', { name: 'Agendar consulta' }).first().click();
  await expect(page).toHaveURL(/\/consultas\/nova\?pacienteId=/);
  await page.getByRole('combobox', { name: /^Médico/ }).selectOption('med-paulo-mendes');
  const horario = page.getByRole('radio').and(page.locator(':not([aria-disabled="true"])')).first();
  const hora = (await horario.innerText()).trim().slice(0, 5);
  await horario.click();
  await expect(horario).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Agendar', exact: true }).click();
  await toast(page, new RegExp(`Consulta agendada: .* às ${hora} com Dr\\. Paulo Mendes`));
  await expect(
    page.getByRole('heading', { level: 1, name: 'Consulta de Zuleica Prado' }),
  ).toBeVisible();

  // 3. O Painel mostra a consulta e a atividade, sem recarregar nada à mão
  await page.getByRole('link', { name: 'Painel' }).first().click();
  // O card vira lista quando é estreito; o localizador vale para as duas formas.
  const linha = page
    .getByRole('region', { name: 'Consultas de hoje' })
    .locator('tr:visible, li:visible')
    .filter({ hasText: 'Zuleica Prado' });
  await expect(linha).toContainText(hora);
  await expect(linha).toContainText('Agendada');
  const atividades = page.getByRole('region', { name: 'Linha do tempo de atividades' });
  await expect(atividades.getByRole('listitem').first()).toContainText(
    'Consulta agendada: Zuleica Prado com Dr. Paulo Mendes',
  );

  // 4. Depois do horário, conclui (P12) e o Painel acompanha
  const [h, m] = hora.split(':').map(Number);
  const inicio = new Date(AGORA);
  inicio.setUTCHours(h + 3, m + 10, 0, 0); // 10 min depois do início (UTC−3)
  await page.clock.setSystemTime(inicio);
  await linha.getByRole('link', { name: 'Zuleica Prado' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Concluir' }).click();
  await toast(page, 'Consulta concluída.');
  await page.getByRole('link', { name: 'Painel' }).first().click();
  await expect(linha).toContainText('Concluída');
  await expect(atividades.getByRole('listitem').first()).toContainText(
    'Consulta concluída com Zuleica Prado',
  );
});
