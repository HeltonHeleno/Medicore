# Publicação da API: homologação e demonstração (Fase 27, BL-01.8)

> **Para quê:** é o passo a passo para colocar a API no ar no Google Cloud (D23: São Paulo) e ligar o app da Vercel nela. A configuração é feita **uma vez**, por quem tem acesso de dono ao projeto do Google Cloud e ao repositório. Depois disso, cada push na `main` publica a API sozinho (`.github/workflows/publicar-api.yml`).
>
> Produção (dados reais, com login) fica para depois do BL-02 (Fase 28) e do BL-04 (Fase 30). Aqui são só os ambientes com **dados fictícios** (D27, D28).

## Visão geral

| Ambiente     | Banco (Cloud SQL)       | API (Cloud Run)             | App (Vercel)                  | Dados                                                    |
| ------------ | ----------------------- | --------------------------- | ----------------------------- | -------------------------------------------------------- |
| Homologação  | `medicore_homologacao`  | `medicore-api-homologacao`  | Prévia de cada PR (Preview)   | dados de exemplo na primeira subida; ficam (para testar) |
| Demonstração | `medicore_demonstracao` | `medicore-api-demonstracao` | Endereço público (Production) | dados de exemplo, **restaurados todo dia de madrugada**  |

- O contêiner migra o banco a cada subida (idempotente) e, num banco vazio, grava os dados de exemplo (`SEMEAR=se-vazio`; o script recusa produção).
- As rotinas do dia (retenção A15, lote vencido, invariantes A17 e, na demonstração, a restauração) são chamadas pelo **Cloud Scheduler**: o Cloud Run desliga as instâncias quando não há uso, e o relógio interno da API para junto (por isso `ROTINAS=nao` no Cloud Run). A tabela `rotinas` garante uma execução por dia.
- A API só aceita chamadas do navegador vindas dos endereços em `CORS_ORIGENS`.

## 1. Projeto, região e serviços (uma vez)

```sh
PROJETO=medicore-hml          # o nome que você escolher
REGIAO=southamerica-east1     # São Paulo (D23)
gcloud config set project "$PROJETO"
gcloud services enable run.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com \
  artifactregistry.googleapis.com cloudscheduler.googleapis.com iamcredentials.googleapis.com
gcloud artifacts repositories create medicore --repository-format=docker --location="$REGIAO"
```

## 2. Banco: uma instância, dois bancos (27.0.1)

```sh
gcloud sql instances create medicore-hml --database-version=POSTGRES_16 --region="$REGIAO" \
  --edition=enterprise --tier=db-g1-small --storage-auto-increase
gcloud sql users set-password postgres --instance=medicore-hml --prompt-for-password
for AMB in homologacao demonstracao; do
  gcloud sql databases create "medicore_$AMB" --instance=medicore-hml
done
```

Para cada banco, crie o dono das tabelas e o usuário da API (o papel `medicore_app` é criado pela migração 0001; crie-o antes para já dar o usuário a ele). Pelo Cloud SQL Studio ou `gcloud sql connect medicore-hml --user=postgres`:

```sql
-- em medicore_homologacao (repita em medicore_demonstracao com outros nomes e senhas)
CREATE ROLE medicore_app NOLOGIN;
CREATE ROLE medicore_hml_dono LOGIN PASSWORD '<senha forte>';
CREATE ROLE medicore_hml_api LOGIN PASSWORD '<outra senha forte>' IN ROLE medicore_app;
GRANT ALL ON SCHEMA public TO medicore_hml_dono;
ALTER DATABASE medicore_homologacao OWNER TO medicore_hml_dono;
```

## 3. Segredos (Secret Manager)

A conexão usa o soquete do Cloud SQL. O endereço precisa de um host qualquer (`localhost`) para ser uma URL válida; o `host=` da consulta é que vale:

```sh
INSTANCIA="$PROJETO:$REGIAO:medicore-hml"
for AMB in homologacao demonstracao; do
  printf 'postgres://<usuario_api>:<senha>@localhost/medicore_%s?host=/cloudsql/%s' "$AMB" "$INSTANCIA" \
    | gcloud secrets create "medicore-$AMB-database-url" --data-file=-
  printf 'postgres://<usuario_dono>:<senha>@localhost/medicore_%s?host=/cloudsql/%s' "$AMB" "$INSTANCIA" \
    | gcloud secrets create "medicore-$AMB-database-url-migracao" --data-file=-
  openssl rand -base64 48 | tr -d '\n' | gcloud secrets create "medicore-$AMB-rotinas-chave" --data-file=-
done
```

## 4. Contas de serviço e acesso do GitHub sem chave

```sh
# Quem roda a API: lê os segredos e conecta no Cloud SQL
gcloud iam service-accounts create medicore-api-execucao
EXEC="medicore-api-execucao@$PROJETO.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJETO" --member="serviceAccount:$EXEC" --role=roles/cloudsql.client
gcloud projects add-iam-policy-binding "$PROJETO" --member="serviceAccount:$EXEC" --role=roles/secretmanager.secretAccessor

# Quem publica (o GitHub Actions)
gcloud iam service-accounts create medicore-publicacao
PUB="medicore-publicacao@$PROJETO.iam.gserviceaccount.com"
for PAPEL in roles/run.admin roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "$PROJETO" --member="serviceAccount:$PUB" --role="$PAPEL"
done
gcloud iam service-accounts add-iam-policy-binding "$EXEC" --member="serviceAccount:$PUB" --role=roles/iam.serviceAccountUser

# Workload Identity Federation: só o repositório HeltonHeleno/medicore entra
gcloud iam workload-identity-pools create github --location=global
gcloud iam workload-identity-pools providers create-oidc github --location=global \
  --workload-identity-pool=github --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository' \
  --attribute-condition="assertion.repository == 'HeltonHeleno/medicore'"
NUMERO="$(gcloud projects describe "$PROJETO" --format='value(projectNumber)')"
gcloud iam service-accounts add-iam-policy-binding "$PUB" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$NUMERO/locations/global/workloadIdentityPools/github/attribute.repository/HeltonHeleno/medicore"
```

## 5. Variáveis no GitHub (Settings → Environments)

Crie os ambientes `homologacao` e `demonstracao` (na demonstração, vale ligar "Required reviewers"). Em cada um, as **variáveis** (não são segredos):

| Variável             | Valor                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `GCP_PROJETO`        | o `$PROJETO`                                                                                                    |
| `GCP_REGIAO`         | `southamerica-east1`                                                                                            |
| `GCP_WIF_PROVEDOR`   | `projects/<NUMERO>/locations/global/workloadIdentityPools/github/providers/github`                              |
| `GCP_CONTA_SERVICO`  | o `$PUB`                                                                                                        |
| `GCP_CONTA_EXECUCAO` | o `$EXEC`                                                                                                       |
| `CLOUDSQL_INSTANCIA` | o `$INSTANCIA`                                                                                                  |
| `CORS_ORIGENS`       | homologação: `https://medicore-*-heltonhelenos-projects.vercel.app`; demonstração: o endereço público da Vercel |
| `APP_URL`            | Fase 28: o endereço do app, para os links dos e-mails (demonstração: o endereço público da Vercel)              |
| `EMAIL_PROVEDOR`     | Fase 28, opcional: `resend` para enviar convites e senhas novas por e-mail (vazio: o link aparece na tela)      |
| `EMAIL_REMETENTE`    | Fase 28, com o Resend: `MediCore <nao-responda@seu-dominio>` (domínio verificado no Resend)                     |

Com `EMAIL_PROVEDOR=resend`, crie também o segredo da chave (uma vez por ambiente):

```sh
printf '%s' 're_SUA_CHAVE' | gcloud secrets create "medicore-$AMB-resend-api-key" --data-file=-
gcloud secrets add-iam-policy-binding "medicore-$AMB-resend-api-key" \
  --member="serviceAccount:$EXEC" --role=roles/secretmanager.secretAccessor
```

Depois, rode o workflow **Publicar a API** pela aba Actions (homologação primeiro). O resumo da execução mostra o endereço da API.

## 6. Rotinas do dia: Cloud Scheduler (27.2.4)

```sh
for AMB in homologacao demonstracao; do
  URL="$(gcloud run services describe "medicore-api-$AMB" --region="$REGIAO" --format='value(status.url)')"
  CHAVE="$(gcloud secrets versions access latest --secret="medicore-$AMB-rotinas-chave")"
  # De madrugada (00:05) e, por segurança, a cada 15 min: a tabela `rotinas` deixa rodar uma vez por dia.
  gcloud scheduler jobs create http "medicore-rotinas-$AMB" --location="$REGIAO" \
    --schedule='5,20,35,50 * * * *' --time-zone='America/Sao_Paulo' \
    --uri="$URL/api/v1/rotinas/executar" --http-method=POST \
    --headers="X-Rotinas-Chave=$CHAVE" --attempt-deadline=300s
done
```

✔ No dia seguinte, em homologação: `select nome, ultimo_dia, resultado from rotinas;` mostra as três rotinas com o dia de hoje (e a `demonstracao`, no banco da demonstração).

## 7. App na Vercel

Desde a Fase 28 (login), o app chama a API **pelo próprio endereço**: `/api/*` é repassado ao Cloud Run pelo `middleware.ts` da raiz (Routing Middleware da Vercel). Assim o cookie da sessão é do próprio app (`SameSite=Lax`, primeira parte) e o navegador nem precisa de CORS.

Em **Project → Settings → Environment Variables**:

| Variável       | Production (demonstração)               | Preview (prévia de cada PR, 27.2.1)    |
| -------------- | --------------------------------------- | -------------------------------------- |
| `VITE_API_URL` | `/`                                     | `/`                                    |
| `API_ORIGEM`   | endereço da `medicore-api-demonstracao` | endereço da `medicore-api-homologacao` |

Sem `VITE_API_URL`, o app continua com os dados no navegador e sem login (como até a 1.2.0). Com ela, no primeiro acesso aparece o aviso "Os dados de exemplo agora ficam no servidor" (D27), o navegador deixa de guardar dados (só tema e preferências) e o sistema pede login.

## 8. Contas (Fase 28)

- **Demonstração e homologação:** a tela de login tem as **contas de demonstração** (um botão por perfil e a "equipe completa"). Elas não existem com `AMBIENTE=producao` (nem com `LOGIN_DEMONSTRACAO=nao`).
- **Primeiro administrador** (produção, ou para testar convites): com o banco sem usuários,

  ```sh
  DATABASE_URL="$(gcloud secrets versions access latest --secret="medicore-$AMB-database-url")" \
  APP_URL="https://seu-app" npm run acesso:primeiro-admin -w @medicore/api -- "Nome Completo" email@hospital.com
  ```

  O comando mostra o link do primeiro acesso (48 h, uso único). A pessoa define a senha e o segundo fator (obrigatório para Administrador). Depois disso, os convites saem da tela **Configurações → Usuários**.

## Custos (ordem de grandeza)

- Cloud SQL `db-g1-small` com 10 GB: a maior parte do custo (a instância fica ligada).
- Cloud Run com `min-instances 0`: só cobra enquanto atende; a primeira chamada depois de um tempo parado demora alguns segundos (partida a frio).
- Cloud Scheduler: até 3 tarefas grátis por conta.
