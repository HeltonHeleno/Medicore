# Fase 29 — Auditoria de acesso (BL-03, LGPD)

- **Branch:** `feat/fase-29-auditoria` (sobre a `main` com a Fase 28)
- **Plano:** `PLANO_EXECUCAO_MELHORIAS.md`, tarefas 29.0 a 29.F
- **Especificação:** `PLANO_MELHORIAS_MEDICORE.md`, BL-03.1 a BL-03.5, D32

## Resumo

O MediCore passa a responder "quem viu ou mudou este registro, quando e de onde". Vale no modo API (com login). O modo navegador não tem servidor nem trilha.

### Gravações: um gancho só, no banco (BL-03.1)

- **Um gatilho por tabela** (pacientes, médicos, consultas, leitos, atendimentos, pedidos de leito, internações, medicamentos, lotes, dispensações, movimentações, usuários e perfis). Cada um grava a mudança **na mesma transação**:
  - inclusão, alteração ou exclusão;
  - os campos que mudaram, com o antes e o depois;
  - nas listas que só crescem (eventos, reavaliações), só o que entrou.
- **Quem, de onde e quando:** a API marca o contexto no começo de **toda** transação (`SET LOCAL medicore.contexto`, em `banco/conexao.ts`): usuário, IP, navegador, a hora do relógio do app e a origem (`api` ou `rotina`). Nenhum serviço precisa lembrar de auditar.
  - O `SET` não tira o retrato da transação, então as travas por área da Fase 26 continuam valendo.
- **CPF e documentos chegam mascarados** (`***.982.247-**`), também dentro do responsável. Senha, segredo do MFA e tokens **nunca** entram (R-AU5).
- **Ruído fora:** a versão, as datas de atualização e o "último acesso" do usuário não contam. Uma alteração só deles não gera registro.

### Leituras sensíveis (BL-03.2)

As leituras gravadas são:

- abrir o cadastro do paciente, registrando também se a pessoa viu o **CPF completo**, e as alergias;
- o histórico hospitalar;
- um atendimento, uma internação ou uma dispensação;
- a busca por CPF que acha alguém.

Só fica registrado o que foi visto, nunca o conteúdo. A leitura é gravada **antes** de a resposta sair: se a gravação falhar, o dado não sai. A resposta `304`, quando o navegador mostra de novo o cadastro que já tinha, também conta.

### Consultar e exportar (BL-03.3)

- **Configurações → Auditoria**, para Administrador e Gestão:
  - filtros por pessoa, paciente, ação, registro e período, guardados na URL;
  - "Ver o que mudou" abre o antes → depois de cada gravação;
  - **CSV** para o Excel (`;`, com BOM, até 50 mil linhas); a exportação também entra na trilha.
- **Histórico de acesso** no detalhe do paciente, com os 10 mais recentes e o link "Ver tudo na auditoria", já filtrado.
- O Administrador vê as abas "Usuários" e "Auditoria"; a Gestão vai direto para a auditoria.

### Pedido do titular (BL-03.4)

No menu "⋯" do paciente, **"Pedido do titular (LGPD)"** (só o Administrador, ação nova `titular.atender`) abre o relatório:

- os dados do cadastro;
- as consultas, internações, atendimentos e dispensações;
- **todos os acessos**.

O botão "Imprimir ou salvar em PDF" usa o navegador, sem biblioteca de PDF no servidor. A geração do relatório também é registrada.

### Proteger a trilha (BL-03.5)

- **Só inclusão:** o usuário da aplicação não consegue `UPDATE`, `DELETE`, `TRUNCATE` nem desligar os gatilhos.
- **Ligar e desligar a trilha:** só o dono das tabelas consegue desligar, e isso acontece na semeadura e na restauração diária da demonstração. O usuário da aplicação pede `medicore.auditar = 'nao'` e a trilha continua.
- **Cadeia de hash por dia:**
  - de madrugada, a rotina `auditoria` sela cada dia fechado com `sha256(hash do dia anterior + hash de cada registro, em ordem)`;
  - no dia 1 de cada mês, ela confere a cadeia inteira; um dia que não confere vira um evento no monitoramento;
  - a tela de auditoria tem o botão "Conferir agora".
- **Por que por dia, e não por registro:** duas gravações ao mesmo tempo disputariam o "último hash" e a cadeia se partiria.

## Números

| Indicador                  | Fase 28                             | Fase 29                                               |
| -------------------------- | ----------------------------------- | ----------------------------------------------------- |
| Testes da API              | 372                                 | **390** (+ auditoria: 18)                             |
| Testes do domínio          | 241                                 | **244**                                               |
| Testes do app              | 582                                 | **591**                                               |
| Cobertura (linhas)         | API 97,6%, domínio 96,4%, app 91,4% | API **97,8%**, domínio **96,5%**, app **91,6%**       |
| Playwright, modo API       | 20 + 1 pulado                       | **23 + 1 pulado** (+ auditoria e axe das telas novas) |
| Playwright, modo navegador | 139                                 | **139**                                               |
| Pacote inicial (gzip)      | 156,0 kB navegador; 147,5 kB API    | **156,4 kB**; **147,7 kB**                            |

### 29.T.2: 1 milhão de registros

O teste grava 1 milhão de leituras (20 mil pacientes, 50 pessoas) e consulta:

- **por paciente:** os 50 registros vêm bem abaixo de 1 s, pelo índice `(paciente_id, em)`;
- **por pessoa:** a página 3 também fica abaixo de 1 s.

## Verificação

- [x] `lint`, `format:check`, `i18n:verificar`, `typecheck`, `actionlint`
- [x] Testes da API, do domínio e do app verdes, com as metas de cobertura
- [x] **29.T.1:** gravações testadas nas três camadas que gravam (cadastros, operações, acesso) e nas leituras sensíveis. O teste também confere que toda tabela gravada pela API tem o gatilho, e que o usuário da aplicação não altera, não apaga nem desliga a trilha.
- [x] **29.T.2:** consulta por paciente em < 1 s com 1 milhão de registros
- [x] Alterar ou apagar um registro direto no banco é detectado pela conferência (teste)
- [x] e2e: a Gestão vê, no paciente e na auditoria, que a Recepção abriu o cadastro; o CSV baixa; axe sem violações na auditoria e no relatório ao titular
- [ ] 👤 **29.0.1:** prazo de guarda com o jurídico (D32). Até lá, a trilha não apaga nada.
- [ ] 👤 CI verde no GitHub e PR mesclado **depois** do `verificacoes` terminar

## Para o revisor

- **Gatilho no banco, não nos serviços:** os serviços da Fase 25 (cadastros) e da Fase 26 (operações) gravam de jeitos diferentes, e a trilha não pode ter lacuna. No banco, nenhuma gravação escapa, nem as que vierem nas próximas fases.
- **`origem: 'rotina'`:** as gravações sem requisição (retenção A15, rotinas) aparecem como "Rotina do sistema". As feitas por fora da API (console, migração) aparecem como "Banco de dados".
- **Leitura que falha a gravação:** a resposta vira 500. É de propósito: melhor não mostrar do que mostrar sem rastro.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TpSdmCvMp9hkqHxXnLjuub
