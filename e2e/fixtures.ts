/**
 * Base dos testes de ponta a ponta.
 * - Cada teste roda num contexto novo do navegador: `localStorage` vazio, então os
 *   dados de exemplo são semeados de novo na primeira tela.
 * - O relógio do navegador é fixado (`page.clock`) antes de abrir a aplicação, para que
 *   os dados de exemplo (relativos a "agora") e os horários livres sejam sempre os mesmos.
 */
import {
  test as base,
  expect,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';

/** Segunda-feira, 09/11/2026, 09:40 no fuso do hospital. */
export const AGORA = new Date('2026-11-09T09:40:00-03:00');

/** Abre outra aba no mesmo contexto (mesmo `localStorage`), com o mesmo relógio. */
export async function novaAba(context: BrowserContext, relogio: Date = AGORA): Promise<Page> {
  const aba = await context.newPage();
  await aba.clock.install({ time: relogio });
  return aba;
}

/** Apaga os dados gravados (os dados de exemplo voltam no próximo carregamento). */
export async function limparDados(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const chave of Object.keys(localStorage)) {
      if (chave.startsWith('medicore:')) localStorage.removeItem(chave);
    }
  });
}

/** Espera um aviso (toast) com o texto informado. */
export const toast = (page: Page, texto: string | RegExp) =>
  expect(page.getByRole('region', { name: 'Notificações' }).getByText(texto)).toBeVisible();

export const test = base.extend<{ relogio: Date }>({
  relogio: [AGORA, { option: true }],
  page: async ({ page, relogio }, use) => {
    await page.clock.install({ time: relogio });
    await use(page);
  },
});

export { expect };

// ---------------------------------------------------------------------------
// Fase 21 — ajudantes dos módulos operacionais (cenários 5 a 10)
// ---------------------------------------------------------------------------

/**
 * Lê uma coleção gravada. As coleções dos módulos são semeadas na primeira leitura (depois da
 * primeira pintura), então espera a chave existir.
 */
export async function ler<T>(page: Page, colecao: string): Promise<T[]> {
  const chave = `medicore:${colecao}:v1`;
  await page.waitForFunction((k) => localStorage.getItem(k) !== null, chave);
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), chave);
}

/** Abre a rota e espera o título da página (as rotas são carregadas sob demanda). */
export async function abrir(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.locator('main h1').first()).toBeVisible();
}

interface PacienteE2e {
  id: string;
  nome: string;
  nomeSocial?: string;
  ativo: boolean;
  dataNascimento: string;
  alergias?: string;
}

/** Nome exibido (o social, quando houver). */
export const nomeExibido = (p: { nome: string; nomeSocial?: string }) => p.nomeSocial || p.nome;

/**
 * Paciente adulto e ativo, sem internação ativa, atendimento aberto nem pedido de leito.
 * `pular` escolhe outro da mesma lista (para dois pacientes diferentes no mesmo teste).
 */
export async function pacienteLivre(
  page: Page,
  { pular = 0, semAlergias = true }: { pular?: number; semAlergias?: boolean } = {},
): Promise<PacienteE2e> {
  const [pacientes, internacoes, atendimentos, pedidos] = await Promise.all([
    ler<PacienteE2e>(page, 'pacientes'),
    ler<{ pacienteId: string; status: string }>(page, 'internacoes'),
    ler<{ pacienteId?: string; status: string }>(page, 'atendimentos'),
    ler<{ pacienteId: string; status: string }>(page, 'solicitacoes_leito'),
  ]);
  const ocupados = new Set([
    ...internacoes.filter((i) => i.status === 'ativa').map((i) => i.pacienteId),
    ...atendimentos.filter((a) => a.status !== 'encerrado').map((a) => a.pacienteId),
    ...pedidos
      .filter((s) => s.status === 'pendente' || s.status === 'reservada')
      .map((s) => s.pacienteId),
  ]);
  const limite = '2008-11-09'; // 18 anos completos em AGORA
  const lista = pacientes
    .filter(
      (p) =>
        p.ativo &&
        !ocupados.has(p.id) &&
        p.dataNascimento <= limite &&
        (!semAlergias || !p.alergias?.trim()),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const p = lista[pular];
  if (!p) throw new Error('Sem paciente livre nos dados de exemplo');
  return p;
}

/** Valor de um card de indicador do Painel ("Leitos disponíveis", "Casos de emergência"...). */
export async function valorKpi(page: Page, titulo: string): Promise<number> {
  const card = page
    .getByRole('region', { name: 'Indicadores do dia' })
    .getByRole('heading', { name: titulo })
    .locator('..');
  await expect(card).toContainText(/\d/);
  const texto = await card.innerText();
  return Number(
    texto
      .replace(titulo, '')
      .match(/\d[\d.]*/)![0]
      .replace(/\./g, ''),
  );
}

/** Escolhe um paciente no `ComboboxPaciente` digitando o nome. */
export async function escolherPaciente(escopo: Page | Locator, nome: string) {
  const campo = escopo.getByRole('combobox', { name: /Paciente/ });
  await campo.fill(nome);
  const pagina = 'page' in escopo ? (escopo as Locator).page() : (escopo as Page);
  await pagina
    .getByRole('option', { name: new RegExp(nome) })
    .first()
    .click();
  await expect(campo).toHaveValue(new RegExp(nome));
}

/** E1 pela tela: chegada sem identificação. Devolve o id e o número do atendimento. */
export async function registrarChegadaSemIdentificacao(
  page: Page,
  descricao: string,
  queixa = 'Dor torácica',
): Promise<{ id: string; numero: string }> {
  await abrir(page, '/emergencia/chegada');
  await page.getByRole('radio', { name: 'Sem identificação' }).check();
  await page.getByRole('textbox', { name: /Descrição/ }).fill(descricao);
  await page.getByRole('combobox', { name: /Sexo/ }).selectOption('masculino');
  await page.getByRole('textbox', { name: /Idade aproximada/ }).fill('45');
  await page.getByRole('textbox', { name: /Queixa principal/ }).fill(queixa);
  await page.getByRole('button', { name: 'Registrar chegada' }).click();
  await toast(page, /Chegada registrada: E-\d{4}/);
  const a = (
    await ler<{ id: string; numero: string; provisorio?: { descricao: string } }>(
      page,
      'atendimentos',
    )
  ).find((x) => x.provisorio?.descricao === descricao)!;
  return { id: a.id, numero: a.numero };
}

/** E2 pela tela: triagem com FC e SpO₂ e a cor escolhida. */
export async function triar(page: Page, id: string, cor: RegExp): Promise<void> {
  if (!page.url().endsWith(`/emergencia/${id}/triagem`))
    await abrir(page, `/emergencia/${id}/triagem`);
  await page.getByRole('textbox', { name: /Frequência cardíaca/ }).fill('112');
  await page.getByRole('textbox', { name: /Saturação de O₂/ }).fill('94');
  await page.getByRole('radio', { name: cor }).check();
  await page.getByRole('button', { name: 'Registrar triagem' }).click();
  await toast(page, /Triagem registrada/);
}
