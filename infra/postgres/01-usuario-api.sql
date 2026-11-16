-- Fase 24 (24.2.2) — Docker Compose: login da API, que entra no papel `medicore_app` criado pela
-- migração 0001 (sem UPDATE/DELETE em movimentações, R-F9). O papel é criado aqui também, para o
-- login existir antes da primeira migração; a migração não o recria.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medicore_app') THEN
    CREATE ROLE medicore_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medicore_api') THEN
    CREATE ROLE medicore_api LOGIN PASSWORD 'medicore_api' IN ROLE medicore_app;
  END IF;
END
$$;
