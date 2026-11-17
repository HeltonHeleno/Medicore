/**
 * Banco de teste: um banco novo por arquivo de teste, migrado, com duas conexões —
 * a do dono (migrações, semeadura, limpeza) e a da aplicação (papel `medicore_app`), que é a
 * mesma que a API usa em produção (R-F9: sem UPDATE/DELETE em movimentações).
 */
import { randomBytes } from 'node:crypto';
import { getTableName, sql } from 'drizzle-orm';
import pg from 'pg';
import { inject } from 'vitest';
import { conectar, desconectar, type Banco } from '../../src/banco/conexao';
import {
  auditoria,
  auditoriaSelos,
  codigosRecuperacao,
  convites,
  perfisUsuario,
  rotinas,
  sessoes,
  TABELAS,
  tentativasLogin,
  usuarios,
} from '../../src/banco/esquema';
import { migrar } from '../../src/banco/migrar';

export interface BancoDeTeste {
  /** Conexão da aplicação (papel `medicore_app`). */
  app: Banco;
  /** Conexão do dono das tabelas. */
  dono: Banco;
  urlApp: string;
  urlDono: string;
  /** Apaga os dados de todas as tabelas (entre testes). */
  limpar: () => Promise<void>;
  encerrar: () => Promise<void>;
}

const USUARIO_APP = 'medicore_api_teste';
const SENHA_APP = 'teste';

function comBanco(url: string, nome: string, usuario?: { nome: string; senha: string }) {
  const u = new URL(url);
  u.pathname = `/${nome}`;
  if (usuario) {
    u.username = usuario.nome;
    u.password = usuario.senha;
  }
  return u.toString();
}

async function administrar(url: string, comando: string) {
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    await cliente.query(comando);
  } finally {
    await cliente.end();
  }
}

export async function criarBancoDeTeste(): Promise<BancoDeTeste> {
  const servidor = inject('urlServidorPostgres');
  const nome = `medicore_teste_${randomBytes(6).toString('hex')}`;
  await administrar(servidor, `CREATE DATABASE ${nome}`);
  const urlDono = comBanco(servidor, nome);
  await migrar(urlDono);

  // O papel é do servidor (vale para todos os bancos); o login de teste pertence a ele.
  await administrar(
    urlDono,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${USUARIO_APP}') THEN
         CREATE ROLE ${USUARIO_APP} LOGIN PASSWORD '${SENHA_APP}' IN ROLE medicore_app;
       END IF;
     EXCEPTION WHEN duplicate_object OR unique_violation THEN NULL;
     END $$;`,
  );
  const urlApp = comBanco(servidor, nome, { nome: USUARIO_APP, senha: SENHA_APP });
  const app = conectar(urlApp, 4);
  const dono = conectar(urlDono, 2);

  return {
    app,
    dono,
    urlApp,
    urlDono,
    limpar: async () => {
      const nomes = [
        ...Object.values(TABELAS),
        rotinas,
        usuarios,
        perfisUsuario,
        sessoes,
        convites,
        codigosRecuperacao,
        tentativasLogin,
        auditoria,
        auditoriaSelos,
      ]
        .map((t) => `"${getTableName(t)}"`)
        .join(', ');
      await dono.execute(sql.raw(`TRUNCATE ${nomes}`));
    },
    encerrar: async () => {
      await desconectar(app);
      await desconectar(dono);
      await administrar(servidor, `DROP DATABASE IF EXISTS ${nome} WITH (FORCE)`);
    },
  };
}
