/**
 * Configuração global dos testes da API: um servidor PostgreSQL 16 para a rodada inteira.
 * - Com `TEST_DATABASE_URL` (um superusuário), usa esse servidor.
 * - Sem ela, sobe um contêiner com Testcontainers (precisa de Docker), como na CI (24.2.8).
 */
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    urlServidorPostgres: string;
  }
}

export default async function preparar(projeto: TestProject) {
  const definida = process.env.TEST_DATABASE_URL;
  if (definida) {
    projeto.provide('urlServidorPostgres', definida);
    return;
  }
  const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
  const conteiner = await new PostgreSqlContainer('postgres:16-alpine').start();
  projeto.provide('urlServidorPostgres', conteiner.getConnectionUri());
  return async () => {
    await conteiner.stop();
  };
}
