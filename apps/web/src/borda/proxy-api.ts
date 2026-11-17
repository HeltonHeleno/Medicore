/**
 * Fase 28 — Na Vercel, o app e a API ficam no **mesmo endereço**: `/api/*` é repassado ao Cloud Run
 * (`API_ORIGEM`). Assim o cookie da sessão é do próprio app (primeira parte, `SameSite=Lax`) e o
 * navegador não precisa de CORS. Usado pelo `middleware.ts` da raiz (Routing Middleware da Vercel).
 *
 * - O caminho e a busca vão como estão; o corpo vai em fluxo.
 * - `Host` não vai (o Cloud Run responde pelo próprio nome); o IP do usuário vai em
 *   `X-Forwarded-For` (a API confia no proxy: auditoria da Fase 29).
 * - Sem `API_ORIGEM`: 503 com o corpo de erro do contrato, que a tela mostra como E-22.
 */
const SEM_REPASSE = ['host', 'connection', 'content-length', 'x-forwarded-host'];

export async function repassarParaApi(
  requisicao: Request,
  origem: string | undefined,
  buscar: typeof fetch = fetch,
): Promise<Response> {
  if (!origem) {
    return new Response(JSON.stringify({ codigo: 'interno' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  const url = new URL(requisicao.url);
  const destino = new URL(`${url.pathname}${url.search}`, origem);
  const cabecalhos = new Headers(requisicao.headers);
  for (const nome of SEM_REPASSE) cabecalhos.delete(nome);
  cabecalhos.set('x-forwarded-host', url.host);
  cabecalhos.set('x-forwarded-proto', url.protocol.replace(':', ''));
  const temCorpo = !['GET', 'HEAD'].includes(requisicao.method);
  return buscar(destino, {
    method: requisicao.method,
    headers: cabecalhos,
    body: temCorpo ? requisicao.body : undefined,
    redirect: 'manual',
    // Corpo em fluxo (necessário no `fetch` do Node e da borda).
    ...(temCorpo ? { duplex: 'half' } : {}),
  } as RequestInit);
}
