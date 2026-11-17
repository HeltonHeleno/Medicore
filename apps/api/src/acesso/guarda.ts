/**
 * Fase 28 (BL-02.4, BL-02.6, R-AU4) — A guarda de todas as rotas.
 *
 * 1. Ao registrar cada rota, descobre a ação que ela exige (`rotas-permissoes.ts`). Rota de gravação
 *    sem ação: a API não sobe (negado por padrão).
 * 2. Em cada requisição:
 *    - abre o contexto do usuário (`contexto.ts`), que dá o autor das ações;
 *    - sem sessão válida: 401 (E-19);
 *    - gravação sem o código de segurança da sessão (`X-CSRF-Token`): 403;
 *    - perfil sem a ação: 403 (E-20).
 * 3. O CPF completo só sai para quem tem `pacientes.verCpf`; para os outros, "***.982.247-**".
 *    Quem edita sem ver o CPF devolve o valor oculto, e a API mantém o que está gravado.
 */
import { ErroPermissao, ErroSessao } from '@medicore/dominio/erros';
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import { pode, type Acao } from '@medicore/dominio/permissoes';
import { ocultarCpf } from '@medicore/dominio/utils/mascaras';
import { agora } from '@medicore/dominio/utils/relogio';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Banco } from '../banco/conexao';
import { pacientes } from '../banco/esquema';
import { comContexto, contextoAtual } from './contexto';
import { exigenciaDaRota, type Exigencia } from './rotas-permissoes';
import { iguais } from './segredos';
import { sessaoDoToken, type Sessao } from './servico';

export const COOKIE_SESSAO = 'medicore_sessao';
export const CABECALHO_CSRF = 'x-csrf-token';
const GRAVACOES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

declare module 'fastify' {
  interface FastifyContextConfig {
    /** Fase 28: a ação que a rota exige (preenchida pela guarda; uma rota pode declarar a sua). */
    acao?: Exigencia;
  }
  interface FastifyRequest {
    sessao?: Sessao;
  }
}

/** Lê um cookie do cabeçalho, sem biblioteca. */
export function lerCookie(cabecalho: string | undefined, nome: string): string | undefined {
  if (!cabecalho) return undefined;
  for (const parte of cabecalho.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nome) {
      const valor = parte.slice(i + 1).trim();
      return valor || undefined;
    }
  }
  return undefined;
}

/** Cookie da sessão: só HTTPS, fora do alcance do JavaScript, só para `/api`. */
export function cookieDaSessao(token: string, expiraEm: string): string {
  // `Max-Age` (e não `Expires`): conta a partir do relógio do navegador, seja qual for o dele.
  const segundos = Math.max(
    0,
    Math.round((new Date(expiraEm).getTime() - agora().getTime()) / 1000),
  );
  return `${COOKIE_SESSAO}=${token}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${segundos}`;
}

export const cookieApagado = () =>
  `${COOKIE_SESSAO}=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

/** A sessão do cookie da requisição (sem conferir etapa nem permissão). */
export async function sessaoDaRequisicao(banco: Banco, requisicao: FastifyRequest) {
  return sessaoDoToken(banco, lerCookie(requisicao.headers.cookie, COOKIE_SESSAO));
}

/** Gravação com o código de segurança da sessão (R-AU4)? */
export function csrfConfere(requisicao: FastifyRequest, sessao: Sessao): boolean {
  const enviado = requisicao.headers[CABECALHO_CSRF];
  return typeof enviado === 'string' && iguais(enviado, sessao.csrf);
}

const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Oculta `cpf` e `responsavel.cpf` de um paciente (ou de uma lista deles). */
function ocultarCpfs(corpo: unknown): unknown {
  if (Array.isArray(corpo)) return corpo.map(ocultarCpfs);
  if (!ehObjeto(corpo)) return corpo;
  const copia: Record<string, unknown> = { ...corpo };
  if (typeof copia.cpf === 'string') copia.cpf = ocultarCpf(copia.cpf);
  if (ehObjeto(copia.responsavel) && typeof copia.responsavel.cpf === 'string') {
    copia.responsavel = { ...copia.responsavel, cpf: ocultarCpf(copia.responsavel.cpf) };
  }
  if (Array.isArray(copia.itens)) copia.itens = copia.itens.map(ocultarCpfs);
  return copia;
}

const ROTAS_DE_PACIENTE = /^\/api\/v1\/pacientes(\/cpf\/:cpf|\/:id)?$/;

export function registrarGuarda(app: FastifyInstance, banco: Banco): void {
  app.addHook('onRoute', (rota) => {
    const metodos = Array.isArray(rota.method) ? rota.method : [rota.method];
    const declarada = rota.config?.acao;
    for (const metodo of metodos) {
      const exigencia = declarada ?? exigenciaDaRota(metodo, rota.url);
      if (!exigencia) {
        throw new Error(
          `Rota sem permissão definida: ${metodo} ${rota.url} (inclua em acesso/rotas-permissoes.ts).`,
        );
      }
      rota.config = { ...rota.config, acao: exigencia };
    }
  });

  // Tudo o que vem depois (validação, rota, serviços) roda no contexto desta requisição. Fica no
  // `preValidation` (e não no `onRequest`) porque a leitura do corpo, por eventos do socket,
  // perderia o contexto aberto antes dela.
  app.addHook('preValidation', (_requisicao, _resposta, feito) => comContexto(() => feito()));

  app.addHook('preValidation', async (requisicao: FastifyRequest) => {
    const exigencia = requisicao.routeOptions.config?.acao;
    // Rota inexistente (404) ou pública: nada a conferir aqui.
    if (!exigencia || exigencia === 'publica') return;
    const achada = await sessaoDaRequisicao(banco, requisicao);
    if (!achada || achada.sessao.etapa !== 'ativa') throw new ErroSessao();
    const { sessao } = achada;
    requisicao.sessao = sessao;
    const contexto = contextoAtual();
    if (contexto) contexto.sessao = sessao;
    if (GRAVACOES.has(requisicao.method) && !csrfConfere(requisicao, sessao)) {
      throw new ErroPermissao(ta.semCodigoSeguranca);
    }
    if (!pode(sessao.usuario.perfis, exigencia as Acao)) {
      throw new ErroPermissao(ta.acoes[exigencia as Acao]);
    }
    await manterCpfOculto(banco, requisicao);
  });

  app.addHook('preSerialization', async (requisicao: FastifyRequest, _r: FastifyReply, corpo) => {
    const sessao = requisicao.sessao;
    if (!sessao || pode(sessao.usuario.perfis, 'pacientes.verCpf')) return corpo;
    if (!ROTAS_DE_PACIENTE.test(requisicao.routeOptions.url ?? '')) return corpo;
    if ((_r.statusCode ?? 200) >= 400) return corpo;
    return ocultarCpfs(corpo);
  });
}

/** Edição de paciente por quem não vê o CPF: o valor oculto volta como o que está gravado. */
async function manterCpfOculto(banco: Banco, requisicao: FastifyRequest) {
  if (requisicao.method !== 'PUT' || requisicao.routeOptions.url !== '/api/v1/pacientes/:id')
    return;
  if (pode(requisicao.sessao!.usuario.perfis, 'pacientes.verCpf')) return;
  const corpo = requisicao.body;
  if (!ehObjeto(corpo)) return;
  const responsavel = ehObjeto(corpo.responsavel) ? corpo.responsavel : undefined;
  const oculto = (v: unknown) => typeof v === 'string' && v.includes('*');
  if (!oculto(corpo.cpf) && !oculto(responsavel?.cpf)) return;
  const { id } = requisicao.params as { id: string };
  const [atual] = await banco
    .select({ cpf: pacientes.cpf, responsavel: pacientes.responsavel })
    .from(pacientes)
    .where(eq(pacientes.id, id));
  if (!atual) return;
  if (oculto(corpo.cpf)) corpo.cpf = atual.cpf;
  if (responsavel && oculto(responsavel.cpf)) {
    responsavel.cpf = (atual.responsavel as { cpf?: string } | null)?.cpf ?? '';
  }
}
