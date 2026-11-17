/** 24.2.6 — Migrações: as 13 tabelas (+ `rotinas`, Fase 26), as restrições escritas à mão e `db:migrar` idempotente. */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrar } from '../src/banco/migrar';
import { criarBancoDeTeste, type BancoDeTeste } from './apoio/banco';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await criarBancoDeTeste();
});
afterAll(async () => b.encerrar());

const linhas = async (consulta: ReturnType<typeof sql>) =>
  (await b.dono.execute(consulta)).rows as Record<string, unknown>[];

describe('migrações', () => {
  it('criam as 13 tabelas, a das rotinas, as de acesso (Fase 28) e as da auditoria (Fase 29)', async () => {
    const tabelas = await linhas(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`,
    );
    expect(tabelas.map((t) => t.table_name)).toEqual([
      'atendimentos',
      'atividades',
      'auditoria',
      'auditoria_selos',
      'codigos_recuperacao',
      'consultas',
      'convites',
      'dispensacoes',
      'internacoes',
      'leitos',
      'lotes',
      'medicamentos',
      'medicos',
      'movimentacoes',
      'pacientes',
      'perfis_usuario',
      'resumos',
      'rotinas',
      'sessoes',
      'solicitacoes',
      'tentativas_login',
      'usuarios',
    ]);
  });

  it('rodar de novo não muda nada (idempotente)', async () => {
    const antes = await linhas(sql`select count(*)::int as n from drizzle.__drizzle_migrations`);
    await migrar(b.urlDono);
    await migrar(b.urlDono);
    const depois = await linhas(sql`select count(*)::int as n from drizzle.__drizzle_migrations`);
    expect(depois).toEqual(antes);
    expect(antes[0]!.n).toBe(6); // 0000 a 0005 (inicial, restrições, busca, rotinas, acesso, auditoria)
  });

  it('a migração 0001 cria o EXCLUDE, o papel da aplicação e a colação pt-BR', async () => {
    const restricao = await linhas(
      sql`select contype from pg_constraint where conname = 'consultas_sem_sobreposicao_por_medico'`,
    );
    expect(restricao).toEqual([{ contype: 'x' }]);
    expect(
      await linhas(sql`select 1 as ok from pg_roles where rolname = 'medicore_app'`),
    ).toHaveLength(1);
    const ordem = await linhas(
      sql`select x from (values ('Leito 10'), ('Júlia'), ('julia'), ('Leito 2'), ('Ana')) v(x) order by x collate pt_br_base, x`,
    );
    // "Júlia" e "julia" empatam na colação; o desempate (`, x`) usa a ordem binária.
    expect(ordem.map((l) => l.x)).toEqual(['Ana', 'Júlia', 'julia', 'Leito 2', 'Leito 10']);
  });
});
