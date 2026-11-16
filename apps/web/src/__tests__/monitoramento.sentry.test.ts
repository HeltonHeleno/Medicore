import { describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(() => 'evento-1'),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
}));
vi.mock('@sentry/browser', () => sentry);

const { iniciar, capturar, ambiente } = await import('../monitoramento/sentry');

describe('configuração do SDK (D34)', () => {
  iniciar('https://chave@o0.ingest.sentry.io/1');
  const opcoes = sentry.init.mock.calls[0]![0] as Record<string, unknown> & {
    integrations: (p: { name: string }[]) => { name: string }[];
    beforeSend: (e: object) => object;
    beforeBreadcrumb: (m: object) => object | null;
    beforeSendSpan: (s: { name: string }) => { name: string };
  };

  it('versão, ambiente, 10% de desempenho e nada de dados pessoais na coleta', () => {
    expect(opcoes).toMatchObject({
      dsn: 'https://chave@o0.ingest.sentry.io/1',
      release: `medicore@${__VERSAO_APP__}`,
      environment: ambiente(),
      tracesSampleRate: 0.1,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
    });
    expect(ambiente()).toBe('desenvolvimento');
  });

  it('tira o GlobalHandlers (a captura global é nossa) e liga a medição de navegação', () => {
    const nomes = opcoes
      .integrations([{ name: 'GlobalHandlers' }, { name: 'Breadcrumbs' }])
      .map((i) => i.name);
    expect(nomes).toEqual(['Breadcrumbs', 'BrowserTracing']);
  });

  it('beforeSend, beforeBreadcrumb e beforeSendSpan passam pela limpeza', () => {
    window.history.pushState({}, '', '/emergencia/ate-3');
    expect(opcoes.beforeSend({ message: 'CPF 12345678909', user: { id: 'x' } })).toEqual({
      message: 'CPF [cpf]',
      contexts: undefined,
      tags: { origem: 'global', rota: '/emergencia/:id' },
    });
    expect(
      opcoes.beforeSend({ tags: { origem: 'rota', rota: '/x', paciente: 'Ana' } }),
    ).toMatchObject({ tags: { origem: 'rota', rota: '/x' } });
    expect(opcoes.beforeBreadcrumb({ category: 'ui.input', message: 'x' })).toBeNull();
    expect(opcoes.beforeSendSpan({ name: '/pacientes/pac-ana' }).name).toBe('/pacientes/:id');
  });

  it('capturar marca a origem e a rota sem parâmetros', () => {
    window.history.pushState({}, '', '/leitos/lei-uti-01?busca=Ana');
    expect(capturar(new Error('x'), 'dados')).toBe('evento-1');
    expect(sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { origem: 'dados', rota: '/leitos/:id' },
    });
  });
});
