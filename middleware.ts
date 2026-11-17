/**
 * Fase 28 — Routing Middleware da Vercel: `/api/*` vai para a API (Cloud Run), no mesmo endereço do
 * app. A variável `API_ORIGEM` (Production → demonstração, Preview → homologação) fica nas
 * configurações do projeto na Vercel. Ver `docs/backend/PUBLICACAO.md`.
 */
import { repassarParaApi } from './apps/web/src/borda/proxy-api.ts';

export const config = { matcher: '/api/:caminho*' };

export default function middleware(requisicao: Request): Promise<Response> {
  return repassarParaApi(requisicao, process.env.API_ORIGEM);
}
