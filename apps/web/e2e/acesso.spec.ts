/**
 * Fase 28 (28.T.3) — Acesso de ponta a ponta (só no modo API, que tem login):
 * - convite → senha → segundo fator (QR/chave) → códigos de recuperação → entrar de novo com o código;
 * - a sessão termina com o formulário preenchido: entrar de novo ali mesmo, sem perder nada (E-19);
 * - a Recepção não vê "Dar alta"; a Farmácia não vê a triagem nem "Registrar chegada".
 */
import { createHmac } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { abrir, API_TESTE, entrarComo, expect, ler, test, toast } from './fixtures.ts';

/** TOTP (RFC 6238) da chave base32, no instante informado. */
function totp(chave: string, instante: number): string {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of chave.replace(/=+$/, ''))
    bits += alfabeto.indexOf(c).toString(2).padStart(5, '0');
  const bytes = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const passo = Buffer.alloc(8);
  passo.writeBigUInt64BE(BigInt(Math.floor(instante / 1000 / 30)));
  const h = createHmac('sha1', bytes).update(passo).digest();
  const o = h[h.length - 1]! & 0xf;
  return ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}

test.describe('com o perfil Administrador', () => {
  test.use({ conta: 'administrador' });

  test('convite, senha, segundo fator e nova entrada com o código', async ({ page, relogio }) => {
    const inicio = Date.now();
    /** O relógio do servidor anda junto com o do teste. */
    const agoraServidor = () => relogio.getTime() + (Date.now() - inicio);
    const email = `gestora.${Date.now()}@hospital.com`;
    const senha = 'rio azul de outono comprido';

    await abrir(page, '/configuracoes');
    await page.getByRole('button', { name: 'Convidar usuário' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Convidar usuário' });
    await dialogo.getByRole('textbox', { name: /Nome/ }).fill('Gestora Exemplo');
    await dialogo.getByRole('textbox', { name: /E-mail/ }).fill(email);
    await dialogo.getByRole('checkbox', { name: 'Gestão' }).check();
    await dialogo.getByRole('button', { name: 'Salvar' }).click();
    // Sem e-mail configurado no teste: o link aparece para o administrador enviar.
    const link = await page.getByRole('textbox', { name: 'Link para a pessoa' }).inputValue();
    expect(link).toMatch(/\/primeiro-acesso#/);
    await page
      .getByRole('dialog', { name: 'Link para a pessoa' })
      .getByRole('button', { name: 'Fechar janela' })
      .click();
    await expect(page.getByRole('cell', { name: new RegExp(email) })).toBeVisible();

    // Sai e abre o link do convite.
    await page.getByRole('button', { name: /menu do usuário/i }).click();
    await page.getByRole('menuitem', { name: 'Sair' }).click();
    await expect(page.getByRole('heading', { name: 'Entrar no MediCore' })).toBeVisible();
    await page.goto(new URL(link).pathname + new URL(link).hash);
    await expect(page.getByText('Olá, Gestora Exemplo.')).toBeVisible();
    await page.getByLabel(/^Nova senha/).fill('curta');
    await page.getByLabel(/^Confirme a nova senha/).fill('curta');
    await page.getByRole('button', { name: 'Definir a senha' }).click();
    await expect(page.getByText('A senha precisa ter 12 caracteres ou mais.')).toBeVisible();
    await page.getByLabel(/^Nova senha/).fill(senha);
    await page.getByLabel(/^Confirme a nova senha/).fill(senha);
    await page.getByRole('button', { name: 'Definir a senha' }).click();

    // Gestão exige o segundo fator: QR code e a chave para digitar.
    await expect(
      page.getByRole('heading', { name: 'Proteja sua conta com o segundo fator' }),
    ).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'QR code para o aplicativo autenticador' }),
    ).toBeVisible();
    const chave = (await page.getByTestId('chave-mfa').textContent())!.trim();
    await page.getByRole('textbox', { name: /^Código/ }).fill('000000');
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(/Código incorreto/)).toBeVisible();
    await page.getByRole('textbox', { name: /^Código/ }).fill(totp(chave, agoraServidor()));
    await page.getByRole('button', { name: 'Confirmar' }).click();
    const codigos = page.getByRole('list', { name: 'Código de recuperação' }).getByRole('listitem');
    await expect(codigos).toHaveCount(10);
    await page.getByRole('button', { name: 'Guardei os códigos' }).click();
    await expect(page.locator('main h1').first()).toBeVisible();

    // Sai e entra de novo: e-mail, senha e o código do aplicativo.
    await page.getByRole('button', { name: /menu do usuário/i }).click();
    await page.getByRole('menuitem', { name: 'Sair' }).click();
    await page.getByRole('textbox', { name: /E-mail/ }).fill(email);
    await page.getByLabel(/^Senha/).fill(senha);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Código de verificação' })).toBeVisible();
    await page.getByRole('textbox', { name: /^Código/ }).fill(totp(chave, agoraServidor()));
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.getByRole('button', { name: /menu do usuário/i }).click();
    await expect(page.getByRole('menu').getByText('Gestora Exemplo')).toBeVisible();
  });
});

test('sem sessão, o sistema leva ao login e volta para a tela pedida', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/pacientes');
  await expect(page).toHaveURL(/\/entrar\?volta=%2Fpacientes/);
  await page.getByRole('button', { name: 'Entrar como Recepção' }).click();
  await expect(page).toHaveURL(/\/pacientes$/);
  await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible();
});

test('a sessão termina com o formulário preenchido: entra de novo e nada se perde', async ({
  page,
}) => {
  await abrir(page, '/pacientes/novo');
  const nome = page.getByRole('textbox', { name: /^Nome completo/ });
  await nome.fill('Paciente Que Não Pode Sumir');
  // O servidor encerra todas as sessões (como depois de 30 min sem uso).
  const r = await page.request.post(`${API_TESTE}/sessoes/encerrar`);
  expect(r.ok()).toBe(true);
  // A conferência do CPF ao sair do campo vai ao servidor (R-P1): 401.
  await page.getByRole('textbox', { name: /^CPF/ }).fill('529.982.247-25');
  await page.getByRole('textbox', { name: /^Data de nascimento/ }).focus();
  const aviso = page.getByRole('alertdialog', { name: 'Sua sessão terminou' });
  await expect(aviso).toBeVisible();
  await aviso
    .getByRole('button', { name: 'Entrar como Equipe completa (todos os perfis)' })
    .click();
  await expect(aviso).toBeHidden();
  await expect(nome).toHaveValue('Paciente Que Não Pode Sumir');
  await expect(page.getByRole('textbox', { name: /^CPF/ })).toHaveValue('529.982.247-25');
});

test.describe('com o perfil Recepção', () => {
  test.use({ conta: 'recepcao' });

  test('vê a internação, mas não "Dar alta" nem "Transferir"', async ({ page }) => {
    const [internacao] = (await ler<{ id: string; status: string }>(page, 'internacoes')).filter(
      (i) => i.status === 'ativa',
    );
    await abrir(page, `/leitos/internacoes/${internacao!.id}`);
    await expect(page.getByRole('link', { name: 'Ver paciente' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dar alta' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Transferir' })).toHaveCount(0);
    // Mas cadastra paciente.
    await abrir(page, '/pacientes');
    await expect(page.getByRole('link', { name: 'Novo paciente' })).toBeVisible();
  });
});

test.describe('com o perfil Farmácia', () => {
  test.use({ conta: 'farmacia' });

  test('não vê a triagem nem "Registrar chegada"; a API também recusa (E-20)', async ({ page }) => {
    await abrir(page, '/emergencia');
    await expect(page.getByRole('heading', { name: /Aguardando triagem/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Triar/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Registrar chegada' })).toHaveCount(0);
    // Indo direto à triagem, a gravação é recusada pelo servidor com a mensagem do perfil.
    const [atendimento] = (await ler<{ id: string; status: string }>(page, 'atendimentos')).filter(
      (a) => a.status === 'aguardando_triagem',
    );
    await abrir(page, `/emergencia/${atendimento!.id}/triagem`);
    await page.getByRole('textbox', { name: /Frequência cardíaca/ }).fill('112');
    await page.getByRole('radio', { name: /Amarelo/ }).check();
    await page.getByRole('button', { name: 'Registrar triagem' }).click();
    await toast(page, 'Seu perfil não permite fazer a triagem. Fale com o administrador.');
  });
});

test.describe('acessibilidade das telas novas (28.F.1)', () => {
  test.use({ conta: 'administrador' });

  for (const rota of [
    '/configuracoes',
    '/configuracoes?aba=auditoria',
    '/pacientes/pac-ana-silva/titular',
    '/entrar',
    '/esqueci-senha',
    '/redefinir-senha#token',
  ]) {
    test(`axe sem violações em ${rota}`, async ({ page }) => {
      if (!rota.startsWith('/configuracoes') && !rota.startsWith('/pacientes')) {
        await page.context().clearCookies();
      }
      await page.goto(rota);
      await expect(page.locator('h1').first()).toBeVisible();
      const r = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    });
  }
});

test.describe('auditoria (Fase 29)', () => {
  test.use({ conta: 'recepcao' });

  test('a Gestão vê quem abriu o cadastro, no paciente e na auditoria', async ({ page }) => {
    // A Recepção abre o cadastro da Ana.
    await abrir(page, '/pacientes/pac-ana-silva');
    // Agora entra a Gestão (o cookie da sessão é trocado).
    await entrarComo(page, 'gestao');
    await abrir(page, '/pacientes/pac-ana-silva');
    const historico = page.getByRole('region', { name: 'Histórico de acesso' });
    await expect(historico.getByText('Recepção (demonstração)').first()).toBeVisible();
    await expect(historico.getByText('cadastro, CPF completo, alergias').first()).toBeVisible();
    await historico.getByRole('link', { name: 'Ver tudo na auditoria' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Auditoria' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Paciente (id)' })).toHaveValue('pac-ana-silva');
    await expect(page.getByRole('cell', { name: 'Recepção (demonstração)' }).first()).toBeVisible();
    // O CSV baixa com o cookie da sessão.
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Exportar CSV' }).click();
    expect((await download).suggestedFilename()).toBe('auditoria.csv');
  });
});
