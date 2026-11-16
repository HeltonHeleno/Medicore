import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/** 14.2.5 — axe em todas as rotas, nos temas claro e escuro. */
const ROTAS = [
  '/',
  '/pacientes',
  '/pacientes?busca=ana&status=todos',
  '/pacientes/novo',
  '/pacientes/pac-ana-silva',
  '/pacientes/pac-ana-silva/editar',
  '/medicos',
  '/medicos/novo',
  '/medicos/med-paulo-mendes',
  '/medicos/med-paulo-mendes/editar',
  '/consultas',
  '/consultas?status=pendentes',
  '/consultas?visao=medico',
  '/consultas/nova?pacienteId=pac-ana-silva&medicoId=med-paulo-mendes',
  '/consultas/con-hoje-1030',
  '/consultas/con-hoje-1200/editar',
  '/perfil',
  '/leitos',
  '/leitos?setor=uti&situacao=livre',
  '/leitos/internar',
  '/leitos/internacoes',
  '/leitos/internacoes?situacao=encerrada',
  '/leitos/internacoes/int-1',
  '/leitos/internacoes/int-1/editar',
  '/leitos/lei-uti-01',
  '/leitos/internacoes/nao-existe',
  '/emergencia?aba=alertas',
  '/emergencia?mostrar=laranja',
  '/emergencia/chegada',
  '/emergencia/historico',
  '/emergencia/ate-1',
  '/emergencia/ate-1/triagem',
  '/emergencia/nao-existe',
  '/farmacia?situacao=baixo',
  '/farmacia/medicamentos/novo',
  '/farmacia/medicamentos/med-dipirona-500',
  '/farmacia/medicamentos/med-dipirona-500/editar',
  '/farmacia/entrada?medicamentoId=med-dipirona-500',
  '/farmacia/dispensar',
  '/farmacia/dispensacoes/dis-1',
  '/farmacia/movimentacoes',
  '/farmacia/vencimentos',
  '/farmacia/controlados',
  '/farmacia/medicamentos/nao-existe',
  '/emergencia',
  '/farmacia',
  '/analises',
  '/configuracoes',
  '/pacientes/nao-existe',
  '/rota-que-nao-existe',
];

const REGRAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function semViolacoes(page: Page) {
  // Espera os dados chegarem (sem esqueletos) antes de analisar.
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  const { violations } = await new AxeBuilder({ page }).withTags(REGRAS).analyze();
  const resumo = violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );
  expect(resumo).toEqual([]);
}

for (const tema of ['claro', 'escuro'] as const) {
  test.describe(`tema ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        (valor) => localStorage.setItem('medicore-tema', valor),
        tema === 'claro' ? 'light' : 'dark',
      );
    });

    for (const rota of ROTAS) {
      test(`axe: ${rota}`, async ({ page }) => {
        await page.goto(rota);
        await semViolacoes(page);
      });
    }

    test('axe: formulário com erros (resumo aberto)', async ({ page }) => {
      await page.goto('/pacientes/novo');
      await page.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByText(/campos precisam de correção/)).toBeVisible();
      await semViolacoes(page);
    });

    test('axe: diálogo de cancelamento aberto', async ({ page }) => {
      await page.goto('/consultas/con-hoje-1200');
      await page.getByRole('button', { name: 'Cancelar consulta' }).first().click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await semViolacoes(page);
    });

    test('axe: busca de paciente (combobox) aberta', async ({ page }) => {
      await page.goto('/consultas/nova');
      await page.getByRole('combobox', { name: /^Paciente/ }).fill('ana');
      await expect(page.getByRole('option').first()).toBeVisible();
      await semViolacoes(page);
    });

    test('axe: diálogos de alta e de transferência abertos (17.12)', async ({ page }) => {
      await page.goto('/leitos/internacoes/int-1');
      await page.getByRole('button', { name: 'Dar alta' }).click();
      await expect(page.getByRole('dialog', { name: /^Dar alta a/ })).toBeVisible();
      await semViolacoes(page);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Transferir' }).click();
      const transferir = page.getByRole('dialog', { name: /^Transferir/ });
      await expect(transferir.getByRole('radio').first()).toBeVisible();
      await semViolacoes(page);
    });

    test('axe: diálogo de desfecho e triagem com alerta (18.9.3)', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('main h1').first()).toBeVisible();
      const id = await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('medicore:atendimentos:v1') ?? '[]').find(
            (a: { status: string }) => a.status === 'em_atendimento',
          ).id as string,
      );
      await page.goto(`/emergencia/${id}`);
      await page.getByRole('button', { name: 'Encerrar atendimento' }).click();
      await expect(page.getByRole('dialog', { name: /^Encerrar E-/ })).toBeVisible();
      await semViolacoes(page);
      await page.keyboard.press('Escape');
      await page.goto('/emergencia/ate-1/triagem');
      await page.getByRole('textbox', { name: /Saturação de O₂/ }).fill('85');
      await expect(page.getByText(/Atenção: abaixo de/)).toBeVisible();
      await page.getByRole('radio', { name: /^Laranja/ }).check();
      await semViolacoes(page);
    });

    test('axe: alerta de alergia e resumo da dispensação abertos (19.11.2)', async ({ page }) => {
      await page.goto('/farmacia/dispensar?pacienteId=pac-ana-silva');
      await expect(page.getByText(/Alergias: Penicilina/)).toBeVisible();
      await page
        .getByRole('combobox', { name: /^Medicamento/ })
        .selectOption('med-amoxicilina-500');
      await page.getByRole('spinbutton').fill('7');
      await expect(page.getByText(/Possível alergia/).first()).toBeVisible();
      await semViolacoes(page);
      await page.getByRole('checkbox', { name: /Ciente/ }).check();
      await page
        .getByRole('textbox', { name: /Justificativa/ })
        .fill('Confirmado com o médico assistente');
      await page.getByRole('button', { name: 'Revisar dispensação' }).click();
      await expect(page.getByRole('dialog', { name: 'Confirmar dispensação' })).toBeVisible();
      await semViolacoes(page);
    });

    test('axe: diálogos dos módulos abertos (21.2.1)', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('main h1').first()).toBeVisible();
      await page.waitForFunction(() =>
        ['atendimentos', 'leitos', 'dispensacoes'].every(
          (c) => localStorage.getItem(`medicore:${c}:v1`) !== null,
        ),
      );
      const ids = await page.evaluate(() => {
        const ler = (c: string) =>
          JSON.parse(localStorage.getItem(`medicore:${c}:v1`) ?? '[]') as {
            id: string;
            status: string;
            pacienteId?: string;
            provisorio?: unknown;
          }[];
        const at = ler('atendimentos');
        return {
          aguardando: at.find((a) => a.status === 'aguardando_atendimento')!.id,
          emAtendimento: at.find((a) => a.status === 'em_atendimento' && a.pacienteId)!.id,
          provisorio: at.find((a) => a.status !== 'encerrado' && a.provisorio)?.id,
          dispensacao: ler('dispensacoes').find((d) => d.status === 'realizada')!.id,
          leitoLivre: ler('leitos').find((l) => l.status === 'livre')!.id,
        };
      });
      const abrirDialogo = async (url: string, botao: string | RegExp, nome: RegExp) => {
        await page.goto(url);
        await page.getByRole('button', { name: botao }).first().click();
        await expect(
          page
            .getByRole('dialog', { name: nome })
            .or(page.getByRole('alertdialog', { name: nome })),
        ).toBeVisible();
        await semViolacoes(page);
        await page.keyboard.press('Escape');
      };
      await abrirDialogo(`/emergencia/${ids.aguardando}`, 'Chamar para atendimento', /^Chamar E-/);
      await abrirDialogo(
        `/emergencia/${ids.emAtendimento}`,
        'Pedir leito (internação)',
        /^Pedir leito — E-/,
      );
      await abrirDialogo(
        `/emergencia/${ids.emAtendimento}`,
        'Registrar sinais vitais',
        /sinais vitais/i,
      );
      if (ids.provisorio) {
        await abrirDialogo(
          `/emergencia/${ids.provisorio}`,
          'Identificar paciente',
          /^Identificar paciente — E-/,
        );
      }
      await abrirDialogo('/leitos', 'Nova solicitação', /Pedir leito \(internação eletiva\)/);
      await abrirDialogo('/leitos', 'Reservar', /Reservar leito para/);
      await abrirDialogo(`/leitos/${ids.leitoLivre}`, /^Bloquear/, /Bloquear/);
      await abrirDialogo(`/farmacia/dispensacoes/${ids.dispensacao}`, /^Devolver /, /^Devolver /);
      // Estorno só aparece nas primeiras 24 h: uma dispensação nova pela tela.
      await page.goto('/farmacia/dispensar?pacienteId=pac-g-043');
      await expect(page.getByRole('combobox', { name: /Médico solicitante/ })).not.toHaveValue('');
      await page.getByRole('combobox', { name: /^Medicamento/ }).selectOption('med-captopril-25');
      await page.getByRole('spinbutton').fill('2');
      await page.getByRole('button', { name: 'Revisar dispensação' }).click();
      await page
        .getByRole('dialog', { name: 'Confirmar dispensação' })
        .getByRole('button', { name: 'Dispensar' })
        .click();
      await expect(page).toHaveURL(/\/farmacia\/dispensacoes\/[^/]+$/);
      await abrirDialogo(page.url(), 'Estornar dispensação', /Estornar a dispensação/);
    });

    test('axe: celular (375px) no Painel, na lista e na agenda', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      for (const rota of [
        '/',
        '/pacientes',
        '/consultas',
        '/leitos',
        '/emergencia',
        '/emergencia/ate-1',
        '/farmacia',
        '/farmacia/dispensar?pacienteId=pac-ana-silva',
        '/pacientes/pac-ana-silva',
      ]) {
        await page.goto(rota);
        await semViolacoes(page);
        const largura = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(largura, `rolagem horizontal em ${rota}`).toBeLessThanOrEqual(375);
      }
    });
  });
}
