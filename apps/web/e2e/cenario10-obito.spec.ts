import { abrir, expect, ler, nomeExibido, test, toast } from './fixtures.ts';

interface Paciente {
  id: string;
  nome: string;
  nomeSocial?: string;
  ativo: boolean;
  motivoInativacao?: string;
}

/**
 * 21.1.7 — paciente internado com consulta futura → alta por óbito → cadastro inativo,
 * consulta cancelada e o paciente não aparece mais para a chegada na emergência (R-X7).
 */
test('óbito na alta inativa o cadastro e cancela as consultas futuras', async ({ page }) => {
  await abrir(page, '/');
  const internacao = (
    await ler<{ id: string; pacienteId: string; status: string }>(page, 'internacoes')
  ).find((i) => i.status === 'ativa')!;
  const paciente = (await ler<Paciente>(page, 'pacientes')).find(
    (p) => p.id === internacao.pacienteId,
  )!;
  const nome = nomeExibido(paciente);

  // Consulta futura para o paciente internado: o agendamento avisa (R-X8), mas permite.
  await abrir(
    page,
    `/consultas/nova?pacienteId=${paciente.id}&medicoId=med-paulo-mendes&data=2026-11-24`,
  );
  await expect(page.getByText(/^Paciente internado em /)).toBeVisible();
  const horario = page.getByRole('radio').and(page.locator(':not([aria-disabled="true"])')).first();
  await horario.click();
  await page.getByRole('button', { name: 'Agendar', exact: true }).click();
  await toast(page, /Consulta agendada/);
  const consulta = (
    await ler<{ id: string; pacienteId: string; status: string; inicio: string }>(page, 'consultas')
  ).find((c) => c.pacienteId === paciente.id && c.inicio.startsWith('2026-11-24'))!;
  expect(consulta.status).toBe('agendada');

  // L3 com óbito: segunda confirmação com o aviso da R-X7
  await abrir(page, `/leitos/internacoes/${internacao.id}`);
  await page.getByRole('button', { name: 'Dar alta' }).click();
  const alta = page.getByRole('dialog', { name: /^Dar alta a/ });
  await alta.getByRole('radio', { name: 'Óbito' }).check();
  await alta.getByRole('button', { name: 'Registrar alta' }).click();
  const confirmacao = page.getByRole('alertdialog', { name: /Registrar óbito de/ });
  await expect(confirmacao).toContainText(/cadastro do paciente será inativado/);
  await confirmacao.getByRole('button', { name: 'Registrar óbito' }).click();
  await toast(page, /Alta registrada/);

  // Cadastro inativo com o motivo; consulta futura cancelada
  await abrir(page, `/pacientes/${paciente.id}`);
  await expect(page.getByText('Inativo', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Óbito em \d{2}\/\d{2}\/\d{4}/)).toBeVisible();
  const depois = (
    await ler<{ id: string; status: string; motivoCancelamento?: string }>(page, 'consultas')
  ).find((c) => c.id === consulta.id)!;
  expect(depois).toMatchObject({ status: 'cancelada', motivoCancelamento: 'Óbito do paciente' });
  // Sem as ações de internar e de registrar chegada
  await expect(page.getByRole('link', { name: 'Registrar chegada na emergência' })).toHaveCount(0);

  // A chegada na emergência não oferece o paciente
  await abrir(page, '/emergencia/chegada');
  await page.getByRole('combobox', { name: /Paciente/ }).fill(paciente.nome);
  await expect(page.getByText('Nenhum resultado').first()).toBeVisible();
  await expect(page.getByRole('option', { name: new RegExp(nome) })).toHaveCount(0);
});
