import { AGORA, abrir, expect, ler, novaAba, test, toast } from './fixtures.ts';

interface Internacao {
  id: string;
  status: string;
  leitoId: string;
}
interface Atendimento {
  id: string;
  numero: string;
  status: string;
  pacienteId?: string;
}

/**
 * 21.1.6 — desfazer alta (L8), reabrir atendimento (E9) e estornar dispensação (F8) dentro
 * das janelas; depois do prazo (relógio adiantado), o botão some e o aviso explica (E-18).
 */
test('correções dentro da janela e depois do prazo', async ({ page, context }) => {
  await abrir(page, '/');
  const [internacao, outraInternacao] = (await ler<Internacao>(page, 'internacoes')).filter(
    (i) => i.status === 'ativa',
  );
  // Alta vale em "em atendimento" e "em observação" (matriz de ações); o primeiro é reaberto.
  const [atendimento, outroAtendimento] = (await ler<Atendimento>(page, 'atendimentos'))
    .filter((a) => ['em_atendimento', 'em_observacao'].includes(a.status) && a.pacienteId)
    .sort(
      (a, b) => (a.status === 'em_atendimento' ? -1 : 0) - (b.status === 'em_atendimento' ? -1 : 0),
    );
  const darAlta = async (id: string) => {
    await abrir(page, `/leitos/internacoes/${id}`);
    await page.getByRole('button', { name: 'Dar alta' }).click();
    await page
      .getByRole('dialog', { name: /^Dar alta a/ })
      .getByRole('button', { name: 'Registrar alta' })
      .click();
    await toast(page, /Alta registrada\. Leito .* em higienização/);
  };
  const encerrar = async (a: Atendimento) => {
    await abrir(page, `/emergencia/${a.id}`);
    await page.getByRole('button', { name: 'Encerrar atendimento' }).click();
    const d = page.getByRole('dialog', { name: `Encerrar ${a.numero}` });
    await d.getByRole('radio', { name: 'Alta' }).check();
    await d.getByRole('button', { name: 'Encerrar' }).click();
    await toast(page, new RegExp(`Atendimento ${a.numero} encerrado: alta`));
  };
  const dispensar = async (quantidade: number) => {
    await abrir(page, '/farmacia/dispensar?pacienteId=pac-g-043');
    await expect(page.getByRole('combobox', { name: /Médico solicitante/ })).not.toHaveValue('');
    await page.getByRole('combobox', { name: /^Medicamento/ }).selectOption('med-captopril-25');
    await page.getByRole('spinbutton').fill(String(quantidade));
    await page.getByRole('button', { name: 'Revisar dispensação' }).click();
    await page
      .getByRole('dialog', { name: 'Confirmar dispensação' })
      .getByRole('button', { name: 'Dispensar' })
      .click();
    await toast(page, 'Dispensação registrada (1 item)');
    await expect(page).toHaveURL(/\/farmacia\/dispensacoes\/[^/]+$/);
    return page.url().split('/').at(-1)!;
  };
  const saldo = async (medicamentoId: string) =>
    (await ler<{ medicamentoId: string; quantidadeAtual: number }>(page, 'lotes'))
      .filter((l) => l.medicamentoId === medicamentoId)
      .reduce((s, l) => s + l.quantidadeAtual, 0);

  // L8: dar alta e desfazer — o paciente volta ao mesmo leito
  await darAlta(internacao.id);
  await page.getByRole('button', { name: 'Desfazer alta' }).click();
  const desfazer = page.getByRole('alertdialog', { name: /Desfazer a alta/ });
  await desfazer
    .getByRole('textbox', { name: /Motivo da correção/ })
    .fill('Alta no paciente errado');
  await desfazer.getByRole('button', { name: 'Desfazer alta' }).click();
  await toast(page, 'Alta desfeita. O paciente voltou ao leito.');
  const leito = (
    await ler<{ id: string; status: string; internacaoId?: string }>(page, 'leitos')
  ).find((l) => l.id === internacao.leitoId)!;
  expect(leito).toMatchObject({ status: 'ocupado', internacaoId: internacao.id });

  // E9: encerrar e reabrir pelo "Desfazer" do aviso
  await encerrar(atendimento);
  await page
    .getByRole('region', { name: 'Notificações' })
    .getByRole('button', { name: 'Desfazer' })
    .click();
  const reabrir = page.getByRole('alertdialog', { name: `Reabrir ${atendimento.numero}?` });
  await reabrir
    .getByRole('textbox', { name: /Motivo da correção/ })
    .fill('Alta registrada por engano');
  await reabrir.getByRole('button', { name: 'Reabrir' }).click();
  await toast(page, `Atendimento ${atendimento.numero} reaberto`);
  expect(
    (await ler<Atendimento>(page, 'atendimentos')).find((a) => a.id === atendimento.id)!.status,
  ).toBe('em_atendimento');

  // F8: dispensar e estornar — o estoque volta
  const antes = await saldo('med-captopril-25');
  await dispensar(6);
  expect(await saldo('med-captopril-25')).toBe(antes - 6);
  await page.getByRole('button', { name: 'Estornar dispensação' }).click();
  const estornar = page.getByRole('alertdialog', { name: 'Estornar a dispensação?' });
  await estornar.getByRole('button', { name: 'Duplicidade' }).click();
  await estornar.getByRole('button', { name: 'Estornar dispensação' }).click();
  await toast(page, 'Dispensação estornada');
  await expect(page.getByText('Estornada', { exact: true })).toBeVisible();
  expect(await saldo('med-captopril-25')).toBe(antes);

  // Novas correções que ficarão para depois do prazo
  await darAlta(outraInternacao.id);
  await encerrar(outroAtendimento);
  const dispensacao = await dispensar(2);

  // 25 h depois (outra aba com o relógio adiantado): os três prazos venceram
  const depois = await novaAba(context, new Date(AGORA.getTime() + 25 * 3_600_000));
  await abrir(depois, `/leitos/internacoes/${outraInternacao.id}`);
  await expect(
    depois.getByText(/Não é mais possível desfazer: o prazo de 6 h terminou/),
  ).toBeVisible();
  await expect(depois.getByRole('button', { name: 'Desfazer alta' })).toHaveCount(0);
  await expect(depois.getByRole('link', { name: 'Internar novamente' })).toBeVisible();

  await abrir(depois, `/emergencia/${outroAtendimento.id}`);
  await expect(depois.getByText(/prazo de 2 h terminou/)).toBeVisible();
  await expect(depois.getByRole('button', { name: 'Reabrir atendimento' })).toHaveCount(0);

  await abrir(depois, `/farmacia/dispensacoes/${dispensacao}`);
  await expect(depois.getByText(/prazo de 24 h terminou/)).toBeVisible();
  await expect(depois.getByRole('button', { name: 'Estornar dispensação' })).toHaveCount(0);
});
