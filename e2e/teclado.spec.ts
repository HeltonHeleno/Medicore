import { expect, test, toast } from './fixtures.ts';

/**
 * 14.3.1 / 14.3.2 — fluxos só com teclado: resumo de erros e foco, anúncio de rota,
 * Combobox, SeletorHorario, MenuAcoes, Modal, Toast e DataTable.
 */

test('formulário: resumo de erros com foco no 1º campo e links que levam ao campo', async ({
  page,
}) => {
  await page.goto('/pacientes/novo');
  const nome = page.getByRole('textbox', { name: /^Nome completo/ });
  await expect(nome).toBeFocused(); // a tela abre no 1º campo
  await page.getByRole('button', { name: 'Salvar' }).focus();
  await page.keyboard.press('Enter');
  const resumo = page.getByRole('alert').filter({ hasText: /campos precisam de correção/ });
  await expect(resumo).toBeVisible();
  await expect(nome).toBeFocused();
  // Cada item do resumo é um link para o campo.
  await resumo.getByRole('link', { name: /^Sexo/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: /^Sexo/ })).toBeFocused();
});

test('anúncio de rota ao navegar pelo menu', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Pacientes', exact: true }).first().focus();
  await page.keyboard.press('Enter');
  await expect(
    page.locator('[aria-live="polite"]').filter({ hasText: 'Página: Pacientes' }),
  ).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeVisible();
});

test('agendar só com teclado: Combobox, SeletorHorario e aviso', async ({ page }) => {
  await page.goto('/consultas/nova?medicoId=med-paulo-mendes&data=2026-11-18');
  const paciente = page.getByRole('combobox', { name: /^Paciente/ });
  await paciente.focus();
  await page.keyboard.type('ana paula');
  await expect(page.getByRole('option', { name: /Ana Paula Silva/ })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(paciente).toHaveValue(/Ana Paula Silva/);

  // SeletorHorario: Tab entra no grupo; setas movem o foco; Espaço escolhe.
  const primeiro = page.getByRole('radio', { name: /^08:00$/ });
  await primeiro.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const escolhido = page.getByRole('radio', { name: /^09:00$/ });
  await expect(escolhido).toBeFocused();
  await page.keyboard.press('Space');
  await expect(escolhido).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('End');
  await expect(page.getByRole('radio').last()).toBeFocused();

  await page.getByRole('button', { name: 'Agendar', exact: true }).focus();
  await page.keyboard.press('Enter');
  await toast(page, /Consulta agendada: .* às 09:00/);
  // O aviso pode ser fechado pelo teclado.
  const fechar = page.getByRole('button', { name: 'Fechar notificação' }).first();
  await fechar.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('region', { name: 'Notificações' }).getByText(/Consulta agendada/),
  ).toHaveCount(0);
});

test('MenuAcoes e Modal: abrir com Enter, setas no menu, Esc fecha e devolve o foco', async ({
  page,
}) => {
  await page.goto('/pacientes');
  const tabela = page.getByRole('table', { name: 'Lista de pacientes' });
  const botao = tabela.getByRole('button', { name: /^Mais ações para / }).first();
  await botao.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(botao).toBeFocused();

  await page.keyboard.press('Enter');
  const inativar = page.getByRole('menuitem', { name: 'Inativar' });
  for (let i = 0; i < 6 && !(await inativar.evaluate((e) => e === document.activeElement)); i++)
    await page.keyboard.press('ArrowDown');
  await expect(inativar).toBeFocused();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('alertdialog');
  await expect(dialogo).toBeVisible();
  // O foco fica preso no diálogo.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialogo.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialogo).toHaveCount(0);
  await expect(botao).toBeFocused();
});

test('DataTable: ordenar pelo cabeçalho e abrir o cadastro com Enter', async ({ page }) => {
  await page.goto('/pacientes');
  const tabela = page.getByRole('table', { name: 'Lista de pacientes' });
  const idade = tabela.getByRole('button', { name: 'Idade' });
  await idade.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/ordenarPor=idade/);
  await expect(tabela.getByRole('columnheader', { name: /Idade/ })).toHaveAttribute(
    'aria-sort',
    /ascending|descending/,
  );
  const primeiro = tabela.getByRole('rowheader').first().getByRole('link');
  const nome = await primeiro.innerText();
  await primeiro.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: nome })).toBeVisible();
});

test('SeletorLeito só com teclado: setas, Home, End e Espaço (17.12)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main h1').first()).toBeVisible();
  // Paciente ativo sem internação, atendimento nem pedido (os dados de exemplo variam o nome).
  const livre = await page.evaluate(() => {
    const ler = (c: string) => JSON.parse(localStorage.getItem(`medicore:${c}:v1`) ?? '[]');
    const ocupados = new Set([
      ...ler('internacoes')
        .filter((i: { status: string }) => i.status === 'ativa')
        .map((i: { pacienteId: string }) => i.pacienteId),
      ...ler('atendimentos')
        .filter((a: { status: string }) => a.status !== 'encerrado')
        .map((a: { pacienteId?: string }) => a.pacienteId),
      ...ler('solicitacoes_leito')
        .filter((s: { status: string }) => s.status === 'pendente' || s.status === 'reservada')
        .map((s: { pacienteId: string }) => s.pacienteId),
    ]);
    const adulto = (n: string) => new Date(n) < new Date('2000-01-01');
    return ler('pacientes').find(
      (p: { id: string; ativo: boolean; dataNascimento: string }) =>
        p.ativo && adulto(p.dataNascimento) && !ocupados.has(p.id),
    ).id as string;
  });
  await page.goto(`/leitos/internar?pacienteId=${livre}`);
  const grupo = page.getByRole('radiogroup', { name: /Leito/ });
  const radios = grupo.getByRole('radio');
  await expect(radios.first()).toHaveAccessibleName(/Sugerido/);
  await radios.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(radios.nth(1)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('End');
  await expect(radios.last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(radios.first()).toBeFocused();
  // Os incompatíveis continuam focáveis, com o motivo no nome, mas não são escolhidos.
  const incompativel = grupo.locator('[role="radio"][aria-disabled="true"]').first();
  await incompativel.focus();
  await expect(incompativel).toHaveAccessibleName(/Perfil|isolamento|setor/i);
  await page.keyboard.press('Space');
  await expect(incompativel).toHaveAttribute('aria-checked', 'false');
});

test('grade de leitos: Tab segue a ordem visual (link do leito, menu, ação rápida, próximo)', async ({
  page,
}) => {
  await page.goto('/leitos?setor=uti');
  const primeiro = page.getByRole('link', { name: /^UTI-01,/ });
  await primeiro.focus();
  const visitados: string[] = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    visitados.push(
      await page.evaluate(
        () =>
          document.activeElement?.getAttribute('aria-label') ??
          document.activeElement?.textContent ??
          '',
      ),
    );
  }
  const iUti02 = visitados.findIndex((x) => x.startsWith('UTI-02,'));
  expect(iUti02, visitados.join(' | ')).toBeGreaterThan(0);
  expect(
    visitados.slice(0, iUti02).every((x) => /UTI-01/.test(x)),
    visitados.join(' | '),
  ).toBe(true);
});
