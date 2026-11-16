/**
 * Configuração global dos testes da API: um servidor PostgreSQL 16 para a rodada inteira.
 * - Com `TEST_DATABASE_URL` (um superusuário), usa esse servidor.
 * - Sem ela, sobe um contêiner com Testcontainers (precisa de Docker), como na CI (24.2.8).
 */
import pg from 'pg';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    urlServidorPostgres: string;
  }
}

/**
 * Os papéis valem para o servidor inteiro. Criados uma vez aqui, antes de os arquivos de teste
 * migrarem os seus bancos em paralelo (na CI, dois `CREATE ROLE` simultâneos colidiam).
 */
async function prepararPapeis(url: string) {
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    await cliente.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medicore_app') THEN
        CREATE ROLE medicore_app NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medicore_api_teste') THEN
        CREATE ROLE medicore_api_teste LOGIN PASSWORD 'teste' IN ROLE medicore_app;
      END IF;
    END $$;`);
  } finally {
    await cliente.end();
  }
}

export default async function preparar(projeto: TestProject) {
  const definida = process.env.TEST_DATABASE_URL;
  if (definida) {
    await prepararPapeis(definida);
    projeto.provide('urlServidorPostgres', definida);
    return;
  }
  const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
  const conteiner = await new PostgreSqlContainer('postgres:16-alpine').start();
  await prepararPapeis(conteiner.getConnectionUri());
  projeto.provide('urlServidorPostgres', conteiner.getConnectionUri());
  return async () => {
    await conteiner.stop();
  };
}
