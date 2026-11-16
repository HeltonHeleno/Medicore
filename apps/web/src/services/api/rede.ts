/**
 * Fase 27 (BL-01.7) — Transporte HTTP do navegador até a API (`VITE_API_URL`).
 *
 * - A versão que a tela carregou vai no `If-Match` (R-API1); a resposta de erro volta como a
 *   classe de sempre (`erroDeResposta`), então as telas tratam os erros do mesmo jeito.
 * - Sem rede, tempo esgotado ou servidor fora do ar (502–504): `ErroRede` (E-22). A gravação é
 *   uma transação no servidor: nada fica gravado pela metade.
 * - Depois de cada gravação aceita, as telas abertas recarregam (D26, `repositorio.ts`).
 * - A última gravação que falhou por rede pode ser reenviada pelo "Tentar de novo" do aviso.
 */
import type {
  RequisicaoApi,
  RespostaApi,
  TransporteApi,
} from '@medicore/dominio/cliente/cadastros';

export const TEMPO_LIMITE_MS = 20_000;

type Fetch = typeof fetch;

let aoGravar: () => void = () => {};
let ultimaFalha: (() => Promise<RespostaApi>) | null = null;

/** Quem recarrega as telas depois de uma gravação (ligado pelo `repositorio.ts` do modo API). */
export function aoConcluirGravacao(fn: () => void): void {
  aoGravar = fn;
}

/** Endereço base da API: `https://api…` + `/api/v1`. */
export const baseDaApi = (url: string) => `${url.replace(/\/+$/, '')}/api/v1`;

export function criarTransporte(
  base: string,
  buscar: Fetch = (...a) => fetch(...a),
): TransporteApi {
  const enviar = async (r: RequisicaoApi): Promise<RespostaApi> => {
    const consulta = new URLSearchParams(
      Object.entries(r.consulta ?? {})
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    const cabecalhos: Record<string, string> = { Accept: 'application/json' };
    if (r.corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
    if (r.versao !== undefined) cabecalhos['If-Match'] = `"v${r.versao}"`;
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
    let resposta: Response;
    try {
      resposta = await buscar(`${base}${r.caminho}${consulta ? `?${consulta}` : ''}`, {
        method: r.metodo,
        headers: cabecalhos,
        body: r.corpo === undefined ? undefined : JSON.stringify(r.corpo),
        signal: controle.signal,
        // A API não usa cookies até o login (BL-02).
        credentials: 'omit',
        // Os detalhes têm campos calculados na hora (prazo para desfazer, minutos no status):
        // nada de cache do navegador.
        cache: 'no-store',
      });
    } catch {
      // Sem rede ou tempo esgotado: o contrato devolve `ErroRede` para o status 0.
      return { status: 0, corpo: null };
    } finally {
      clearTimeout(relogio);
    }
    const texto = await resposta.text().catch(() => '');
    let corpo: unknown = null;
    try {
      corpo = texto ? JSON.parse(texto) : null;
    } catch {
      corpo = null; // página de erro de um proxy (502/503): vira ErroRede pelo status
    }
    return { status: resposta.status, corpo };
  };

  return async (r) => {
    const resposta = await enviar(r);
    if (r.metodo !== 'GET') {
      const falhouPorRede = resposta.status === 0 || [502, 503, 504].includes(resposta.status);
      ultimaFalha = falhouPorRede ? () => enviar(r) : null;
      if (resposta.status > 0 && resposta.status < 400) aoGravar();
    }
    return resposta;
  };
}

/**
 * E-22 "Tentar de novo": reenvia a última gravação que falhou por rede. Se ela tinha versão e já
 * tinha sido gravada, o servidor responde 412 (nada é gravado duas vezes).
 * Devolve `null` se não há o que reenviar.
 */
export async function repetirUltimaGravacao(): Promise<RespostaApi | null> {
  const repetir = ultimaFalha;
  if (!repetir) return null;
  ultimaFalha = null;
  const r = await repetir();
  if (r.status > 0 && r.status < 400) aoGravar();
  else if (r.status === 0 || [502, 503, 504].includes(r.status)) ultimaFalha = repetir;
  return r;
}

export const haGravacaoParaRepetir = () => ultimaFalha !== null;
