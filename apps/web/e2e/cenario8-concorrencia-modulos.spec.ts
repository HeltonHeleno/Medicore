import type { Page } from '@playwright/test';
import {
  abrir,
  expect,
  ler,
  nomeExibido,
  novaAba,
  pacienteLivre,
  test,
  toast,
} from './fixtures.ts';

/** A aba deixa de reconhecer os avisos de outras abas: só descobre a mudança ao gravar. */
const semAvisoEntreAbas = (aba: Page) =>
  aba.addInitScript(() => {
    window.addEventListener('storage', (e) => e.stopImmediatePropagation(), { capture: true });
  });

/** 21.1.5 — duas abas internando no mesmo leito: a segunda recebe E-11; nada em dobro. */
test('duas abas internam no mesmo leito; a segunda recebe E-11', async ({ page, context }) => {
  await abrir(page, '/');
  const [primeiro, segundo] = [await pacienteLivre(page), await pacienteLivre(page, { pular: 1 })];
  const leito = (
    await ler<{
      id: string;
      codigo: string;
      status: string;
      setorId: string;
      perfil: string;
      isolamento: boolean;
    }>(page, 'leitos')
  ).find(
    (l) =>
      l.status === 'livre' && l.setorId === 'enfermaria' && l.perfil === 'adulto' && !l.isolamento,
  )!;

  const outra = await novaAba(context);
  await semAvisoEntreAbas(outra);
  const preencher = async (aba: Page, pacienteId: string) => {
    await abrir(aba, `/leitos/internar?pacienteId=${pacienteId}&leitoId=${leito.id}`);
    await expect(aba.getByRole('radio', { name: new RegExp(`^${leito.codigo},`) })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await aba
      .getByRole('combobox', { name: /Médico responsável/ })
      .selectOption('med-helena-duarte');
    await aba.getByRole('textbox', { name: /Motivo da internação/ }).fill('Pneumonia comunitária');
  };
  await preencher(page, primeiro.id);
  await preencher(outra, segundo.id);

  await page.getByRole('button', { name: 'Internar', exact: true }).click();
  await toast(
    page,
    new RegExp(`${nomeExibido(primeiro)} internado\\(a\\) no leito ${leito.codigo}`),
  );

  await outra.getByRole('button', { name: 'Internar', exact: true }).click();
  await expect(
    outra.getByText(
      'Este leito acabou de ser ocupado. Os leitos foram atualizados; escolha outro.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(outra).toHaveURL(/\/leitos\/internar/);

  const ativas = (
    await ler<{ leitoId: string; status: string; pacienteId: string }>(page, 'internacoes')
  ).filter((i) => i.leitoId === leito.id && i.status === 'ativa');
  expect(ativas.map((i) => i.pacienteId)).toEqual([primeiro.id]);
});

/** 21.1.5 — duas abas dispensando o último estoque: a segunda recebe E-12; nunca negativo. */
test('duas abas dispensam o último estoque; a segunda recebe E-12', async ({ page, context }) => {
  const MEDICAMENTO = 'med-ceftriaxona-1g'; // 24 frascos em um lote
  await abrir(page, '/');
  const disponivel = (await ler<{ medicamentoId: string; quantidadeAtual: number }>(page, 'lotes'))
    .filter((l) => l.medicamentoId === MEDICAMENTO)
    .reduce((s, l) => s + l.quantidadeAtual, 0);
  const quantidade = disponivel - 4;

  const outra = await novaAba(context);
  await semAvisoEntreAbas(outra);
  const preencher = async (aba: Page, pacienteId: string) => {
    await abrir(aba, `/farmacia/dispensar?pacienteId=${pacienteId}`);
    await expect(aba.getByRole('combobox', { name: /Médico solicitante/ })).not.toHaveValue('');
    await aba.getByRole('combobox', { name: /^Medicamento/ }).selectOption(MEDICAMENTO);
    await aba.getByRole('spinbutton').fill(String(quantidade));
    await aba.getByRole('button', { name: 'Revisar dispensação' }).click();
    await expect(aba.getByRole('dialog', { name: 'Confirmar dispensação' })).toBeVisible();
  };
  await preencher(page, 'pac-ana-silva');
  await preencher(outra, 'pac-g-043');

  await page
    .getByRole('dialog', { name: 'Confirmar dispensação' })
    .getByRole('button', { name: 'Dispensar' })
    .click();
  await toast(page, 'Dispensação registrada (1 item)');

  await outra
    .getByRole('dialog', { name: 'Confirmar dispensação' })
    .getByRole('button', { name: 'Dispensar' })
    .click();
  await expect(
    outra.getByText('Estoque insuficiente: disponível 4 frascos.').first(),
  ).toBeVisible();

  const depois = await ler<{ medicamentoId: string; quantidadeAtual: number }>(page, 'lotes');
  const saldo = depois.filter((l) => l.medicamentoId === MEDICAMENTO);
  expect(saldo.reduce((s, l) => s + l.quantidadeAtual, 0)).toBe(4);
  expect(saldo.every((l) => l.quantidadeAtual >= 0)).toBe(true);
  const dispensacoes = (
    await ler<{ itens: { medicamentoId: string; quantidade: number }[] }>(page, 'dispensacoes')
  ).filter((d) =>
    d.itens.some((i) => i.medicamentoId === MEDICAMENTO && i.quantidade === quantidade),
  );
  expect(dispensacoes).toHaveLength(1);
});
