-- Fase 28 (BL-02, D29–D31) — Usuários, perfis, sessões, convites, códigos de recuperação e tentativas
-- de login; o id do autor (D31) nas atividades, dispensações, movimentações e pedidos de leito.

CREATE TABLE "codigos_recuperacao" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"codigo_hash" text NOT NULL,
	"usado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "convites" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"tipo" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "perfis_usuario" (
	"usuario_id" text NOT NULL,
	"perfil" text NOT NULL,
	CONSTRAINT "perfis_usuario_usuario_id_perfil_pk" PRIMARY KEY("usuario_id","perfil")
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"etapa" text NOT NULL,
	"csrf" text NOT NULL,
	"criada_em" timestamp with time zone NOT NULL,
	"ultimo_uso_em" timestamp with time zone NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"encerrada_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tentativas_login" (
	"email" text PRIMARY KEY NOT NULL,
	"falhas" integer DEFAULT 0 NOT NULL,
	"bloqueado_ate" timestamp with time zone,
	"ultima_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" text PRIMARY KEY NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"inativado_em" timestamp with time zone,
	"motivo_inativacao" text,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text,
	"medico_id" text,
	"mfa_segredo" text,
	"mfa_ativo" boolean DEFAULT false NOT NULL,
	"ultimo_acesso_em" timestamp with time zone,
	"demonstracao" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "atividades" ADD COLUMN "autor" text;--> statement-breakpoint
ALTER TABLE "atividades" ADD COLUMN "autor_id" text;--> statement-breakpoint
ALTER TABLE "dispensacoes" ADD COLUMN "autor_id" text;--> statement-breakpoint
ALTER TABLE "movimentacoes" ADD COLUMN "autor_id" text;--> statement-breakpoint
ALTER TABLE "solicitacoes" ADD COLUMN "autor_id" text;--> statement-breakpoint
ALTER TABLE "codigos_recuperacao" ADD CONSTRAINT "codigos_recuperacao_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convites" ADD CONSTRAINT "convites_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_usuario" ADD CONSTRAINT "perfis_usuario_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "codigos_recuperacao_usuario" ON "codigos_recuperacao" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "convites_usuario" ON "convites" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "sessoes_usuario" ON "sessoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_unico" ON "usuarios" USING btree (lower("email"));