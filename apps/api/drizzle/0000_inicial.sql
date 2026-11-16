CREATE TABLE "atendimentos" (
	"id" text PRIMARY KEY NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"arquivado" boolean,
	"dia" date NOT NULL,
	"numero" text NOT NULL,
	"paciente_id" text,
	"provisorio" jsonb,
	"chegada_em" timestamp with time zone NOT NULL,
	"modo_chegada" text NOT NULL,
	"queixa" text NOT NULL,
	"risco" text,
	"prazo" timestamp with time zone,
	"triagens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reavaliacoes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text NOT NULL,
	"medico_id" text,
	"leito_observacao_id" text,
	"solicitacao_id" text,
	"status_antes_do_leito" text,
	"desfecho" jsonb,
	"eventos" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "atividades" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"descricao" text NOT NULL,
	"em" timestamp with time zone NOT NULL,
	"referencia_id" text
);
--> statement-breakpoint
CREATE TABLE "consultas" (
	"id" text PRIMARY KEY NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"paciente_id" text NOT NULL,
	"medico_id" text NOT NULL,
	"departamento_id" text NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone NOT NULL,
	"duracao_min" integer NOT NULL,
	"tipo" text NOT NULL,
	"status" text NOT NULL,
	"motivo" text,
	"motivo_cancelamento" text,
	"eventos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "consultas_fim_depois_do_inicio" CHECK ("consultas"."fim" > "consultas"."inicio")
);
--> statement-breakpoint
CREATE TABLE "dispensacoes" (
	"id" text PRIMARY KEY NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"arquivado" boolean,
	"paciente_id" text NOT NULL,
	"destino" jsonb NOT NULL,
	"medico_solicitante_id" text NOT NULL,
	"itens" jsonb NOT NULL,
	"alertas_confirmados" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text NOT NULL,
	"estorno" jsonb,
	"em" timestamp with time zone NOT NULL,
	"autor" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internacoes" (
	"id" text PRIMARY KEY NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"arquivado" boolean,
	"paciente_id" text NOT NULL,
	"leito_id" text NOT NULL,
	"medico_responsavel_id" text NOT NULL,
	"origem" text NOT NULL,
	"hospital_origem" text,
	"atendimento_id" text,
	"solicitacao_id" text,
	"motivo" text NOT NULL,
	"precaucao" text NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"previsao_alta" date,
	"status" text NOT NULL,
	"alta" jsonb,
	"eventos" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leitos" (
	"id" text PRIMARY KEY NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"codigo" text NOT NULL,
	"setor_id" text NOT NULL,
	"quarto" text,
	"perfil" text NOT NULL,
	"isolamento" boolean DEFAULT false NOT NULL,
	"status" text NOT NULL,
	"internacao_id" text,
	"atendimento_id" text,
	"solicitacao_id" text,
	"desde" timestamp with time zone NOT NULL,
	"bloqueio" jsonb,
	"higienizacao" jsonb
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" text PRIMARY KEY NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"medicamento_id" text NOT NULL,
	"numero" text NOT NULL,
	"validade" date NOT NULL,
	"fabricante" text,
	"nota_fiscal" text,
	"quantidade_inicial" integer NOT NULL,
	"quantidade_atual" integer NOT NULL,
	"entrada_em" timestamp with time zone NOT NULL,
	"bloqueio" jsonb,
	"saldo_arquivado" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "lotes_quantidade_atual_nao_negativa" CHECK ("lotes"."quantidade_atual" >= 0),
	CONSTRAINT "lotes_quantidade_inicial_positiva" CHECK ("lotes"."quantidade_inicial" > 0)
);
--> statement-breakpoint
CREATE TABLE "medicamentos" (
	"id" text PRIMARY KEY NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"inativado_em" timestamp with time zone,
	"motivo_inativacao" text,
	"nome" text NOT NULL,
	"nome_comercial" text,
	"principio_ativo" text NOT NULL,
	"classe" text,
	"concentracao" text NOT NULL,
	"forma" text NOT NULL,
	"unidade" text NOT NULL,
	"controlado" jsonb,
	"unidades_por_embalagem" integer,
	"estoque_minimo" integer NOT NULL,
	CONSTRAINT "medicamentos_estoque_minimo" CHECK ("medicamentos"."estoque_minimo" >= 0)
);
--> statement-breakpoint
CREATE TABLE "medicos" (
	"id" text PRIMARY KEY NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"inativado_em" timestamp with time zone,
	"motivo_inativacao" text,
	"nome" text NOT NULL,
	"tratamento" text NOT NULL,
	"crm" jsonb NOT NULL,
	"departamento_id" text NOT NULL,
	"telefone" text NOT NULL,
	"email" text NOT NULL,
	"disponibilidade" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimentacoes" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"medicamento_id" text NOT NULL,
	"lote_id" text NOT NULL,
	"quantidade" integer NOT NULL,
	"saldo_lote_apos" integer NOT NULL,
	"dispensacao_id" text,
	"motivo" text,
	"termo" text,
	"autor" text NOT NULL,
	"em" timestamp with time zone NOT NULL,
	CONSTRAINT "movimentacoes_quantidade_positiva" CHECK ("movimentacoes"."quantidade" > 0),
	CONSTRAINT "movimentacoes_saldo_nao_negativo" CHECK ("movimentacoes"."saldo_lote_apos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pacientes" (
	"id" text PRIMARY KEY NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"inativado_em" timestamp with time zone,
	"motivo_inativacao" text,
	"nome" text NOT NULL,
	"nome_social" text,
	"cpf" text NOT NULL,
	"data_nascimento" date NOT NULL,
	"sexo" text NOT NULL,
	"telefone" text NOT NULL,
	"email" text,
	"endereco" jsonb,
	"convenio" jsonb NOT NULL,
	"responsavel" jsonb,
	"tipo_sanguineo" text,
	"alergias" text,
	"contato_emergencia" jsonb,
	"observacoes" text,
	"consentimento_lgpd" jsonb NOT NULL,
	"obito" jsonb
);
--> statement-breakpoint
CREATE TABLE "resumos" (
	"id" text PRIMARY KEY NOT NULL,
	"internacoes" integer DEFAULT 0 NOT NULL,
	"altas_por_tipo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"atendimentos_por_cor" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"atendimentos_por_desfecho" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"espera_por_cor" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dispensacoes" integer DEFAULT 0 NOT NULL,
	"saidas_por_medicamento" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solicitacoes" (
	"id" text PRIMARY KEY NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"arquivado" boolean,
	"origem" text NOT NULL,
	"atendimento_id" text,
	"paciente_id" text NOT NULL,
	"setor_desejado" text NOT NULL,
	"precaucao" text NOT NULL,
	"motivo" text NOT NULL,
	"data_prevista" date,
	"prioridade" text NOT NULL,
	"justificativa_prioridade" text,
	"status" text NOT NULL,
	"leito_reservado_id" text,
	"reservada_em" timestamp with time zone,
	"internacao_id" text,
	"motivo_cancelamento" text,
	"cancelada_em" timestamp with time zone,
	"autor" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_medico_id_medicos_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_leito_observacao_id_leitos_id_fk" FOREIGN KEY ("leito_observacao_id") REFERENCES "public"."leitos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_medico_id_medicos_id_fk" FOREIGN KEY ("medico_id") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensacoes" ADD CONSTRAINT "dispensacoes_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensacoes" ADD CONSTRAINT "dispensacoes_medico_solicitante_id_medicos_id_fk" FOREIGN KEY ("medico_solicitante_id") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internacoes" ADD CONSTRAINT "internacoes_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internacoes" ADD CONSTRAINT "internacoes_leito_id_leitos_id_fk" FOREIGN KEY ("leito_id") REFERENCES "public"."leitos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internacoes" ADD CONSTRAINT "internacoes_medico_responsavel_id_medicos_id_fk" FOREIGN KEY ("medico_responsavel_id") REFERENCES "public"."medicos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internacoes" ADD CONSTRAINT "internacoes_atendimento_id_atendimentos_id_fk" FOREIGN KEY ("atendimento_id") REFERENCES "public"."atendimentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internacoes" ADD CONSTRAINT "internacoes_solicitacao_id_solicitacoes_id_fk" FOREIGN KEY ("solicitacao_id") REFERENCES "public"."solicitacoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_medicamento_id_medicamentos_id_fk" FOREIGN KEY ("medicamento_id") REFERENCES "public"."medicamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_medicamento_id_medicamentos_id_fk" FOREIGN KEY ("medicamento_id") REFERENCES "public"."medicamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_dispensacao_id_dispensacoes_id_fk" FOREIGN KEY ("dispensacao_id") REFERENCES "public"."dispensacoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_atendimento_id_atendimentos_id_fk" FOREIGN KEY ("atendimento_id") REFERENCES "public"."atendimentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_paciente_id_pacientes_id_fk" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_leito_reservado_id_leitos_id_fk" FOREIGN KEY ("leito_reservado_id") REFERENCES "public"."leitos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "atendimentos_numero_no_dia" ON "atendimentos" USING btree ("dia","numero");--> statement-breakpoint
CREATE UNIQUE INDEX "atendimentos_um_aberto_por_paciente" ON "atendimentos" USING btree ("paciente_id") WHERE "atendimentos"."status" <> 'encerrado' and "atendimentos"."paciente_id" is not null;--> statement-breakpoint
CREATE INDEX "atendimentos_status" ON "atendimentos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "atividades_em" ON "atividades" USING btree ("em");--> statement-breakpoint
CREATE INDEX "consultas_medico_inicio" ON "consultas" USING btree ("medico_id","inicio");--> statement-breakpoint
CREATE INDEX "consultas_paciente_inicio" ON "consultas" USING btree ("paciente_id","inicio");--> statement-breakpoint
CREATE INDEX "dispensacoes_paciente" ON "dispensacoes" USING btree ("paciente_id","em");--> statement-breakpoint
CREATE UNIQUE INDEX "internacoes_uma_ativa_por_paciente" ON "internacoes" USING btree ("paciente_id") WHERE "internacoes"."status" = 'ativa';--> statement-breakpoint
CREATE UNIQUE INDEX "internacoes_uma_ativa_por_leito" ON "internacoes" USING btree ("leito_id") WHERE "internacoes"."status" = 'ativa';--> statement-breakpoint
CREATE INDEX "internacoes_status" ON "internacoes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "leitos_codigo_unico" ON "leitos" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "leitos_setor" ON "leitos" USING btree ("setor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lotes_numero_por_medicamento" ON "lotes" USING btree ("medicamento_id",upper("numero"));--> statement-breakpoint
CREATE INDEX "lotes_validade" ON "lotes" USING btree ("medicamento_id","validade");--> statement-breakpoint
CREATE INDEX "medicamentos_nome" ON "medicamentos" USING btree ("nome");--> statement-breakpoint
CREATE UNIQUE INDEX "medicos_crm_unico" ON "medicos" USING btree (("crm" ->> 'numero'),("crm" ->> 'uf'));--> statement-breakpoint
CREATE UNIQUE INDEX "medicos_email_unico" ON "medicos" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "medicos_departamento" ON "medicos" USING btree ("departamento_id");--> statement-breakpoint
CREATE INDEX "movimentacoes_medicamento_em" ON "movimentacoes" USING btree ("medicamento_id","em");--> statement-breakpoint
CREATE INDEX "movimentacoes_lote" ON "movimentacoes" USING btree ("lote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pacientes_cpf_unico" ON "pacientes" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX "pacientes_nome" ON "pacientes" USING btree ("nome");--> statement-breakpoint
CREATE INDEX "solicitacoes_status" ON "solicitacoes" USING btree ("status");