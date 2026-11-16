# Fase 25 — Backend (2/4): cadastros e agenda no servidor (BL-01.4)

- **Branch:** `feat/fase-25-backend-cadastros` (sobre a `main` com a Fase 24)
- **Plano:** `PLANO_EXECUCAO_MELHORIAS.md`, tarefas 25.0 a 25.F
- **Especificação:** `PLANO_MELHORIAS_MEDICORE.md`, BL-01.4, R-API1 a R-API4

## Resumo

P1–P13 estão no servidor, com as mesmas regras. **Os 40 testes de serviço de pacientes, médicos e consultas do navegador rodam contra a API e o banco, com as mesmas asserções**, todos verdes. O app continua usando os dados do navegador até a Fase 27.

### Rotas novas (`/api/v1`)

| Grupo                   | Rotas                                                                                                                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pacientes (P1–P5)       | `GET /pacientes`, `GET /pacientes/:id`, `GET /pacientes/cpf/:cpf`, `GET /pacientes/:id/tem-consultas`, `GET /pacientes/:id/consultas-futuras`, `GET /pacientes/:id/pendencias`, `POST /pacientes`, `PUT /pacientes/:id`, `POST /pacientes/:id/inativar`, `POST /pacientes/:id/reativar`, `DELETE /pacientes/:id` |
| Médicos (P6–P8)         | `GET /departamentos`, `GET /medicos`, `GET /medicos/:id`, `GET /medicos/crm/:uf/:numero`, `GET /medicos/:id/consultas-futuras`, `POST /medicos/:id/consultas-afetadas`, `GET /medicos/:id/pendencias`, `POST /medicos`, `PUT /medicos/:id`, `POST /medicos/:id/inativar`, `POST /medicos/:id/reativar`           |
| Agenda (P9–P13, A1, A5) | `GET /consultas`, `GET /consultas/:id`, `GET /agenda/horarios`, `GET /agenda/proximo-dia`, `POST /consultas`, `PUT /consultas/:id`, `POST /consultas/:id/cancelar`, `POST /consultas/:id/concluir`, `POST /consultas/:id/faltou`, `POST /consultas/lote`                                                         |
| Painel (R-X6, 25.1.6)   | `GET /atividades`, `GET /indicadores/cadastros`                                                                                                                                                                                                                                                                  |

Todas estão no OpenAPI (`/api/v1/docs`, cópia em `docs/backend/openapi.json`): 28 caminhos e 35 operações.

### Como ficou

- **Serviços da API** (`apps/api/src/servicos/`): as mesmas regras dos serviços do navegador, cada gravação numa transação do banco.
  - A atividade é gravada na mesma transação (R-X6): se a operação falha, a atividade não fica.
  - Toda alteração sobe a versão e o `atualizadoEm`, como o repositório do navegador fazia.
- **Agenda com gravações simultâneas:**
  - as agendas do médico e do paciente ficam travadas durante a transação. A segunda gravação espera, vê a primeira e recebe E-04 (médico) ou R-C4 (paciente) pela regra;
  - o `EXCLUDE` continua como última garantia;
  - o agendamento trava o paciente e o médico com `FOR SHARE`, então ninguém inativa um deles no meio do agendamento.
- **Listas:**
  - **busca sem acentos** (extensão `unaccent`, migração 0002) e números comparados só pelos dígitos, como o `filtrarPorTermo`;
  - **ordem igual à das telas**: colação `pt_br_base`, vazios no fim, desempate pelo id;
  - **idade calculada como o `idade()` do domínio**, inclusive para quem nasceu em 29/02.
- **Cliente HTTP** (`@medicore/dominio/cliente/cadastros`):
  - tem as mesmas assinaturas dos serviços do navegador (`criarPaciente(entrada)`, `atualizarPaciente(id, entrada, versao)`…);
  - nos testes, o transporte é o `inject` do Fastify; na Fase 27 será o `fetch`;
  - os erros voltam como as classes de sempre.
- **Mudanças no domínio:** passaram para o domínio, para o navegador e a API usarem os mesmos:
  - `utils/mascaras`;
  - os departamentos (`config/departamentos`; o desempenho continua simulado no app até o BL-41);
  - os textos dos cadastros (`utils/cadastros`: nome exibido, resumo da disponibilidade).

### Ajustes nas regras da API (registrados na especificação)

- **R-API1:** o `If-Match` é **obrigatório** nas edições de conteúdo (`PUT` e cancelar consulta). Nas ações (inativar, reativar, excluir, concluir, faltou), ele é **conferido quando vem**, mas não é exigido: as telas de hoje não têm a versão nesses botões, e as regras de transição já impedem a ação dupla.
- **R-API2:** a agenda (`GET /consultas`) é uma janela de datas, como a tela, com no máximo 1.000 consultas. As outras listas são paginadas.

## Números

| Indicador                                   | Fase 24         | Fase 25                                                                      |
| ------------------------------------------- | --------------- | ---------------------------------------------------------------------------- |
| Testes da API                               | 52 (5 arquivos) | **173 (13)**                                                                 |
| — testes de serviço do navegador portados   | —               | 40 de 40, mesmas asserções (pacientes 13, médicos 10, consultas 17)          |
| — atividades                                | —               | 5 (o limite de 200 era do navegador; trocado por "não perde nenhuma")        |
| — paridade da busca e da ordem com as telas | —               | 34 casos (17 termos de busca, 8 ordenações, médicos)                         |
| — concorrência real                         | —               | 7                                                                            |
| — regras entre módulos (R-X2 a R-X4)        | —               | 6                                                                            |
| — contrato das rotas novas                  | —               | 34 casos                                                                     |
| Testes do domínio                           | 199             | **217** (+cliente, textos dos cadastros, contrato sobre os dados de exemplo) |
| Testes do app                               | 536             | **528 (47)** (o teste das máscaras foi para o domínio)                       |
| Testes Playwright                           | 139             | **139**                                                                      |
| Cobertura da API                            | 100% de linhas  | **100% de linhas** (99,2% de instruções, 92,5% de ramos)                     |
| Cobertura do domínio                        | 95,8%           | **96,2%**                                                                    |
| Pacote inicial (gzip)                       | 153,9 kB        | **154,0 kB (+0,1 kB: `cadastros.ts` e `departamentos.ts` do domínio)**       |

## Verificação

- [x] `lint`, `format:check`, `i18n:verificar`, `typecheck` (domínio, app e API)
- [x] **25.T.1:** os 40 testes de serviço rodam contra a API, cada um com o banco semeado no mesmo instante do teste do navegador
- [x] **25.T.2, repetido 3 vezes:**
  - 5 agendamentos simultâneos no mesmo horário dão 1 sucesso e 4 E-04;
  - o mesmo paciente com dois médicos ao mesmo tempo recebe R-C4;
  - reagendar para um horário que acabou de ser ocupado dá E-04;
  - agendar enquanto outra pessoa inativa o médico nunca deixa consulta futura de médico inativo;
  - duas edições com a mesma versão dão uma 412 com a versão atual;
  - dois cadastros com o mesmo CPF dão `cpf_duplicado`;
  - lote e registro avulso ao mesmo tempo: só um vale.
- [x] **25.T.3:**
  - cada leitura confere com o esquema do contrato;
  - ETag e 304 nos registros;
  - 428, 412 e 200 nas edições; `If-Match` opcional nas ações;
  - 404 com a mensagem do domínio, 422 com os campos, 409 com código e campo, E-17 com os itens;
  - OpenAPI com todas as rotas.
- [x] 139 testes de ponta a ponta verdes (5,2 min). Numa primeira rodada, 9 testes de teclado e axe passaram do tempo porque havia outro processo de teste rodando junto (carga 10); sozinhos, os 9 e depois os 139 passaram
- [ ] 👤 CI verde no GitHub e PR mesclado **depois** do `verificacoes` terminar

## Para o revisor

- **Ponteiro de volta no SQL:** num `SELECT` de uma tabela só, o Drizzle tira o nome da tabela das colunas. Por isso, dentro de uma subconsulta, `"id"` passava a ser o da consulta, e a próxima consulta saía vazia. Os testes portados pegaram o problema; as subconsultas agora usam nomes qualificados à mão.
- **Impasse evitado no reagendamento:** a ordem das travas é a mesma da inativação do paciente (paciente antes da consulta).
- **Conexão ociosa derrubada pelo servidor** (reinício, failover) não derruba mais a API: o pool descarta a conexão e abre outra.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TpSdmCvMp9hkqHxXnLjuub
