/**
 * Etapa 0 (0.3.2) — Tamanho do pacote inicial e textos dos módulos operacionais.
 *
 * Lê `dist/index.html` (gerado por `npm run build`) e considera "pacote inicial" tudo o que a
 * página carrega antes de qualquer navegação: o script de entrada, os `modulepreload` e as folhas
 * de estilo. Para cada arquivo, mede o tamanho com gzip.
 *
 * Também procura, nesses arquivos, os MARCADORES abaixo: textos que só existem nos arquivos de
 * texto dos módulos (`src/i18n/pt-BR/leitos.ts`, `emergencia.ts`, `farmacia.ts`, D16). Se algum
 * aparecer no pacote inicial, os textos de um módulo vazaram para o carregamento de todas as
 * páginas (RS-12) e o script sai com código 1.
 *
 * Uso: `npm run build && npm run pacote:medir`
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const RAIZ = join(import.meta.dirname, '..');
const DIST = join(RAIZ, 'dist');
const TEXTOS_MODULOS = join(RAIZ, 'src', 'i18n', 'pt-BR');

/**
 * Textos exclusivos dos arquivos de texto dos módulos. Não use textos que também aparecem no
 * `pt-BR.ts` (ex.: os textos das atividades, que o Painel exibe).
 */
const MARCADORES = [
  'Higienização terminal',
  'Emergência imediata',
  'Livro de controlados',
  'Unidades por embalagem',
];

interface Arquivo {
  caminho: string;
  bytes: number;
  gzip: number;
}

function kb(bytes: number): string {
  return (bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

function arquivosIniciais(html: string): string[] {
  const refs = new Set<string>();
  const padroes = [
    /<script[^>]*\ssrc="([^"]+)"/g,
    /<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g,
    /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g,
  ];
  for (const padrao of padroes) {
    for (const [, ref] of html.matchAll(padrao)) {
      if (!/^https?:/.test(ref)) refs.add(ref.replace(/^\//, ''));
    }
  }
  return [...refs];
}

function textoDosModulos(): string {
  if (!existsSync(TEXTOS_MODULOS)) return '';
  return readdirSync(TEXTOS_MODULOS)
    .filter((nome) => nome.endsWith('.ts'))
    .map((nome) => readFileSync(join(TEXTOS_MODULOS, nome), 'utf8'))
    .join('\n');
}

const indice = join(DIST, 'index.html');
if (!existsSync(indice)) {
  console.error('dist/index.html não encontrado. Rode `npm run build` antes.');
  process.exit(2);
}

const lista: Arquivo[] = arquivosIniciais(readFileSync(indice, 'utf8')).map((caminho) => {
  const conteudo = readFileSync(join(DIST, caminho));
  return { caminho, bytes: conteudo.length, gzip: gzipSync(conteudo, { level: 9 }).length };
});

const soma = (filtro: (a: Arquivo) => boolean) =>
  lista.filter(filtro).reduce((total, a) => total + a.gzip, 0);
const js = soma((a) => a.caminho.endsWith('.js'));
const css = soma((a) => a.caminho.endsWith('.css'));

console.log('Arquivos do pacote inicial (gzip):');
for (const a of [...lista].sort((x, y) => y.gzip - x.gzip)) {
  console.log(
    `  ${a.caminho.padEnd(48)} ${kb(a.gzip).padStart(7)} kB  (${kb(a.bytes)} kB sem gzip)`,
  );
}

const conteudoInicial = lista.map((a) => readFileSync(join(DIST, a.caminho), 'utf8')).join('\n');
const encontrados = MARCADORES.filter((m) => conteudoInicial.includes(m));

// Um marcador que não existe nos textos dos módulos não testa nada: avisa para trocar.
const fontes = textoDosModulos();
const semFonte = fontes ? MARCADORES.filter((m) => !fontes.includes(m)) : [];

console.log('');
console.log(
  `Pacote inicial: ${kb(js + css)} kB gzip (JS ${kb(js)} kB · CSS ${kb(css)} kB) · ` +
    `marcadores dos módulos: ${encontrados.length}`,
);
if (!fontes) {
  console.log(
    '(Os textos dos módulos ainda não existem: os marcadores passam a valer na Fase 15.)',
  );
}
for (const m of semFonte) {
  console.warn(
    `Aviso: o marcador "${m}" não está em src/i18n/pt-BR/. Atualize a lista MARCADORES.`,
  );
}
if (encontrados.length > 0) {
  console.error(`Textos dos módulos no pacote inicial: ${encontrados.join(', ')}`);
  process.exit(1);
}
