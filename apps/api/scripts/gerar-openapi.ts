/**
 * Fase 24 (24.3.1) — Grava o OpenAPI da API em `docs/backend/openapi.json`, para consulta sem
 * subir a API (a versão viva fica em `/api/v1/openapi.json` e `/api/v1/docs`).
 * Uso: `npm run openapi -w @medicore/api`.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { conectar, desconectar } from '../src/banco/conexao';
import { criarServidor } from '../src/servidor';

const banco = conectar('postgres://ninguem@127.0.0.1:1/nada', 1);
const app = await criarServidor({
  config: { AMBIENTE: 'desenvolvimento', LOG_NIVEL: 'silent', DOCS: false },
  banco,
  registrarErro: () => '',
});
await app.ready();
const destino = join(import.meta.dirname, '..', '..', '..', 'docs', 'backend', 'openapi.json');
writeFileSync(destino, `${JSON.stringify(app.swagger(), null, 2)}\n`);
await app.close();
await desconectar(banco);
console.log(`OpenAPI gravado em ${destino}`);
