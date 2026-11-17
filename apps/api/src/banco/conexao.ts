/** Fase 24 — Conexão com o PostgreSQL (pool do `pg` + Drizzle). */
import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { comandoDoContexto } from './contexto-auditoria';
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
  const banco = drizzle(pool, { schema: esquema, casing: 'snake_case' }) as Banco;
  // Fase 29 (BL-03.1): toda transação começa marcando quem, de onde e quando, para os gatilhos
  // da auditoria. É o gancho único: nenhum serviço precisa lembrar de auditar.
  const transacao = banco.transaction.bind(banco);
  banco.transaction = ((fn, config) =>
    transacao(async (tx) => {
      await tx.execute(sql.raw(comandoDoContexto()));
      return fn(tx);
    }, config)) as Banco['transaction'];
  return banco;
}

export async function desconectar(banco: Banco): Promise<void> {
  await banco.$client.end();
}
