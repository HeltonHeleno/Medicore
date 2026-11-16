-- Fase 24 (D25, R-F9) — Restrições que o Drizzle não descreve. Migração escrita à mão.

-- A1/A2: consultas agendadas do mesmo médico não se sobrepõem. O intervalo é [inicio, fim).
-- O `btree_gist` permite usar `=` (médico) junto com `&&` (sobreposição) no mesmo índice GiST.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_sem_sobreposicao_por_medico"
  EXCLUDE USING gist ("medico_id" WITH =, tstzrange("inicio", "fim", '[)') WITH &&)
  WHERE ("status" = 'agendada');
--> statement-breakpoint

-- Papel da aplicação. A API se conecta com um usuário que pertence a este papel
-- (no Docker Compose: `medicore_api`; na nuvem, criado na Fase 27). Quem roda as migrações
-- é o dono das tabelas e não usa este papel.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medicore_app') THEN
    CREATE ROLE medicore_app NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO medicore_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO medicore_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO medicore_app;
--> statement-breakpoint

-- R-F9: movimentações são imutáveis. Correções são movimentos contrários, nunca edição.
REVOKE UPDATE, DELETE, TRUNCATE ON "movimentacoes" FROM medicore_app;
--> statement-breakpoint

-- R-API2: as listas ordenam texto como as telas (`Intl.Collator('pt-BR', { sensitivity: 'base',
-- numeric: true })`): sem diferença de acentos e maiúsculas, números pela ordem numérica.
CREATE COLLATION IF NOT EXISTS pt_br_base (provider = icu, locale = 'pt-BR-u-ks-level1-kn-true', deterministic = false);
