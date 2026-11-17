/** Fase 28 — O repasse de `/api/*` para a API na Vercel (`middleware.ts`). */
import { repassarParaApi } from '../borda/proxy-api';

describe('repasse /api → API', () => {
  it('mantém caminho, busca, método, corpo e cookie; troca o Host', async () => {
    const buscar = vi.fn(async () => new Response('{}', { status: 201 }));
    const r = await repassarParaApi(
      new Request('https://medicore.vercel.app/api/v1/pacientes?busca=ana', {
        method: 'POST',
        headers: {
          cookie: 'medicore_sessao=abc',
          'x-csrf-token': 'c',
          host: 'medicore.vercel.app',
        },
        body: '{"nome":"Ana"}',
      }),
      'https://api-xyz.a.run.app',
      buscar,
    );
    expect(r.status).toBe(201);
    const [url, init] = buscar.mock.calls[0] as unknown as [URL, RequestInit & { duplex?: string }];
    expect(String(url)).toBe('https://api-xyz.a.run.app/api/v1/pacientes?busca=ana');
    const cabecalhos = init.headers as Headers;
    expect(cabecalhos.get('cookie')).toBe('medicore_sessao=abc');
    expect(cabecalhos.get('x-csrf-token')).toBe('c');
    expect(cabecalhos.get('host')).toBeNull();
    expect(cabecalhos.get('x-forwarded-host')).toBe('medicore.vercel.app');
    expect(cabecalhos.get('x-forwarded-proto')).toBe('https');
    expect(init.method).toBe('POST');
    expect(init.duplex).toBe('half');
    expect(init.redirect).toBe('manual');
  });

  it('GET vai sem corpo; sem API_ORIGEM, 503 (a tela mostra E-22)', async () => {
    const buscar = vi.fn(async () => new Response('[]'));
    await repassarParaApi(new Request('https://app/api/v1/leitos'), 'https://api', buscar);
    const [, init] = buscar.mock.calls[0] as unknown as [URL, RequestInit];
    expect(init.body).toBeUndefined();
    const semOrigem = await repassarParaApi(new Request('https://app/api/v1/leitos'), undefined);
    expect(semOrigem.status).toBe(503);
    expect(await semOrigem.json()).toEqual({ codigo: 'interno' });
  });
});
