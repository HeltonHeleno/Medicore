/**
 * Fase 24 / 27 — Linha de comando da semeadura (`npm run db:semear`, `node dist/semear.js`).
 *
 * Fica num arquivo à parte: a API importa `semear.ts` (restauração da demonstração, rotas de teste),
 * e um bloco de linha de comando dentro dele rodaria junto com a API no pacote do `esbuild`, onde
 * `import.meta.url` é o da API.
 */
import { count } from 'drizzle-orm';
import { conectar, desconectar } from './conexao';
import * as e from './esquema';
import { semear } from './semear';

// Linha de comando (`npm run db:…`): exercitada pela CI e pelo Docker Compose, não pelo Vitest.
/* v8 ignore start */
{
  if (process.env.AMBIENTE === 'producao') {
    console.error('A semeadura dos dados de exemplo não roda em produção (D27).');
    process.exit(2);
  }
  const url = process.env.DATABASE_URL_MIGRACAO || process.env.DATABASE_URL;
  if (!url) {
    console.error('Defina DATABASE_URL_MIGRACAO (ou DATABASE_URL).');
    process.exit(2);
  }
  const banco = conectar(url, 1);
  try {
    // Fase 27: `--se-vazio` (contêiner de homologação e demonstração) semeia só um banco novo.
    const [{ n }] = await banco.select({ n: count() }).from(e.pacientes);
    if (process.argv.includes('--se-vazio') && n > 0) {
      console.log('O banco já tem dados: nada a semear.');
    } else {
      const { contagens } = await semear(banco, {
        substituir: process.argv.includes('--substituir'),
      });
      console.log('Dados de exemplo gravados:', contagens);
    }
  } finally {
    await desconectar(banco);
  }
}
/* v8 ignore stop */
