/** Fase 24 — Conexão com o PostgreSQL (pool do `pg` + Drizzle). */
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as esquema from './esquema';

export type Banco = NodePgDatabase<typeof esquema> & { $client: pg.Pool };

export function conectar(url: string, conexoes = 10): Banco {
  const pool = new pg.Pool({
    connectionString: url,
    max: conexoes,
    // Toda sessão trabalha em UTC; o fuso do hospital é aplicado pelo domínio (M3).
    options: '-c timezone=UTC',
  });
  // Uma conexão ociosa derrubada pelo servidor (reinício, failover) não pode derrubar a API: o
  // pool descarta a conexão e abre outra na próxima consulta.
  pool.on('error', () => {});
  return drizzle(pool, { schema: esquema, casing: 'snake_case' }) as Banco;
}

export async function desconectar(banco: Banco): Promise<void> {
  await banco.$client.end();
}
