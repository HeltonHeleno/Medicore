# Fase 27 — Backend (4/4): o navegador usa a API e os ambientes (BL-01.7, BL-01.8)

- **Branch:** `feat/fase-27-backend-corte` (sobre a `main` com a Fase 26)
- **Plano:** `PLANO_EXECUCAO_MELHORIAS.md`, tarefas 27.0 a 27.F
- **Especificação:** `PLANO_MELHORIAS_MEDICORE.md`, BL-01.7, BL-01.8, D26–D28

## Resumo

As telas funcionam com os dados no servidor, sem mudar uma linha delas. O app construído com **`VITE_API_URL`** usa a API; sem a variável, continua com os dados no navegador. Assim o PR pode ser mesclado já, e a demonstração da Vercel segue funcionando até a API ser publicada (decisão desta fase, no Registro da especificação).

Os **cenários 1 a 10 de ponta a ponta passaram 3 vezes seguidas contra a API local**. Eles também rodam num job novo da CI, com API e PostgreSQL. A publicação no Google Cloud está pronta para ser ligada: um workflow do Cloud Run e o guia `docs/backend/PUBLICACAO.md`.

> **Antes de tudo:** o primeiro commit corrige a CI do PR #11 ("Testes e cobertura"). O contrato e o cliente dos módulos não eram exercitados pelos testes do domínio, e a cobertura caiu para 83,3% (meta 90%). Agora está em 96,2%.

### O navegador usa a API (BL-01.7)

- **Troca no build:** no modo API, o `vite.config.ts` resolve cada `services/pacientes.ts`, `leitos.ts`, `farmacia.ts`… para `services/api/` (15 arquivos). As funções têm as mesmas assinaturas (conferidas pelo TypeScript com `typeof` da versão local) e devolvem as mesmas classes de erro. Um teste confere que nada do que as telas importam ficou de fora.
- **O repositório local nem entra no pacote:** no modo API, o pacote inicial tem **144,4 kB** (o modo navegador tem 154,2 kB).
- **Recarga (D26):**
  - depois de cada gravação aceita, as telas abertas recarregam;
  - a cada 30 s, com a aba visível, recarregam as telas que assinam as coleções dos módulos (fila, mapa, estoque, Painel).
- **E-22:**
  - ao carregar, "Sem conexão com o servidor", com "Tentar novamente";
  - ao gravar, o aviso tem **"Tentar de novo"**, que reenvia a gravação que falhou. Se ela tinha chegado, a versão dá 412: nada é gravado duas vezes.
  - tempo esgotado (20 s) e páginas de erro de proxy (502–504) também viram E-22.
- **Listas com mais de 100 por página** (o combo de médicos e a lista de medicamentos da dispensação pedem 200 ou 500): o modo API busca as páginas de 100 e junta, com o mesmo resultado.
- **Aviso único (27.2.3, D27):** no primeiro acesso, "Os dados de exemplo agora ficam no servidor". O "Entendi" apaga os dados fictícios que estavam no navegador (o tema fica).
- **Vitrine:** o "Restaurar dados de exemplo" explica que, com a API, quem restaura é a rotina da demonstração.

### Ambientes (BL-01.8)

- **CORS por ambiente:** `CORS_ORIGENS`, com `*` para as prévias da Vercel (o `*` não atravessa pontos nem barras).
- **Rotinas na nuvem (27.2.4):** `POST /api/v1/rotinas/executar` para o Cloud Scheduler. A rota só existe com `ROTINAS_CHAVE`, a chave é comparada em tempo constante, e sem ela a resposta é 404. A tabela `rotinas` continua garantindo uma execução por dia.
- **Demonstração (27.2.2):** a rotina `demonstracao` volta os dados de exemplo todo dia, de madrugada, só nesse ambiente.
- **Contêiner:** migra a cada subida e, com `SEMEAR=se-vazio`, grava os dados de exemplo num banco novo (nunca em produção).
- **Publicação:** `.github/workflows/publicar-api.yml` publica homologação e demonstração no Cloud Run a cada push na `main`. Ele só roda depois da configuração única do guia, que está todo em comandos `gcloud`:
  - Cloud SQL, segredos no Secret Manager e Workload Identity Federation (sem chave no GitHub);
  - Cloud Scheduler para as rotinas;
  - `VITE_API_URL` na Vercel: Production → demonstração, Preview → homologação.

### Testes de ponta a ponta contra a API (27.T.1)

Com `E2E_API`, o Playwright sobe a API (migrada, com as rotas de teste) e o app no modo API. Os ajudantes dos testes passam a falar com o servidor:

- cada teste começa com os dados de exemplo **no instante do navegador** (o relógio do servidor acompanha o `page.clock`);
- `ler` e `gravarDireto` leem e gravam no banco (antes, no `localStorage`).

As rotas de teste (`/api/v1/_teste`) só existem com `AMBIENTE=teste` e `ROTAS_TESTE=sim`; em qualquer outro ambiente, a API nem sobe com essa variável.

Um teste foi pulado no modo API, de propósito: "duas abas, a segunda é avisada" depende do aviso entre abas do navegador, que no modo API não existe na agenda (D26). A variante "a segunda descobre ao salvar" roda e passa.

### Achados

1. **Detalhe com prazo vindo do cache:** depois de 25 h, o botão "Desfazer alta" continuava na tela. O navegador mandava `If-None-Match` sozinho e a API respondia 304 pela versão, mas o prazo (`desfazerAltaAte`) muda com o tempo, não com a versão. Agora os detalhes com campos calculados na hora (leito, internação, atendimento, pedido, medicamento, dispensação e a consulta, por `atrasada`) mandam `ETag` sem 304 e com `Cache-Control: no-store`. Cadastros puros (paciente, médico) continuam com 304.
2. **Semeadura rodando dentro da API:** a linha de comando da semeadura estava no mesmo arquivo da função `semear`. Como a API agora importa `semear` (demonstração e testes), o pacote do `esbuild` executava o comando ao subir a API (`import.meta.url` é o da API). Ele foi para `semear-cli.ts`.
3. **Fila redesenhada três vezes:** no modo API, a fila, os indicadores e os alertas chegam em horas diferentes, e a fila inteira era desenhada a cada um. A lista agora é `memo`.

## Números

| Indicador                              | Fase 26          | Fase 27                                                                                           |
| -------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| Testes da API                          | 320 (22)         | **329 (23)** (+ CORS, rotas de teste, rotinas pelo Scheduler, restauração da demonstração)        |
| Testes do domínio                      | 222              | **233** (cobertura 96,2%)                                                                         |
| Testes do app                          | 528              | **552** (+24 do modo API)                                                                         |
| Playwright, modo navegador             | 139              | **139** (6,1 min)                                                                                 |
| Playwright, modo API (cenários 1 a 10) | —                | **11 + 1 pulado, 3 rodadas seguidas verdes** (1,2–1,3 min cada)                                   |
| Cobertura                              | API 97,6% linhas | API **97,6%**, domínio **96,2%**, app **91,0%** de linhas                                         |
| Pacote inicial (gzip)                  | 154,0 kB         | **154,2 kB** no modo navegador (+0,2: aviso e E-22); **144,4 kB** no modo API                     |
| Lighthouse desktop, modo API           | —                | Painel 99, mapa 96, fila 96–97, estoque 97, dispensar 96; acessibilidade, boas práticas e SEO 100 |

### Carga (27.T.2, k6, `apps/api/carga/telas-operacionais.js`)

50 usuários ao mesmo tempo, numa máquina de 2 vCPU com a API (uma instância Node), o PostgreSQL e o k6 juntos:

| Cenário                                                            | Chamadas/s | p95 leitura | p95 gravação | Erros | Meta (p95 < 300 ms) |
| ------------------------------------------------------------------ | ---------: | ----------: | -----------: | ----: | :-----------------: |
| Uso real: cada pessoa numa tela, olhando 5–15 s, gravando às vezes |         14 |       34 ms |        35 ms |    0% |         ✅          |
| Intenso (`RITMO=intenso`): todas as telas sem pausa, 1–3 s         |         87 |      663 ms |       426 ms |    0% |         ❌          |

O cenário intenso mostra o limite de **uma** instância: cerca de 80 chamadas/s com a CPU dividida com o banco e o próprio k6. No Cloud Run, o tráfego se divide entre até 3 instâncias (`--max-instances 3`). A unidade de trabalho lê as tabelas pequenas inteiras a cada chamada (Fase 26). Se o uso real chegar perto do intenso, o próximo passo é um retrato em memória entre chamadas, invalidado pelas gravações.

## Verificação

- [x] `lint`, `format:check`, `i18n:verificar`, `typecheck`, `actionlint` (dos dois workflows)
- [x] Testes do domínio, do app e da API verdes, com as metas de cobertura
- [x] **27.T.1:** cenários 1 a 10 no modo API, 3 rodadas seguidas verdes; e 139 de ponta a ponta no modo navegador
- [x] **27.T.2:** carga com 50 usuários (tabela acima)
- [x] **27.T.3:** Lighthouse desktop ≥ 90 no Painel, mapa, fila, estoque e dispensar, no modo API
- [x] Build da API (`dist/principal.js`, `migrar.js`, `semear.js`) sobe e responde; `semear.js --se-vazio` não mexe num banco com dados
- [ ] 👤 **27.0.1, 27.2.1, 27.2.4:** criar o projeto, o banco, os segredos e o Scheduler no Google Cloud e as variáveis no GitHub e na Vercel (`docs/backend/PUBLICACAO.md`)
- [ ] 👤 **27.V.1:** 10 min de uso na demonstração publicada, com duas pessoas, e a rotina A17 do dia seguinte sem violação
- [ ] 👤 CI verde no GitHub (com o job novo "Ponta a ponta com a API") e PR mesclado **depois** do `verificacoes` terminar

## Para o revisor

- **Por que uma chave e não trocar tudo de uma vez (27.1.4):** sem a API publicada, tirar o modo navegador quebraria a demonstração da Vercel no merge. A chave deixa as duas coisas separadas: o merge agora e a troca quando você ligar `VITE_API_URL`. O código do repositório local sai numa limpeza depois da 2.0-beta (tarefa 27.F.2 do plano).
- **`ROTINAS=nao` no Cloud Run:** o relógio interno pararia com as instâncias. Quem chama é o Scheduler, de 15 em 15 minutos; a tabela `rotinas` deixa rodar uma vez por dia.
- **Chave das rotinas no Scheduler:** fica na configuração da tarefa, visível só para quem administra o projeto. Com o login (BL-02), dá para trocar por um token OIDC do próprio Google.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TpSdmCvMp9hkqHxXnLjuub
