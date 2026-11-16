/**
 * Fase 22 (BL-60.4) — Compara o pacote inicial do PR com o da `main`.
 *
 * Lê dois arquivos gerados por `npm run pacote:medir -- --json <arquivo>` e escreve um comentário
 * em Markdown para o PR. Quando o pacote cresce mais que LIMITE_AVISO, imprime um aviso no formato
 * do GitHub Actions (`::warning::`), que aparece no resumo da execução. O aviso não reprova o PR:
 * quem reprova é o marcador dos módulos, no próprio `pacote:medir`.
 *
 * Uso: node scripts/comparar-pacote.ts --base base.json --atual atual.json --saida comentario.md
 * Sem `--base` (ou com o arquivo ausente), o comentário mostra só o tamanho atual.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Crescimento, em bytes com gzip, a partir do qual a CI avisa (D35: +5 kB por onda). */
export const LIMITE_AVISO = 5 * 1024;

/** Marca que identifica o comentário da CI, para editá-lo em vez de criar outro a cada push. */
export const MARCA_COMENTARIO = '<!-- medicore:pacote -->';

export interface Medicao {
  total: number;
  js: number;
  css: number;
  marcadores: string[];
  arquivos: { caminho: string; gzip: number }[];
}

export interface Comparacao {
  texto: string;
  diferenca: number | null;
  aviso: boolean;
}

export function kb(bytes: number): string {
  return (bytes / 1024).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function kbComSinal(bytes: number): string {
  if (Math.abs(bytes) < 51) return '±0,0';
  return `${bytes > 0 ? '+' : '−'}${kb(Math.abs(bytes))}`;
}

/** `assets/index-B1x2Y3z4.js` → `assets/index.js`, para comparar entre builds. */
export function semHash(caminho: string): string {
  return caminho.replace(/-[\w-]{8}(?=\.(?:js|css)$)/, '');
}

export function compararPacote(base: Medicao | null, atual: Medicao): Comparacao {
  const linhas = [MARCA_COMENTARIO, '### 📦 Pacote inicial', ''];

  if (!base) {
    linhas.push(
      `**${kb(atual.total)} kB** com gzip (JS ${kb(atual.js)} kB · CSS ${kb(atual.css)} kB).`,
      '',
      '_Sem medição da `main` em cache para comparar; ela é gravada a cada push na `main`._',
    );
    return { texto: `${linhas.join('\n')}\n`, diferenca: null, aviso: false };
  }

  const diferenca = atual.total - base.total;
  const aviso = diferenca > LIMITE_AVISO;
  linhas.push(
    `**${kb(base.total)} kB → ${kb(atual.total)} kB (${kbComSinal(diferenca)} kB)** com gzip`,
    '',
    '| | `main` | PR | Diferença |',
    '|---|---:|---:|---:|',
    `| JS | ${kb(base.js)} kB | ${kb(atual.js)} kB | ${kbComSinal(atual.js - base.js)} kB |`,
    `| CSS | ${kb(base.css)} kB | ${kb(atual.css)} kB | ${kbComSinal(atual.css - base.css)} kB |`,
  );

  const antes = new Map(base.arquivos.map((a) => [semHash(a.caminho), a.gzip]));
  const depois = new Map(atual.arquivos.map((a) => [semHash(a.caminho), a.gzip]));
  const mudancas = [...new Set([...antes.keys(), ...depois.keys()])]
    .map((nome) => ({ nome, de: antes.get(nome) ?? 0, para: depois.get(nome) ?? 0 }))
    .filter((m) => Math.abs(m.para - m.de) >= 51)
    .sort((x, y) => Math.abs(y.para - y.de) - Math.abs(x.para - x.de));

  if (mudancas.length > 0) {
    linhas.push('', '<details><summary>Arquivos que mudaram</summary>', '');
    linhas.push('| Arquivo | `main` | PR | Diferença |', '|---|---:|---:|---:|');
    for (const m of mudancas) {
      const de = m.de ? `${kb(m.de)} kB` : 'novo';
      const para = m.para ? `${kb(m.para)} kB` : 'removido';
      linhas.push(`| \`${m.nome}\` | ${de} | ${para} | ${kbComSinal(m.para - m.de)} kB |`);
    }
    linhas.push('', '</details>');
  }

  if (aviso) {
    linhas.push(
      '',
      `> ⚠️ O pacote inicial cresceu mais de ${kb(LIMITE_AVISO)} kB. Justifique no ` +
        '`docs/PR_FASE_N.md` ou carregue a tela nova sob demanda.',
    );
  }
  return { texto: `${linhas.join('\n')}\n`, diferenca, aviso };
}

function argumento(nome: string): string | undefined {
  const pos = process.argv.indexOf(nome);
  return pos === -1 ? undefined : process.argv[pos + 1];
}

function ler(caminho: string | undefined): Medicao | null {
  if (!caminho || !existsSync(caminho)) return null;
  return JSON.parse(readFileSync(caminho, 'utf8')) as Medicao;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const atual = ler(argumento('--atual'));
  const saida = argumento('--saida');
  if (!atual || !saida) {
    console.error('Uso: comparar-pacote.ts --base <json> --atual <json> --saida <md>');
    process.exit(2);
  }
  const resultado = compararPacote(ler(argumento('--base')), atual);
  writeFileSync(saida, resultado.texto);
  console.log(resultado.texto);
  if (resultado.aviso) {
    console.log(
      `::warning title=Pacote inicial::Cresceu ${kb(resultado.diferenca ?? 0)} kB ` +
        `(limite de aviso: ${kb(LIMITE_AVISO)} kB).`,
    );
  }
}
