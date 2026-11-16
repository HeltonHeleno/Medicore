-- Fase 26 (26.2.1) — Rotinas do servidor: o último dia em que cada rotina rodou (uma vez por dia).

CREATE TABLE "rotinas" (
	"nome" text PRIMARY KEY NOT NULL,
	"ultimo_dia" date,
	"executada_em" timestamp with time zone,
	"resultado" jsonb
);
