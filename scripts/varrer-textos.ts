/**
 * 14.4.1 — Varredura de textos fora do `src/i18n/pt-BR.ts`.
 *
 * Procura, em `src/` (fora de testes, i18n e dados de exemplo), textos de interface escritos
 * direto no código:
 * - texto entre tags JSX (`<p>Salvar</p>`);
 * - atributos e propriedades de objeto com string literal que viram texto na tela ou são
 *   lidos por leitores de tela (`aria-label`, `title`, `placeholder`, `titulo`, `mensagem`...);
 * - avisos e erros criados com texto literal (`toast.sucesso('...')`, `new ErroValidacao('...')`).
 *
 * Uso: `npm run i18n:verificar` (sai com código 1 se encontrar algo).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const RAIZ = join(import.meta.dirname, '..', 'src');
// Vitrine (`/ui`, só em desenvolvimento) usa dados de exemplo fictícios de propósito.
const IGNORAR = [
  /__tests__/,
  /i18n[\\/]/,
  /data[\\/]/,
  /\.d\.ts$/,
  /setupTests/,
  /UiShowcase/,
  /pages[\\/]vitrine/,
];
const ATRIBUTOS = new Set([
  'aria-label',
  'aria-description',
  'title',
  'placeholder',
  'alt',
  'rotulo',
  'titulo',
  'descricao',
  'mensagem',
  'dica',
  'vazio',
  'rotuloConfirmar',
  'rotuloCancelar',
]);
// `new Error(...)` fica de fora: são erros de programação, não mensagens para o usuário.
const CHAMADAS = /^(toast\.\w+|new Erro[A-Z]\w*|alert|confirm)$/;
/** Códigos internos (`cpf_duplicado`) não são texto de interface. */
const CODIGO = /^[a-z]+(_[a-z]+)+$/;
/** Textos que não são idioma: símbolos, unidades e separadores. */
const PERMITIDOS = /^[\s·•—–\-/|:,.()%+*×÷→←↑↓…0-9]*$/;

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.tsx?$/.test(nome) && !IGNORAR.some((r) => r.test(caminho)) ? [caminho] : [];
  });
}

interface Achado {
  arquivo: string;
  linha: number;
  texto: string;
}

function varrer(caminho: string): Achado[] {
  const fonte = ts.createSourceFile(
    caminho,
    readFileSync(caminho, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    caminho.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const achados: Achado[] = [];
  const anotar = (no: ts.Node, texto: string) => {
    const t = texto.trim();
    if (!t || PERMITIDOS.test(t) || CODIGO.test(t)) return;
    const { line } = fonte.getLineAndCharacterOfPosition(no.getStart());
    achados.push({ arquivo: relative(RAIZ, caminho), linha: line + 1, texto: t });
  };
  const visitar = (no: ts.Node) => {
    if (ts.isJsxText(no)) anotar(no, no.text);
    if (ts.isJsxAttribute(no) && ATRIBUTOS.has(no.name.getText(fonte)) && no.initializer) {
      const ini = no.initializer;
      if (ts.isStringLiteral(ini)) anotar(ini, ini.text);
      if (
        ts.isJsxExpression(ini) &&
        ini.expression &&
        (ts.isStringLiteral(ini.expression) || ts.isNoSubstitutionTemplateLiteral(ini.expression))
      )
        anotar(ini, ini.expression.text);
    }
    if (
      ts.isPropertyAssignment(no) &&
      ATRIBUTOS.has(no.name.getText(fonte).replace(/['"]/g, '')) &&
      ts.isStringLiteral(no.initializer)
    )
      anotar(no.initializer, no.initializer.text);
    if ((ts.isCallExpression(no) || ts.isNewExpression(no)) && no.arguments?.length) {
      const nome = (ts.isNewExpression(no) ? 'new ' : '') + no.expression.getText(fonte);
      const arg = no.arguments[0];
      if (
        CHAMADAS.test(nome) &&
        (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))
      )
        anotar(arg, arg.text);
    }
    ts.forEachChild(no, visitar);
  };
  visitar(fonte);
  return achados;
}

const achados = arquivos(RAIZ).flatMap(varrer);
if (achados.length === 0) {
  console.log('Nenhum texto de interface fora de src/i18n/pt-BR.ts.');
} else {
  for (const a of achados) console.log(`${a.arquivo}:${a.linha}  "${a.texto}"`);
  console.log(`\n${achados.length} texto(s) fora de src/i18n/pt-BR.ts.`);
  process.exitCode = 1;
}
