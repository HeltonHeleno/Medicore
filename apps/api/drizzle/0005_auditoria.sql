-- Fase 29 (BL-03, D32) — Auditoria: a trilha (só inclusão), os selos diários e os gatilhos das
-- gravações. Gerada pelo drizzle-kit (tabelas) e completada à mão (funções, gatilhos e permissões).
CREATE TABLE "auditoria" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auditoria_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"em" timestamp with time zone NOT NULL,
	"dia" date NOT NULL,
	"usuario_id" text,
	"usuario_nome" text,
	"ip" text,
	"agente" text,
	"origem" text NOT NULL,
	"acao" text NOT NULL,
	"entidade" text NOT NULL,
	"registro_id" text,
	"paciente_id" text,
	"campos" jsonb,
	"detalhe" text
);
--> statement-breakpoint
CREATE TABLE "auditoria_selos" (
	"dia" date PRIMARY KEY NOT NULL,
	"quantidade" integer NOT NULL,
	"ultimo_id" bigint,
	"hash" text NOT NULL,
	"hash_anterior" text,
	"selado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "auditoria_paciente_em" ON "auditoria" USING btree ("paciente_id","em");--> statement-breakpoint
CREATE INDEX "auditoria_usuario_em" ON "auditoria" USING btree ("usuario_id","em");--> statement-breakpoint
CREATE INDEX "auditoria_em" ON "auditoria" USING btree ("em");--> statement-breakpoint
CREATE INDEX "auditoria_dia_id" ON "auditoria" USING btree ("dia","id");--> statement-breakpoint

-- Fase 29 (BL-03.1, D32) — Gancho único das gravações: um gatilho por tabela grava o antes →
-- depois na MESMA transação. Quem, de onde e quando vêm do contexto que a API marca no começo de
-- cada transação (`SET LOCAL medicore.contexto`, ver `src/banco/conexao.ts`).

-- CPF e documentos sempre mascarados (só os 6 dígitos do meio do CPF, como nas listas, R-P4).
CREATE OR REPLACE FUNCTION medicore_ocultar_documento(valor text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  d text := regexp_replace(coalesce(valor, ''), '\D', '', 'g');
BEGIN
  IF valor IS NULL THEN RETURN NULL; END IF;
  IF length(d) = 11 THEN
    RETURN '***.' || substr(d, 4, 3) || '.' || substr(d, 7, 3) || '-**';
  END IF;
  RETURN '***';
END
$$;
--> statement-breakpoint

-- Percorre o registro (e os campos JSON dentro dele): documentos mascarados; senha e segredo do
-- MFA nunca entram (R-AU5).
CREATE OR REPLACE FUNCTION medicore_ocultar(valor jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  k text;
  v jsonb;
  r jsonb;
BEGIN
  IF jsonb_typeof(valor) = 'object' THEN
    r := '{}'::jsonb;
    FOR k, v IN SELECT * FROM jsonb_each(valor) LOOP
      IF k IN ('senha_hash', 'mfa_segredo', 'csrf', 'codigo_hash') THEN
        CONTINUE;
      ELSIF k IN ('cpf', 'cns', 'documento', 'numero_documento', 'numeroDocumento')
            AND jsonb_typeof(v) = 'string' THEN
        r := r || jsonb_build_object(k, medicore_ocultar_documento(v #>> '{}'));
      ELSE
        r := r || jsonb_build_object(k, medicore_ocultar(v));
      END IF;
    END LOOP;
    RETURN r;
  ELSIF jsonb_typeof(valor) = 'array' THEN
    SELECT coalesce(jsonb_agg(medicore_ocultar(e) ORDER BY i), '[]'::jsonb) INTO r
      FROM jsonb_array_elements(valor) WITH ORDINALITY x(e, i);
    RETURN r;
  END IF;
  RETURN valor;
END
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION medicore_auditar() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  ctx jsonb := nullif(current_setting('medicore.contexto', true), '')::jsonb;
  -- Campos que mudam sozinhos ou que nunca entram na trilha.
  ignorar text[] := ARRAY['versao', 'atualizado_em', 'criado_em', 'ultimo_acesso_em',
                          'senha_hash', 'mfa_segredo'];
  antes jsonb;
  depois jsonb;
  linha jsonb;
  campos jsonb := '{}'::jsonb;
  acao text;
  k text;
  a jsonb;
  d jsonb;
  n integer;
  momento timestamptz;
BEGIN
  -- Só o dono das tabelas (semeadura, restauração da demonstração, testes) pode desligar a trilha.
  -- O usuário da aplicação (membro de `medicore_app`) nunca.
  IF current_setting('medicore.auditar', true) = 'nao'
     AND session_user <> 'medicore_app'
     AND NOT EXISTS (
       SELECT 1 FROM pg_auth_members m
         JOIN pg_roles g ON g.oid = m.roleid AND g.rolname = 'medicore_app'
         JOIN pg_roles u ON u.oid = m.member AND u.rolname = session_user) THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    acao := 'inclusao';
    depois := medicore_ocultar(to_jsonb(NEW));
    linha := depois;
  ELSIF TG_OP = 'UPDATE' THEN
    acao := 'alteracao';
    antes := medicore_ocultar(to_jsonb(OLD));
    depois := medicore_ocultar(to_jsonb(NEW));
    linha := depois;
  ELSE
    acao := 'exclusao';
    antes := medicore_ocultar(to_jsonb(OLD));
    linha := antes;
  END IF;

  FOR k IN SELECT jsonb_object_keys(linha) LOOP
    CONTINUE WHEN k = ANY (ignorar);
    a := antes -> k;
    d := depois -> k;
    CONTINUE WHEN a IS NOT DISTINCT FROM d;
    CONTINUE WHEN TG_OP = 'INSERT' AND (d IS NULL OR d = 'null'::jsonb);
    CONTINUE WHEN TG_OP = 'DELETE' AND (a IS NULL OR a = 'null'::jsonb);
    n := CASE WHEN jsonb_typeof(a) = 'array' THEN jsonb_array_length(a) END;
    -- Listas que só crescem (eventos, reavaliações, itens): só o que entrou.
    IF jsonb_typeof(a) = 'array' AND jsonb_typeof(d) = 'array' AND jsonb_array_length(d) > n
       AND (SELECT coalesce(jsonb_agg(e ORDER BY i), '[]'::jsonb)
              FROM jsonb_array_elements(d) WITH ORDINALITY x(e, i) WHERE i <= n) = a THEN
      campos := campos || jsonb_build_object(k, jsonb_build_object('adicionados',
        (SELECT jsonb_agg(e ORDER BY i) FROM jsonb_array_elements(d) WITH ORDINALITY x(e, i)
          WHERE i > n)));
    ELSE
      campos := campos || jsonb_build_object(k, jsonb_build_object('antes', a, 'depois', d));
    END IF;
  END LOOP;

  -- Alteração só de campos ignorados (ex.: o último acesso do usuário): nada a registrar.
  IF TG_OP = 'UPDATE' AND campos = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  momento := coalesce((ctx ->> 'em')::timestamptz, now());
  INSERT INTO auditoria (em, dia, usuario_id, usuario_nome, ip, agente, origem, acao, entidade,
                         registro_id, paciente_id, campos)
  VALUES (momento, (momento AT TIME ZONE 'America/Sao_Paulo')::date,
          ctx ->> 'usuarioId', ctx ->> 'usuarioNome', ctx ->> 'ip', ctx ->> 'agente',
          coalesce(ctx ->> 'origem', 'banco'), acao, TG_TABLE_NAME,
          coalesce(linha ->> 'id', linha ->> 'usuario_id'),
          CASE WHEN TG_TABLE_NAME = 'pacientes' THEN linha ->> 'id' ELSE linha ->> 'paciente_id' END,
          campos);
  RETURN NULL;
END
$$;
--> statement-breakpoint

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pacientes', 'medicos', 'consultas', 'leitos', 'atendimentos',
    'solicitacoes', 'internacoes', 'medicamentos', 'lotes', 'dispensacoes', 'movimentacoes',
    'usuarios', 'perfis_usuario'] LOOP
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I '
                   'FOR EACH ROW EXECUTE FUNCTION medicore_auditar()', t || '_auditoria', t);
  END LOOP;
END
$$;
--> statement-breakpoint

-- BL-03.5: a trilha é só de inclusão para o usuário da aplicação.
REVOKE UPDATE, DELETE, TRUNCATE ON "auditoria", "auditoria_selos" FROM medicore_app;
--> statement-breakpoint
GRANT USAGE ON SEQUENCE "auditoria_id_seq" TO medicore_app;
