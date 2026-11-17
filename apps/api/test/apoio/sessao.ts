/**
 * Fase 28 — Desde o login, toda rota pede sessão. Os testes de serviço e de contrato continuam
 * iguais: `comSessao(app)` faz cada `app.inject` entrar sozinho (conta de demonstração "equipe
 * completa", com todos os perfis) e levar o cookie e o código de segurança.
 *
 * - Pedido com o cabeçalho `cookie` (mesmo vazio) vai como está: é assim que os testes de acesso
 *   falam sem sessão ou com a sessão deles.
 * - 401 (a limpeza entre testes apagou a sessão, ou o relógio andou mais de 30 min): entra de novo
 *   e repete uma vez.
 */
import type { ContaDemonstracao } from '@medicore/dominio/contrato/acesso';
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';

export interface Credenciais {
  cookie: string;
  csrf: string;
}

type Inject = (opcoes: InjectOptions) => Promise<LightMyRequestResponse>;

/** Entra numa conta de demonstração e devolve o cookie e o código de segurança. */
export async function entrarComo(inject: Inject, conta: ContaDemonstracao): Promise<Credenciais> {
  const r = await inject({
    method: 'POST',
    url: '/api/v1/auth/demonstracao',
    payload: { conta },
  });
  if (r.statusCode !== 200) throw new Error(`Login de teste falhou (${r.statusCode}): ${r.body}`);
  return { cookie: cookieDe(r), csrf: (r.json() as { csrf: string }).csrf };
}

/** `medicore_sessao=…` do `Set-Cookie` da resposta. */
export function cookieDe(r: LightMyRequestResponse): string {
  const bruto = r.headers['set-cookie'];
  const linha = (Array.isArray(bruto) ? bruto : [bruto ?? '']).find((c) =>
    c.startsWith('medicore_sessao='),
  );
  if (!linha) throw new Error('Resposta sem o cookie da sessão');
  return linha.split(';')[0]!;
}

export function comSessao(app: FastifyInstance, conta: ContaDemonstracao = 'todos') {
  const original: Inject = app.inject.bind(app) as Inject;
  let credenciais: Credenciais | undefined;

  const comCabecalhos = (opcoes: InjectOptions, c: Credenciais): InjectOptions => ({
    ...opcoes,
    headers: { ...opcoes.headers, cookie: c.cookie, 'x-csrf-token': c.csrf },
  });

  const injetar: Inject = async (opcoes) => {
    const url = String(opcoes.url ?? '');
    if (opcoes.headers && 'cookie' in opcoes.headers) return original(opcoes);
    const gravacaoDeAcesso = url.startsWith('/api/v1/auth/') && (opcoes.method ?? 'GET') !== 'GET';
    if (gravacaoDeAcesso || url.startsWith('/api/v1/_teste/')) return original(opcoes);
    credenciais ??= await entrarComo(original, conta);
    const r = await original(comCabecalhos(opcoes, credenciais));
    if (r.statusCode !== 401) return r;
    credenciais = await entrarComo(original, conta);
    return original(comCabecalhos(opcoes, credenciais));
  };
  (app as unknown as { inject: Inject }).inject = injetar;
  return { original };
}
