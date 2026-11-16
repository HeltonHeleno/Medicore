# Fase 26 — Backend (3/4): leitos, emergência, farmácia e rotinas no servidor (BL-01.5, BL-01.6)

- **Branch:** `feat/fase-26-backend-modulos` (sobre a `main` com a Fase 25)
- **Plano:** `PLANO_EXECUCAO_MELHORIAS.md`, tarefas 26.0 a 26.F
- **Especificação:** `PLANO_MELHORIAS_MEDICORE.md`, BL-01.5, BL-01.6, R-API3, A15, A17

## Resumo

L1–L9, E1–E10, F1–F9, as regras entre módulos (R-X), os indicadores (A12–A14) e as rotinas do dia estão no servidor. **Os 87 testes de serviço de leitos, emergência e farmácia do navegador rodam contra a API e o banco**, todos verdes, e as 500 operações aleatórias por semente também. O app continua usando os dados do navegador até a Fase 27.

> **Antes de tudo:** o primeiro commit corrige a CI da `main`, vermelha desde o merge do PR #10. Os arquivos de teste da API rodam em paralelo, cada um com o seu banco, e dois deles criavam o papel `medicore_app` ao mesmo tempo (`23505` em `pg_authid`). O papel agora é criado uma vez antes dos testes, e a migração ignora o erro se outra criar junto.

### Como ficou

- **As regras são o mesmo código do navegador.** Os serviços do navegador são síncronos, sobre coleções em memória. Em vez de reescrever cada regra (e arriscar mudar alguma), a API roda o mesmo código sobre uma **unidade de trabalho** (`apps/api/src/servicos/operacoes/unidade.ts`):
  1. a operação roda; se pede um dado ainda não lido, para, o dado vem do banco e ela roda de novo do começo (nada foi gravado);
  2. quando termina, as mudanças são gravadas na mesma transação: inserções na ordem das chaves estrangeiras, só os campos que mudaram, remoções no fim.
- **Transações (R-API3):**
  - gravações em `SERIALIZABLE`; em conflito, a operação roda de novo até 3 vezes, depois E-16;
  - as gravações de cada área esperam uma pela outra (`LOCK TABLE leitos` para leitos e emergência, `lotes` para a farmácia), e as leituras não esperam;
  - lotes lidos com `FOR UPDATE` (FEFO, A9) e pacientes com `FOR SHARE` (a inativação do cadastro espera a internação);
  - o número do atendimento (A8) repetido no `UNIQUE (dia, numero)` faz a chegada rodar de novo;
  - a lista completa está em `docs/backend/TRANSACOES.md` (26.0.1).
- **O que o banco lê:**
  - leitos, internações, pedidos, atendimentos, lotes, dispensações e medicamentos: inteiros (a retenção mantém pequenos);
  - pacientes: por id, com os citados nas tabelas já lidas numa leitura só;
  - consultas e movimentações (que crescem sempre): só as que a operação precisa.
- **Janelas de correção (D19)** com a hora do servidor: desfazer alta, reabrir atendimento e estornar usam o relógio da API.
- **Cliente HTTP** (`@medicore/dominio/cliente/operacoes`): as mesmas assinaturas dos serviços do navegador, como o dos cadastros.

### Rotas novas (`/api/v1`)

| Grupo                 | Rotas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leitos (L1–L9, A11)   | `GET /leitos`, `/leitos/busca`, `/leitos/compativeis`, `/leitos/:id`, `/leitos/:id/historico`, `POST /leitos/higienizacao`, `/leitos/:id/{reverter-higienizacao,bloquear,desbloquear}`, `GET /internacoes`, `/internacoes/:id`, `/internacoes/:id/consultas`, `POST /internacoes`, `PUT /internacoes/:id`, `POST /internacoes/:id/{transferir,alta,desfazer-alta}`, `GET /solicitacoes`, `/solicitacoes/:id`, `POST /solicitacoes`, `/solicitacoes/:id/{reservar,cancelar-reserva,cancelar}`, `GET /medicos-responsaveis`    |
| Emergência (E1–E10)   | `GET /emergencia/fila`, `/emergencia/medicos`, `/atendimentos`, `/atendimentos/:id`, `/atendimentos/:id/leitos-observacao`, `POST /atendimentos`, `/atendimentos/:id/{triagem,reavaliacao,chamar,observacao,retomar,pedir-leito,encerrar,reabrir,vincular}`                                                                                                                                                                                                                                                                  |
| Farmácia (F1–F9, A9)  | `GET /medicamentos`, `/medicamentos/:id`, `/medicamentos/:id/{livro,fefo}`, `POST /medicamentos`, `PUT /medicamentos/:id`, `POST /medicamentos/:id/{inativar,reativar}`, `GET /lotes/vencimento`, `POST /lotes`, `/lotes/descarte`, `/lotes/:id/{ajuste,bloquear,desbloquear}`, `GET /movimentacoes`, `/dispensacoes/:id`, `POST /dispensacoes`, `/dispensacoes/:id/itens/:indice/devolucao`, `/dispensacoes/:id/estornar`, `GET /pacientes/:id/{dispensacoes,destino,alergia/:medicamentoId}`, `/destinos/:id/dispensacoes` |
| Situação (R-X8)       | `GET /pacientes/:id/situacao`, `/pacientes/:id/historico-hospitalar`, `/situacoes`, `/situacoes/etiquetas`, `/medicos/:id/vinculos`                                                                                                                                                                                                                                                                                                                                                                                          |
| Indicadores (A12–A14) | `GET /indicadores/{operacionais,leitos,emergencia,estoque,internacoes}`, `/alertas`                                                                                                                                                                                                                                                                                                                                                                                                                                          |

No OpenAPI (`/api/v1/docs`, cópia em `docs/backend/openapi.json`): **95 caminhos e 108 operações** (eram 28 e 35).

### Rotinas do servidor (BL-01.6)

- **Agendador** (`apps/api/src/rotinas/agendador.ts`): confere a cada 15 minutos (e ao subir) e roda o que ainda não rodou hoje, no fuso do hospital. Cada rotina "pega" o dia na tabela `rotinas` (migração 0003) com um `UPDATE … WHERE ultimo_dia < hoje`: com várias instâncias, só uma roda. Se a rotina falha, o dia é devolvido e ela tenta de novo na volta seguinte. `ROTINAS=nao` desliga numa instância.
- **Retenção e rotina do dia (A15):** a mesma do navegador, com duas diferenças:
  - sem tetos por coleção (D15);
  - **as movimentações nunca saem** (R-F9; o livro de controlados precisa delas). Por isso os lotes também ficam, e o `saldoArquivado` não muda.
- **Invariantes (A17, BL-05.4):** INV-1 a INV-10 conferidas no banco todo dia. Cada violação vira um evento no monitoramento, com a invariante (marcador `invariante`) e os ids (contexto `invariante`, liberado na limpeza). Nada é corrigido sozinho.

### Ajustes registrados na especificação

- **R-API3:** além do `SERIALIZABLE`, uma trava de tabela por área. A trava consultiva (`pg_advisory_xact_lock`) não serve: no `SERIALIZABLE`, ela tira o retrato da transação **antes** de esperar, e a operação leria dados velhos. Os testes de concorrência pegaram isso (chegadas simultâneas repetiam o número).
- **A15:** sem tetos e sem apagar movimentações (acima).
- **R-API1 nos módulos:** toda gravação sobre um registro exige `If-Match`. As telas desses módulos já mandam a versão em todas as ações.

## Números

| Indicador                            | Fase 25        | Fase 26                                                                                                               |
| ------------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| Testes da API                        | 173 (13)       | **320 (22)**                                                                                                          |
| — testes de serviço do navegador     | 40 de 40       | **127 de 127** (+ leitos 37, emergência 26, farmácia 24)                                                              |
| — regras entre módulos e indicadores | 6              | **+20** (regras-modulos 10, indicadores 10, portados)                                                                 |
| — 500 operações aleatórias           | —              | **3 sementes, sem violação** (pela API, conferindo as invariantes depois de cada uma)                                 |
| — concorrência real                  | 7              | **+21** (6 cenários × 3 rodadas, mais 3 da nova tentativa)                                                            |
| — rotinas                            | —              | **10** (retenção, rotina do dia, agendador, invariantes)                                                              |
| — contrato das rotas novas           | 34             | **+6** (todas as leituras iguais ao serviço; ETag, 428, 412, 201; OpenAPI)                                            |
| Testes do domínio                    | 217            | **222** (+cliente dos módulos, limpeza da invariante)                                                                 |
| Testes do app                        | 528            | **528** (o app não mudou)                                                                                             |
| Testes Playwright                    | 139            | **139** (6,4 min; o app não mudou)                                                                                    |
| Cobertura da API                     | 100% de linhas | **97,6% de linhas** (96,5% de instruções, 85,4% de ramos; o relógio do agendador e ramos de erro do banco ficam fora) |
| Pacote inicial (gzip)                | 154,0 kB       | **154,0 kB**, 0 marcadores (o app não mudou)                                                                          |

## Verificação

- [x] `lint`, `format:check`, `i18n:verificar`, `typecheck` (domínio, app e API)
- [x] **26.T.1:** os 87 testes de serviço de leitos, emergência e farmácia rodam contra a API, com o banco semeado no mesmo instante. Dois ajustes de forma, comentados no código:
  - campo apagado não vem na resposta JSON (no navegador vinha `undefined`): 4 asserções viraram `not.toHaveProperty`;
  - a lista pede no máximo 100 por página (R-API2): 2 asserções pediam 500.
- [x] **26.T.2:** 500 operações aleatórias por semente (11, 2026, 1510) pela API, com a retenção no meio; nenhuma violação e nenhuma transação esgotou as novas tentativas
- [x] **26.T.3, 3 rodadas:**
  - cinco internações no mesmo leito: 1 entra, 4 recebem E-11;
  - o mesmo paciente em três leitos: 1 internação, as outras E-14;
  - duas dispensações do último estoque: 1 sai, a outra E-12 com `disponivel: 0`, nenhum lote negativo;
  - oito chegadas ao mesmo tempo: números diferentes e seguidos (A8);
  - internar enquanto outra pessoa inativa o paciente: nunca sobra internação de inativo;
  - dois médicos chamando o mesmo atendimento: um chama, o outro E-16.
- [x] Nova tentativa (R-API3): conclui depois de 2 conflitos sem deixar o que a tentativa anterior fez; depois de 3 novas tentativas, E-16 sem gravar nada; erro de regra não é repetido
- [x] 139 testes de ponta a ponta verdes (6,4 min); app, domínio e API verdes (528, 222 e 320 testes)
- [x] Rotinas: uma vez por dia; duas instâncias ao mesmo tempo, só uma roda; se falhar, nada muda e o dia volta; violação de invariante vira evento com os ids
- [ ] 👤 CI verde no GitHub e PR mesclado **depois** do `verificacoes` terminar

## Para o revisor

- **Por que a unidade de trabalho e não SQL escrito à mão:** são ~3.000 linhas de regras síncronas, com testes. Rodar o mesmo código mantém as regras iguais nos dois lados até a Fase 27 (quando o navegador passa a chamar a API e os serviços dele saem). O custo é ler as tabelas pequenas inteiras em cada gravação; a retenção mantém essas tabelas no tamanho de semanas.
- **Ordem de `todos()`:** no banco é por `criado_em` e id (no navegador era a ordem de gravação). As regras que dependem de ordem já ordenam explicitamente; os testes portados passaram sem mudança nisso.
- **Rotinas na nuvem:** com o Cloud Run escalando para zero, o relógio da API para junto. Na Fase 27, deixar 1 instância mínima ou chamar as rotinas pelo Cloud Scheduler (anotado no plano).
- **Correção da Fase 25:** a R-X3 (`temHistoricoNosModulos`) fazia quatro contagens juntas na mesma conexão da transação. O `pg` avisa que isso deixa de funcionar na versão 9; agora são uma de cada vez (e para na primeira que achar).
- **Lista de movimentações sem filtro** lê todas as movimentações para paginar. Com os filtros da tela (tipo, medicamento, período), só as do filtro. Paginar no banco fica para quando o volume pedir.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TpSdmCvMp9hkqHxXnLjuub
