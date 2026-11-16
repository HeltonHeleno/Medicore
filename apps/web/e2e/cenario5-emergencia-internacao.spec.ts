import {
  abrir,
  escolherPaciente,
  expect,
  ler,
  nomeExibido,
  pacienteLivre,
  registrarChegadaSemIdentificacao,
  test,
  toast,
  triar,
} from './fixtures.ts';

/**
 * 21.1.2 — chegada sem identificação → triar laranja → vincular a um cadastro → chamar →
 * pedir leito na UTI → reservar no mapa → internar → paciente no mapa e no Painel.
 */
test('emergência até a internação, passando pelo mapa de leitos', async ({ page }) => {
  await abrir(page, '/');
  const paciente = await pacienteLivre(page);
  const nome = nomeExibido(paciente);

  // E1 e E2
  const { id, numero } = await registrarChegadaSemIdentificacao(page, 'Homem, jaqueta verde');
  await expect(page).toHaveURL(new RegExp(`/emergencia/${id}/triagem`));
  await triar(page, id, /^Laranja/);
  await expect(page).toHaveURL(/\/emergencia$/);
  await expect(page.locator(`[data-atendimento="${numero}"]`)).toContainText('Laranja');

  // E7: vincular ao cadastro
  await abrir(page, `/emergencia/${id}`);
  await page.getByRole('button', { name: 'Identificar paciente' }).first().click();
  const vincular = page.getByRole('dialog', { name: `Identificar paciente — ${numero}` });
  await escolherPaciente(vincular, nome);
  await vincular.getByRole('button', { name: 'Vincular' }).click();
  await toast(page, new RegExp(`${numero} vinculado`));
  await expect(page.getByRole('heading', { level: 1 })).toContainText(nome);

  // E3: chamar
  await page.getByRole('button', { name: 'Chamar para atendimento' }).click();
  const chamar = page.getByRole('dialog', { name: `Chamar ${numero}` });
  await chamar.getByRole('combobox', { name: /Médico/ }).selectOption('med-marcos-ribeiro');
  await chamar.getByRole('button', { name: 'Chamar' }).click();
  await toast(page, new RegExp(`${numero} chamado`));

  // E6: pedir leito na UTI
  await page.getByRole('button', { name: 'Pedir leito (internação)' }).click();
  const pedir = page.getByRole('dialog', { name: `Pedir leito — ${numero}` });
  await pedir.getByRole('combobox', { name: /Setor desejado/ }).selectOption('uti');
  await pedir.getByRole('button', { name: 'Pedir leito' }).click();
  await toast(page, /Leito solicitado/);

  // L6: reservar e internar pelo mapa
  await abrir(page, '/leitos');
  const pedidos = page.getByRole('region', { name: /Pedidos de leito/ });
  const item = pedidos.getByRole('listitem').filter({ hasText: nome });
  await item.getByRole('button', { name: 'Reservar' }).click();
  const reservar = page.getByRole('dialog', { name: /Reservar leito para/ });
  await reservar.getByRole('radio').first().click();
  await reservar.getByRole('button', { name: 'Reservar' }).click();
  await toast(page, /Leito UTI-\d+ reservado/);

  await item.getByRole('link', { name: 'Internar' }).click();
  await expect(page.getByText(/Pelo pedido de leito: Emergência E-/)).toBeVisible();
  await expect(page.getByRole('radio', { checked: true })).toHaveAccessibleName(/^UTI-/);
  await page.getByRole('button', { name: 'Internar', exact: true }).click();
  await toast(page, /internado\(a\) no leito UTI-\d+/);

  const internacao = (
    await ler<{ id: string; pacienteId: string; status: string; atendimentoId?: string }>(
      page,
      'internacoes',
    )
  ).find((i) => i.pacienteId === paciente.id && i.status === 'ativa')!;
  expect(internacao.atendimentoId).toBe(id);
  await expect(page).toHaveURL(new RegExp(`/leitos/internacoes/${internacao.id}`));
  const atendimento = (await ler<{ id: string; status: string }>(page, 'atendimentos')).find(
    (a) => a.id === id,
  )!;
  expect(atendimento.status).toBe('encerrado');

  // O paciente aparece no mapa (busca) e no Painel (ocupação da UTI e linha do tempo)
  await abrir(page, '/leitos');
  await page.getByRole('searchbox', { name: /Buscar paciente/ }).fill(nome);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: '1 leito encontrado' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: new RegExp(`^UTI-\\d+, Ocupado, ${nome}, .*Dia 1`) }),
  ).toBeVisible();

  await abrir(page, '/');
  await expect(page.getByRole('listitem', { name: 'UTI: 23 de 30 leitos ocupados' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Linha do tempo de atividades' })).toContainText(
    `Paciente ${nome} internado no leito UTI-`,
  );
});
