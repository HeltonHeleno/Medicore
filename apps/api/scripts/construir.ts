/**
 * Fase 24 — Build da API para produção: `dist/principal.js` e `dist/migrar.js`, com o domínio
 * (`@medicore/dominio`, que é TypeScript) embutido e as dependências do npm de fora.
 * Uso: `npm run build -w @medicore/api` e depois `node dist/principal.js`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

const RAIZ = join(import.meta.dirname, '..');
const pacote = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
};
const dominio = JSON.parse(
  readFileSync(join(RAIZ, '..', '..', 'packages', 'dominio', 'package.json'), 'utf8'),
) as { dependencies: Record<string, string> };

const externas = [...Object.keys(pacote.dependencies), ...Object.keys(dominio.dependencies)].filter(
  (nome) => !nome.startsWith('@medicore/'),
);

await build({
  // A API e o comando de migração (o contêiner roda `node dist/migrar.js` antes de subir).
  entryPoints: {
    principal: join(RAIZ, 'src', 'principal.ts'),
    migrar: join(RAIZ, 'src', 'banco', 'migrar.ts'),
    // Fase 27: dados de exemplo da homologação e da demonstração (`--se-vazio`; nunca em produção).
    semear: join(RAIZ, 'src', 'banco', 'semear-cli.ts'),
    // Fase 28: a conta do primeiro administrador (mostra o link do primeiro acesso).
    'primeiro-administrador': join(RAIZ, 'src', 'acesso', 'primeiro-administrador-cli.ts'),
  },
  outdir: join(RAIZ, 'dist'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: externas,
  // `import.meta.url` aponta para dist/: o package.json e as migrações são lidos a partir dele.
  logLevel: 'info',
});
