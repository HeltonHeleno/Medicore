import { abrir, expect, ler, test, toast } from './fixtures.ts';

const MEDICAMENTO = 'med-ampicilina-1g'; // classe "Penicilinas", mínimo 30
const PACIENTE = 'pac-ana-silva'; // internada, alérgica a "Penicilina; látex"

interface Lote {
  medicamentoId: string;
  numero: string;
  validade: string;
  quantidadeAtual: number;
  bloqueio?: unknown;
}

const estoqueBaixo = async (page: import('@playwright/test').Page) => {
  const texto = await page
    .getByRole('region', { name: 'Assistente hospitalar com IA' })
    .getByText(/medicamentos? (está|estão) com estoque baixo/)
    .innerText();
  return Number(texto.match(/\d+/)![0]);
};

/**
 * 21.1.4 — entrada de lote → dispensação com FEFO em 2 lotes → alerta de alergia com
 * justificativa → o estoque cruza o mínimo e o Painel sobe → devolução.
 */
test('farmácia: entrada, dispensação com alerta, estoque baixo no Painel e devolução', async ({
  page,
}) => {
  await abrir(page, '/');
  const baixoAntes = await estoqueBaixo(page);

  // F2: entrada de lote
  await abrir(page, `/farmacia/entrada?medicamentoId=${MEDICAMENTO}`);
  await page.getByRole('textbox', { name: /Número do lote/ }).fill('LE2E21');
  await page.getByLabel(/Validade/).fill('2029-06-30');
  await page.getByRole('spinbutton').fill('20');
  await page.getByRole('button', { name: 'Registrar entrada' }).click();
  await toast(page, /Entrada registrada: 20 frascos de Ampicilina sódica 1 g \(lote LE2E21\)/);

  const lotes = (await ler<Lote>(page, 'lotes'))
    .filter((l) => l.medicamentoId === MEDICAMENTO && !l.bloqueio && l.quantidadeAtual > 0)
    .sort((a, b) => a.validade.localeCompare(b.validade));
  const disponivel = lotes.reduce((s, l) => s + l.quantidadeAtual, 0);
  // Deixa exatamente o mínimo (30): cruza o limite e usa mais de um lote pelo FEFO.
  const quantidade = disponivel - 30;
  expect(quantidade).toBeGreaterThan(lotes[0].quantidadeAtual);

  // F3: dispensar com alerta de alergia e quantidade alta
  await abrir(page, `/farmacia/dispensar?pacienteId=${PACIENTE}`);
  await expect(page.getByText('Alergias: Penicilina; látex')).toBeVisible();
  await expect(page.getByRole('combobox', { name: /Médico solicitante/ })).not.toHaveValue('');
  await page.getByRole('combobox', { name: /^Medicamento/ }).selectOption(MEDICAMENTO);
  await page.getByRole('spinbutton').fill(String(quantidade));
  await expect(
    page.getByText(
      new RegExp(
        `${lotes[0].quantidadeAtual} do lote ${lotes[0].numero}.*do lote ${lotes[1].numero}`,
      ),
    ),
  ).toBeVisible();
  await expect(page.getByText(/Possível alergia: penicilina/i)).toBeVisible();
  await page.getByRole('checkbox', { name: /Ciente/ }).check();
  await page
    .getByRole('textbox', { name: /Justificativa/ })
    .fill('Prescrição confirmada com o médico');
  await page.getByRole('checkbox', { name: 'Confirmo a quantidade' }).check();
  await page.getByRole('button', { name: 'Revisar dispensação' }).click();
  const resumo = page.getByRole('dialog', { name: 'Confirmar dispensação' });
  await expect(resumo).toContainText(/Alergia \("penicilina"\) — justificada/i);
  await resumo.getByRole('button', { name: 'Dispensar' }).click();
  await toast(page, 'Dispensação registrada (1 item)');
  await expect(page).toHaveURL(/\/farmacia\/dispensacoes\//);

  // O Painel mostra mais um medicamento com estoque baixo
  await page.getByRole('link', { name: 'Painel' }).first().click();
  await expect.poll(() => estoqueBaixo(page)).toBe(baixoAntes + 1);

  // F4: devolução parcial volta ao lote e tira o medicamento do "baixo"
  await page.goBack();
  await page.getByRole('button', { name: 'Devolver Ampicilina sódica 1 g' }).click();
  const devolver = page.getByRole('alertdialog', { name: 'Devolver Ampicilina sódica 1 g' });
  await devolver.getByRole('spinbutton').fill('5');
  await devolver.getByRole('button', { name: 'Não utilizado' }).click();
  await devolver.getByRole('button', { name: 'Devolver' }).click();
  await toast(page, 'Devolução registrada (5 frascos)');
  await expect(page.getByText('Devolvido: 5 frascos')).toBeVisible();

  await page.getByRole('link', { name: 'Painel' }).first().click();
  await expect.poll(() => estoqueBaixo(page)).toBe(baixoAntes);
});
