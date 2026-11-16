/**
 * Fase 23 (BL-05.1, D34) — Remoção de dados pessoais antes de enviar um erro ao monitoramento.
 *
 * Regra: **nada que identifique um paciente, um profissional ou um contato sai do navegador**.
 * Na dúvida, o dado é removido. O que sobra é o suficiente para achar o erro: o tipo, a pilha
 * (arquivos e linhas), a rota sem parâmetros, a versão e o ambiente.
 *
 * Este arquivo não depende do SDK do Sentry (só de tipos estruturais): o navegador e a API (Fase 24,
 * BL-05.2) usam a mesma limpeza.
 */

/** Prefixos dos ids gerados pelo sistema (`pac-…`, `int-12`…), que viram `:id` nas rotas. */
const PREFIXOS_ID = ['pac', 'med', 'con', 'int', 'ate', 'dis', 'lei', 'lot', 'mov', 'sol', 'ati'];
const SEGMENTO_ID = new RegExp(`^(?:${PREFIXOS_ID.join('|')})-[\\w-]+$`, 'i');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REMOVIDO = '[removido]';

/** Substituições aplicadas, em ordem, a todo texto livre (mensagens, migalhas, atributos). */
const PADROES: [RegExp, string][] = [
  // Texto entre aspas duplas: as mensagens do sistema citam nomes assim ("Ana Silva" não está
  // internada). Aspas simples ficam: o navegador as usa para nomes de propriedades
  // ("Cannot read properties of undefined (reading 'nome')"), úteis para achar o erro.
  [/"[^"\n]*"/g, `"${REMOVIDO}"`],
  [/[“”][^“”\n]*[“”]/g, `“${REMOVIDO}”`],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[e-mail]'],
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]'],
  [/\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, '[telefone]'],
  [/\b\d{5}-\d{3}\b/g, '[cep]'],
  // Qualquer outra sequência longa de dígitos (CNS, documentos, números de telefone sem DDD).
  [/\d{5,}/g, '[número]'],
];

/** Remove de um texto livre o que pode identificar alguém. */
export function limparTexto(texto: string): string {
  return PADROES.reduce((atual, [padrao, troca]) => atual.replace(padrao, troca), texto);
}

/**
 * Rota sem parâmetros, sem busca e sem âncora: `/pacientes/pac-ana-silva/editar?busca=ana`
 * vira `/pacientes/:id/editar`. Aceita URL completa ou só o caminho.
 */
export function rotaSemParametros(endereco: string): string {
  let caminho = endereco;
  try {
    caminho = new URL(endereco, 'http://x').pathname;
  } catch {
    caminho = endereco.split(/[?#]/)[0] ?? '';
  }
  return (
    caminho
      .split('/')
      // Números puros e sequências de 3 dígitos ou mais são ids; `v1` (versão da API) não é.
      .map((s) =>
        SEGMENTO_ID.test(s) || UUID.test(s) || /^\d+$/.test(s) || /\d{3,}/.test(s) ? ':id' : s,
      )
      .join('/') || '/'
  );
}

/**
 * URLs de outro site (ex.: a busca de CEP) ficam só com o domínio. No servidor (sem `location`),
 * toda URL absoluta é tratada como de outro site; as rotas da própria API chegam como caminho.
 */
function limparUrl(endereco: string): string {
  try {
    const url = new URL(endereco, 'http://x');
    const mesmoSite = typeof location !== 'undefined' && url.host === location.host;
    if (url.host !== 'x' && !mesmoSite) {
      return `${url.protocol}//${url.host}/[removido]`;
    }
  } catch {
    /* segue como caminho */
  }
  return rotaSemParametros(endereco);
}

const CONTEXTOS_PERMITIDOS = new Set([
  'os',
  'browser',
  'device',
  'trace',
  'culture',
  'runtime',
  // Fase 26 (BL-05.4): a rotina das invariantes manda os ids dos registros (ids gerados, sem dados
  // pessoais).
  'invariante',
]);
const TAGS_PERMITIDAS = new Set(['origem', 'rota', 'modulo', 'invariante', 'rotina']);

/** Formato mínimo de um evento do Sentry usado aqui (compatível com `Event` do SDK). */
export interface EventoLimpavel {
  message?: string;
  logentry?: { message?: string; params?: unknown[] };
  transaction?: string;
  request?: { url?: string };
  exception?: {
    values?: {
      type?: string;
      value?: string;
      stacktrace?: { frames?: { vars?: unknown }[] };
    }[];
  };
  breadcrumbs?: Migalha[];
  user?: unknown;
  extra?: unknown;
  contexts?: object;
  tags?: object;
}

/** Formato mínimo de uma migalha (breadcrumb) do Sentry. */
export interface Migalha {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
}

/**
 * Limpa uma migalha. Devolve `null` para descartá-la.
 * - Digitação (`ui.input`) e cliques (`ui.click`, cujo texto é o seletor e pode ter o nome de
 *   um paciente no `aria-label`) ficam só com a categoria.
 * - Navegação e requisições ficam com a rota sem parâmetros, o método e o código de resposta.
 * - O resto (console, por exemplo) fica com o texto limpo e sem dados anexos.
 */
export function limparMigalha<M extends Migalha>(migalha: M): M | null {
  const categoria = migalha.category ?? '';
  if (categoria === 'ui.input') return null;
  if (categoria.startsWith('ui.')) return { ...migalha, message: undefined, data: undefined };
  if (categoria === 'navigation') {
    const de = migalha.data?.from;
    const para = migalha.data?.to;
    return {
      ...migalha,
      data: {
        from: typeof de === 'string' ? rotaSemParametros(de) : undefined,
        to: typeof para === 'string' ? rotaSemParametros(para) : undefined,
      },
    };
  }
  if (categoria === 'fetch' || categoria === 'xhr') {
    const url = migalha.data?.url;
    return {
      ...migalha,
      message: undefined,
      data: {
        method: migalha.data?.method,
        status_code: migalha.data?.status_code,
        url: typeof url === 'string' ? limparUrl(url) : undefined,
      },
    };
  }
  return {
    ...migalha,
    message: migalha.message ? limparTexto(migalha.message) : undefined,
    data: undefined,
  };
}

function filtrar<O extends object>(objeto: O | undefined, permitidas: Set<string>): O | undefined {
  if (!objeto) return undefined;
  return Object.fromEntries(Object.entries(objeto).filter(([chave]) => permitidas.has(chave))) as O;
}

/** Limpa um evento de erro inteiro antes do envio (`beforeSend`). */
export function limparEvento<E extends EventoLimpavel>(evento: E): E {
  const limpo: E = { ...evento };
  delete limpo.user;
  delete limpo.extra;

  if (limpo.message) limpo.message = limparTexto(limpo.message);
  if (limpo.logentry) {
    limpo.logentry = {
      message: limpo.logentry.message ? limparTexto(limpo.logentry.message) : undefined,
    };
  }
  if (limpo.transaction) limpo.transaction = rotaSemParametros(limpo.transaction);
  // Da requisição só fica a rota: sem busca, cabeçalhos, cookies nem corpo.
  if (limpo.request) {
    limpo.request = limpo.request.url ? { url: rotaSemParametros(limpo.request.url) } : {};
  }
  if (limpo.exception?.values) {
    limpo.exception = {
      values: limpo.exception.values.map((valor) => ({
        ...valor,
        value: valor.value ? limparTexto(valor.value) : valor.value,
        stacktrace: valor.stacktrace && {
          ...valor.stacktrace,
          // Variáveis locais da pilha podem conter qualquer dado: nunca saem.
          frames: valor.stacktrace.frames?.map(({ vars: _vars, ...quadro }) => quadro),
        },
      })),
    };
  }
  if (limpo.breadcrumbs) {
    limpo.breadcrumbs = limpo.breadcrumbs
      .map((m) => limparMigalha(m))
      .filter((m): m is Migalha => m !== null);
  }
  limpo.contexts = filtrar(limpo.contexts, CONTEXTOS_PERMITIDOS);
  limpo.tags = filtrar(limpo.tags, TAGS_PERMITIDAS);
  return limpo;
}

/** Formato mínimo de um span (medição de desempenho) do Sentry. */
export interface SpanLimpavel {
  name: string;
  attributes?: object;
}

/** Limpa um span de desempenho (`beforeSendSpan`): nome e atributos de texto sem dados pessoais. */
export function limparSpan<S extends SpanLimpavel>(span: S): S {
  const nome = span.name.startsWith('/') ? rotaSemParametros(span.name) : limparTexto(span.name);
  const atributos = Object.fromEntries(
    Object.entries(span.attributes ?? {})
      .filter(([chave]) => !/query|fragment|user|cookie|header|body/i.test(chave))
      .map(([chave, valor]) => {
        if (typeof valor !== 'string') return [chave, valor];
        if (/url|path|route|target/i.test(chave)) return [chave, limparUrl(valor)];
        return [chave, limparTexto(valor)];
      }),
  );
  return { ...span, name: nome, attributes: atributos as S['attributes'] };
}
