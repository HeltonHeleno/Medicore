import { expect, gravarDireto, ler, test, toast } from './fixtures.ts';

const DIA = '2026-11-17'; // terça, fora da janela dos dados de exemplo (±7 dias)

/**
 * 14.2.2 — tentar um horário que acabou de ser ocupado → erro → escolher outro.
 * Outra pessoa grava a consulta enquanto o formulário está aberto (sem o evento
 * `storage`, como se ainda não tivesse chegado): o serviço relê os dados ao salvar (E-04).
 */
test('horário ocupado durante o preenchimento: erro e escolha de outro horário', async ({
  page,
}) => {
  await page.goto(`/consultas/nova?pacienteId=pac-ana-silva&medicoId=med-paulo-mendes&data=${DIA}`);
  const nove = page.getByRole('radio', { name: /^09:00/ });
  await nove.click();
  await expect(nove).toHaveAttribute('aria-checked', 'true');

  // Outra pessoa agenda 09:00 com o mesmo médico.
  await gravarDireto<Record<string, unknown> & { id: string }>(page, 'consultas', (lista) => {
    const agora = new Date(Date.now()).toISOString();
    return [
      ...lista,
      {
        ...lista[0],
        id: 'con-e2e-outra-pessoa',
        pacienteId: 'pac-lucas-ferreira',
        medicoId: 'med-paulo-mendes',
        departamentoId: 'cardiologia',
        inicio: `${DIA}T12:00:00.000Z`,
        duracaoMin: 30,
        status: 'agendada',
        motivoCancelamento: undefined,
        eventos: [{ tipo: 'agendada', em: agora }],
        versao: 1,
        criadoEm: agora,
        atualizadoEm: agora,
      },
    ];
  });

  await page.getByRole('button', { name: 'Agendar', exact: true }).click();
  await expect(page.getByText('Este horário acabou de ser ocupado', { exact: true })).toBeVisible();
  // A escolha foi limpa e 09:00 agora aparece ocupado e não pode ser escolhido.
  await expect(nove).toHaveAttribute('aria-label', /Ocupado/);
  await expect(nove).toBeDisabled(); // aria-disabled: continua focável, não escolhível
  await nove.click({ force: true });
  await nove.press('Space');
  await expect(nove).not.toHaveAttribute('aria-checked', 'true');
  await expect(page).toHaveURL(/\/consultas\/nova/);

  // Escolhe outro horário e agenda.
  const nove30 = page.getByRole('radio', { name: /^09:30$/ });
  await nove30.click();
  await page.getByRole('button', { name: 'Agendar', exact: true }).click();
  await toast(page, /Consulta agendada: .* às 09:30 com Dr\. Paulo Mendes/);

  // Nenhuma gravação dupla: uma consulta em cada horário.
  const doDia = (await ler<{ medicoId: string; inicio: string }>(page, 'consultas'))
    .filter((c) => c.medicoId === 'med-paulo-mendes' && c.inicio.startsWith(DIA))
    .map((c) => c.inicio)
    .sort();
  expect(doDia).toEqual([`${DIA}T12:00:00.000Z`, `${DIA}T12:30:00.000Z`]);
});
