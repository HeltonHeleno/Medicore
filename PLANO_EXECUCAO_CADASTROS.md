# ✅ MediCore — Plano de Execução dos Cadastros

> **O que é:** a lista de trabalho, na ordem em que deve ser feita, para implementar Pacientes, Médicos e Consultas. Cada tarefa é pequena (de 15 minutos a 2 horas) e tem um checkbox.
> **Base:** `PLANO_CADASTROS_MEDICORE.md` (Revisão 2), que é a **especificação**. Este documento diz **o que fazer e em que ordem**; a especificação diz **como deve funcionar**. Em caso de dúvida, vale a especificação.
> **Fases:** 8 a 14, iguais às da especificação, precedidas da Etapa 0 (preparação).
> **Estimativa:** 16 dias úteis (1 desenvolvedor) · ver [cronograma](#-cronograma-dia-a-dia)
> **Criado em:** 26/10/2026

---

## 📋 Sumário

1. [Como usar](#-como-usar)
2. [Painel de execução](#-painel-de-execução)
3. [Cronograma dia a dia](#-cronograma-dia-a-dia)
4. [Rotina de cada fase (git, PR e fechamento)](#-rotina-de-cada-fase-git-pr-e-fechamento)
5. [Comandos de referência](#-comandos-de-referência)
6. [Etapa 0 — Preparação](#etapa-0--preparação)
7. [Fase 8 — Fundação de dados e roteamento](#fase-8--fundação-de-dados-e-roteamento)
8. [Fase 9 — Componentes de formulário e listagem](#fase-9--componentes-de-formulário-e-listagem)
9. [Fase 10 — Cadastro de Pacientes](#fase-10--cadastro-de-pacientes)
10. [Fase 11 — Cadastro de Médicos](#fase-11--cadastro-de-médicos)
11. [Fase 12 — Cadastro e agenda de Consultas](#fase-12--cadastro-e-agenda-de-consultas)
12. [Fase 13 — Integração com o Painel](#fase-13--integração-com-o-painel)
13. [Fase 14 — Qualidade, testes e entrega](#fase-14--qualidade-testes-e-entrega)
14. [Encerramento do projeto](#encerramento-do-projeto)
15. [Diário de execução](#-diário-de-execução)

---

## 🧭 Como usar

**Formato de cada tarefa**

```
- [x] **8.4.3** O que fazer — `arquivo(s)` · 🔗 referência na especificação · ✔ como verificar
```

- **Número** `fase.etapa.tarefa`: use-o na mensagem de commit (ex.: `fase-8: 8.4.3 transação no repositório`).
- **🔗 Referência**: código da especificação (`P9`, `R-C3`, `A1`, `E-04`, `M3`…) ou número da seção (`8.4`). Leia antes de começar a tarefa.
- **✔ Verificação**: o que precisa ser verdade para marcar o checkbox. Se não der para verificar, a tarefa não está pronta.

**Regras**
1. Siga a ordem. Dentro de uma etapa, as tarefas dependem das anteriores; entre etapas, só quando indicado.
2. Teste junto com o código: cada etapa termina com sua tarefa de testes. Não acumule testes para o fim.
3. Rode `npm run test` antes de cada commit. Nunca faça commit com teste quebrado.
4. Ao terminar uma etapa, faça o commit. Ao terminar uma fase, siga a [rotina de fechamento](#-rotina-de-cada-fase-git-pr-e-fechamento).
5. Se surgir trabalho novo, **não** inclua na fase atual: anote no [Diário](#-diário-de-execução) e no Backlog da especificação (RS-08).
6. Marque também os checkboxes correspondentes no `PLANO_CADASTROS_MEDICORE.md` ao fechar cada fase.

**Legenda:** ⬜ não iniciada · 🟨 em andamento · ✅ concluída · 🟥 bloqueada · ⭐ tarefa crítica (atenção redobrada; bug aqui afeta o sistema todo)

---

## 📊 Painel de execução

| Etapa / Fase | Conteúdo | Tarefas | Dias | Status | Início | Fim |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Etapa 0 | Preparação | 12 | 0,5 | ⬜ | | |
| Fase 8 | Fundação de dados e roteamento | 129 | 3 | 🟨 código pronto; faltam commits/PR | 26/10/2026 | 27/10/2026 |
| Fase 9 | Componentes de formulário e listagem | 67 | 2,5 | 🟨 código pronto; faltam commits/PR | 27/10/2026 | 27/10/2026 |
| Fase 10 | Cadastro de Pacientes | 55 | 2 | 🟨 código pronto; faltam commits/PR | 27/10/2026 | 27/10/2026 |
| Fase 11 | Cadastro de Médicos | 34 | 1,5 | 🟨 código pronto; faltam commits/PR | 27/10/2026 | 27/10/2026 |
| Fase 12 | Cadastro e agenda de Consultas | 58 | 3 | 🟨 código pronto; faltam commits/PR | 27/10/2026 | 27/10/2026 |
| Fase 13 | Integração com o Painel | 20 | 1 | ⬜ | | |
| Fase 14 | Qualidade, testes e entrega | 31 | 2 | ⬜ | | |
| Encerramento | Deploy final, versão e documentação | 8 | 0,5 | ⬜ | | |
| **Total** | | **414** | **16** | | | |

> A contagem inclui as tarefas de abertura e fechamento de cada fase. A Fase 8 é a maior porque concentra toda a lógica de negócio e os testes dela; as fases de tela ficam mais rápidas por isso. Atualize o status ao fim de cada fase.

---

## 📅 Cronograma dia a dia

| Dia | Data | Meta do dia | Tarefas | Entrega verificável |
|:---:|:---:|---|---|---|
| D1 | | Preparação + migração do roteador | Etapa 0 · 8.0 · 8.1 | 84 testes antigos passando com `createBrowserRouter` |
| D2 | | Dependências, datas, tipos, esquemas, erros | 8.2 a 8.6 | Testes de datas em `TZ=UTC` e de esquemas passando |
| D3 | | Repositório, migrações, agenda e busca | 8.7 a 8.9 | Testes de transação, abas, A1–A5 passando |
| D4 | | Serviços, seeds, troca de nomes, hooks, PR | 8.10 a 8.17 | Todas as regras R-xx testadas; PR da Fase 8 |
| D5 | | Validação, máscaras e campos | 9.0 a 9.3 | Campos na vitrine `/ui` |
| D6 | | Combobox, listagem, feedback | 9.4 a 9.7 | `DataTable`, `Modal`, `Toast` na vitrine |
| D7 | | Formulário de entidade, acessibilidade, PR | 9.8 a 9.12 | PR da Fase 9 |
| D8 | | Pacientes: rotas, lista e formulário (parte 1) | 10.0 a 10.3 | Cadastrar paciente funciona (P1) |
| D9 | | Pacientes: edição, detalhe, inativação, PR | 10.4 a 10.8 | P1–P5 funcionando; PR da Fase 10 |
| D10 | | Médicos: rotas, lista, formulário | 11.0 a 11.3 | Cadastrar médico com disponibilidade (P6) |
| D11 (½) | | Médicos: detalhe, inativação, PR | 11.4 a 11.7 | P6–P8; PR da Fase 11 |
| D11 (½)–D12 | | Agenda do dia e seletor de horário | 12.0 a 12.3 | Agenda navegável; `SeletorHorario` acessível |
| D13 | | Agendar, detalhe, reagendar | 12.4 a 12.6 | P9 e P10 funcionando |
| D14 | | Cancelar, concluir, falta, baixa em lote, PR | 12.7 a 12.10 | P11–P13; PR da Fase 12 |
| D15 | | Integração com o Painel | 13.0 a 13.6 | Painel reage aos cadastros; PR da Fase 13 |
| D16 | | e2e, acessibilidade, performance, documentação | 14.0 a 14.8 · Encerramento | PR final mesclado |

> **Margem:** o cronograma não tem folga. Se a Fase 8 passar de 4 dias, reavalie as datas seguintes e registre no Diário.

---

## 🔁 Rotina de cada fase (git, PR e fechamento)

Toda fase começa com a **abertura** (`N.0`) e termina com o **fechamento** (`N.último`). As tarefas abaixo se repetem em cada fase e já estão incluídas nas listas.

**Abertura**
1. Atualizar a `main` local: `git checkout main && git pull`
2. Criar a branch: `git checkout -b feat/fase-N-<nome>`
3. Confirmar a base verde: `npm run test` passando antes de alterar qualquer coisa
4. Ler a seção da fase na especificação e os processos/regras citados

**Commits**
- Um commit por etapa (ou por tarefa grande), mensagem no formato `fase-N: N.E.T descrição curta`
- Exemplo: `fase-8: 8.7.4 transação com desfazer no repositório`

**Fechamento** (é a [Definição de pronto](PLANO_CADASTROS_MEDICORE.md#-definição-de-pronto-por-pr) da especificação)
1. `npm run lint`, `npm run build` e `npm run test:coverage` sem erros nem avisos
2. Metas de cobertura atingidas para os arquivos da fase
3. Nenhum texto visível fora de `src/i18n/pt-BR.ts`
4. Telas novas conferidas em 375, 768 e 1280px, claro e escuro, e só com teclado
5. axe sem violações nas telas novas
6. PR aberto com descrição, capturas de tela e lista de tarefas concluídas
7. Checkboxes atualizados neste plano e na especificação; painel de execução atualizado
8. PR revisado e mesclado na `main`

---

## 🛠️ Comandos de referência

| Para quê | Comando |
|---|---|
| Rodar o projeto | `npm run dev` → http://localhost:5173 |
| Vitrine de componentes | http://localhost:5173/ui (só em desenvolvimento) |
| Testes uma vez | `npm run test` |
| Testes de um arquivo | `npx vitest run src/__tests__/repositorio.test.ts` |
| Testes em modo observação | `npm run test:watch` |
| Cobertura | `npm run test:coverage` (relatório em `coverage/index.html`) |
| Lint e formatação | `npm run lint` · `npm run format` |
| Build de produção | `npm run build` · `npm run preview` |
| e2e (a partir da Fase 14) | `npm run test:e2e` |
| Limpar dados locais no navegador | DevTools → Application → Local Storage → apagar chaves `medicore:*` (ou botão "Restaurar dados de exemplo" a partir da Fase 13) |

---

## Etapa 0 — Preparação

**Objetivo:** começar de uma base versionada, publicada e verde. **Duração:** ½ dia.

### 0.1 Pendências herdadas (Fase 7 do plano anterior)

- [ ] **0.1.1** Instalar dependências atualizadas — `npm install` · ✔ `node_modules/@fontsource-variable/inter` existe
- [ ] **0.1.2** Rodar a base — `npm run test` e `npm run build` · ✔ 84 testes passando, build sem erros
- [ ] **0.1.3** Commit das Fases 1–7 — `git add . && git commit` · ✔ `git status` limpo
- [ ] **0.1.4** Publicar no GitHub (criar o repositório remoto, se ainda não existir) e enviar — `git push -u origin main` · ✔ código visível no GitHub
- [ ] **0.1.5** Teste manual com NVDA no Painel (navegar por títulos, tabela de consultas, menu) · ✔ anotações no [Diário](#-diário-de-execução)
- [ ] **0.1.6** Deploy na Vercel ou Netlify (configuração pronta em `vercel.json`/`netlify.toml`) · ✔ URL pública abre o Painel
- [ ] **0.1.7** Testar a URL publicada no celular e no desktop, incluindo recarregar em `/pacientes` · ✔ sem erro 404
- [ ] **0.1.8** Marcar as pendências como concluídas no `PLANO_IMPLEMENTACAO_MEDICORE.md` e no `PLANO_CADASTROS_MEDICORE.md`

### 0.2 Linha de base

- [ ] **0.2.1** Registrar no Diário os números de partida: quantidade de testes, cobertura geral, tamanho dos pacotes do build, notas do Lighthouse desktop · ✔ tabela preenchida
- [x] **0.2.2** Capturar o Painel em 1600px (claro) como referência visual para a Fase 13 — `docs/capturas/referencia-fase7.png`
- [x] **0.2.3** Ler a especificação inteira uma vez, com atenção a: Arquitetura, Datas e fuso, Persistência, Processos P1–P13 · ✔ dúvidas anotadas no Diário
- [ ] **0.2.4** Atualizar o painel de execução: Etapa 0 ✅

---

## Fase 8 — Fundação de dados e roteamento

**Objetivo:** toda a camada de dados e regras pronta e testada, sem tela nova. **Duração:** 3 dias. **Branch:** `feat/fase-8-dados`.
**Especificação:** Fase 8, Arquitetura, Modelo de dados, Regras, Datas e fuso, Persistência, Algoritmos, Tratamento de erros.

### 8.0 Abertura

- [ ] **8.0.1** Atualizar a `main` e criar `feat/fase-8-dados`
- [x] **8.0.2** `npm run test` verde antes de qualquer alteração

### 8.1 Migração para o roteador de dados ⭐ (M1, RS-04)

- [x] **8.1.1** Criar `src/router.tsx` com `createBrowserRouter`, reproduzindo as rotas de `routes.tsx`: layout, Painel (index), placeholders do menu, `/perfil`, `/ui` só em `import.meta.env.DEV`, `*` → `NotFound` · 🔗 8.1
- [x] **8.1.2** Extrair a lista de rotas para uma função `criarRotas()` exportada (reutilizada nos testes com `createMemoryRouter`) — `src/router.tsx`
- [x] **8.1.3** Trocar `App.tsx` para `<RouterProvider router={router} />` · ✔ `npm run dev` abre o Painel e todas as rotas do menu
- [x] **8.1.4** Criar `src/components/ui/ErroDeRota.tsx` (usa `useRouteError`; mostra mensagem E-09 com "Tentar novamente" e "Voltar ao Painel") · 🔗 E-09, M10
- [x] **8.1.5** Definir `errorElement: <ErroDeRota />` na rota de layout · ✔ lançar um erro de teste numa página mostra o erro **dentro** do layout (sidebar visível)
- [x] **8.1.6** Adicionar `handle: { titulo, breadcrumb }` em cada rota e textos em `i18n/pt-BR.ts`
- [x] **8.1.7** Refatorar `useDocumentTitle` para ler `handle.titulo` via `useMatches()`; remover as chamadas manuais das páginas · ✔ título da aba muda ao navegar
- [x] **8.1.8** Criar `src/__tests__/utils/renderizarComRotas.tsx` (`createMemoryRouter(criarRotas(), { initialEntries })` + `RouterProvider`)
- [x] **8.1.9** Migrar `layout.test.tsx`, `qualidade.test.tsx` e `dashboard.test.tsx` para o novo utilitário
- [x] **8.1.10** Remover `routes.tsx` (substituído por `router.tsx`) e ajustar imports
- [x] **8.1.11** Testes: rota de erro mostra `ErroDeRota`; título vindo do `handle` · ✔ **os 84 testes antigos + novos passando**
- [x] **8.1.12** Conferência visual do Painel em 1600px contra `referencia-fase7.png` · ✔ idêntico
- [ ] **8.1.13** Commit `fase-8: 8.1 migração para createBrowserRouter`

### 8.2 Dependências (D1)

- [x] **8.2.1** `npm install react-hook-form@^7.91 zod@^4.6 @hookform/resolvers@^6` · ✔ `package.json` atualizado
- [x] **8.2.2** `npm run build` e `npm run test` continuam verdes
- [ ] **8.2.3** Commit `fase-8: 8.2 dependências de formulário`

### 8.3 Configuração, relógio e datas ⭐ (M3, M7, RS-02)

- [x] **8.3.1** Adicionar a `config/limites.ts`: `FUSO_HOSPITAL`, `ANTECEDENCIA_MAX_DIAS = 180`, `TOLERANCIA_PASSADO_MIN = 5`, `POR_PAGINA = 10`, `MAX_ATIVIDADES = 200`, `LIMITE_ARMAZENAMENTO_BYTES`, `ALERTA_ARMAZENAMENTO = 0.8` · 🔗 Datas e fuso, Persistência
- [x] **8.3.2** Criar `utils/relogio.ts` com `agora(): Date` · 🔗 M7
- [x] **8.3.3** Criar `utils/datas.ts`: `hojeNoFuso()` (retorna `AAAA-MM-DD`), `dataDoInstante(iso)`, `instanteNoFuso(data, hora)`, `diaDaSemana(data)` · 🔗 Datas e fuso
- [x] **8.3.4** Em `utils/datas.ts`: `idade(dataNascimento, referencia)` por aniversário (29/02 → 28/02 em ano não bissexto)
- [x] **8.3.5** Em `utils/datas.ts`: `formatarData` (`dd/mm/aaaa`), `formatarDataExtenso` ("segunda-feira, 26 de outubro"), `paraInputDate`, `somarDias`
- [x] **8.3.6** Ajustar `utils/format.ts`: `formatHora` passa a usar `FUSO_HOSPITAL`
- [x] **8.3.7** Fazer a suíte rodar em UTC: `test.env.TZ = 'UTC'` em `vite.config.ts` · ✔ `format.test.ts` existente continua passando
- [x] **8.3.8** Testes `datas.test.ts`: instante às 00:30 de Brasília = dia correto; idade na véspera e no dia do aniversário; 29/02; `instanteNoFuso` ida e volta · ✔ passando em `TZ=UTC`
- [ ] **8.3.9** Commit `fase-8: 8.3 relógio, fuso e datas`

### 8.4 Tipos

- [x] **8.4.1** `types/paciente.ts`: `Paciente`, `Sexo`, `Endereco`, `Convenio`, `Responsavel`, `ContatoEmergencia`, `TipoSanguineo` · 🔗 Modelo de dados
- [x] **8.4.2** `types/medico.ts`: `Medico`, `Tratamento`, `Crm`, `Disponibilidade` (com `pausa`), `DiaSemana`
- [x] **8.4.3** `types/consulta.ts`: `Consulta`, `StatusConsulta` (+ `faltou`), `TipoConsulta`, `EventoConsulta`, `ConsultaDetalhada` · 🔗 M8
- [x] **8.4.4** `types/atividade.ts`: `Atividade`, `TipoAtividade`
- [x] **8.4.5** Tipos de resumo: `PacienteResumo`, `MedicoResumo`; tipos de filtro `FiltrosPacientes`, `FiltrosMedicos`, `FiltrosAgenda`; `Paginado<T> = { itens, total, pagina, porPagina }`
- [x] **8.4.6** Reexportar em `types/index.ts` sem quebrar os tipos do Painel (o `Consulta` antigo do Painel vira `ConsultaPainel` até a Fase 13) · ✔ `npx tsc -b` sem erros
- [x] **8.4.7** Adicionar `faltou` em `t.status` e no `StatusBadge` (tom de aviso) · ✔ aparece na vitrine `/ui`
- [ ] **8.4.8** Commit `fase-8: 8.4 tipos dos cadastros`

### 8.5 Esquemas zod (D1)

- [x] **8.5.1** Grupo `validacao` em `i18n/pt-BR.ts` com todas as mensagens (obrigatório, CPF inválido, telefone inválido, e-mail inválido, CEP inválido, data futura, mínimo/máximo de caracteres…)
- [x] **8.5.2** `utils/validacao.ts` (versão mínima necessária aos esquemas): `cpfValido`, `telefoneValido`, `cepValido`, `emailValido`, `crmValido`, `ufValida` · 🔗 9.1 (a versão completa e os testes ficam na Fase 9)
- [x] **8.5.3** `schemas/comuns.ts`: `cpf`, `telefone`, `cep`, `email`, `dataIso`, `horaHHmm`, `uf`, `textoLimpo(min, max)` (remove espaços extras)
- [x] **8.5.4** `schemas/paciente.ts` com `superRefine`: convênio condicional; responsável obrigatório se menor (R-P5); número obrigatório se houver CEP; CPF do responsável ≠ CPF do paciente · 🔗 R-P5, M9
- [x] **8.5.5** `schemas/medico.ts`: CRM; disponibilidade (≥ 1 dia, `fim > inicio`, pausa dentro do expediente, horários múltiplos de 5) · 🔗 R-M4
- [x] **8.5.6** `schemas/consulta.ts`: entrada de agendamento; duração 5–120 múltipla de 5 (R-C9); motivo de cancelamento 5–300
- [x] **8.5.7** Testes `schemas.test.ts`: um caso válido e um inválido por regra; mensagens em PT-BR; campos condicionais · ✔ passando
- [ ] **8.5.8** Commit `fase-8: 8.5 esquemas zod`

### 8.6 Erros tipados

- [x] **8.6.1** `services/erros.ts`: `ErroValidacao { campos }`, `ErroConflito { campo?, codigo }`, `ErroConcorrencia`, `ErroNaoEncontrado`, `ErroArmazenamento` · 🔗 Tratamento de erros
- [x] **8.6.2** Função `aplicarErrosNoFormulario(erro, setError)` (converte erro do serviço em erro de campo)
- [x] **8.6.3** Grupo `erros` em `i18n/pt-BR.ts` com as mensagens E-01 a E-10
- [x] **8.6.4** Testes `erros.test.ts`: `instanceof`, `aplicarErrosNoFormulario` chama `setError` nos campos certos
- [ ] **8.6.5** Commit `fase-8: 8.6 erros tipados`

### 8.7 Repositório ⭐ (D2, M4, M5, M6)

- [x] **8.7.1** `services/repositorio.ts`: `criarRepositorio<T>(chave, seed)` com `todos`, `obter`, `inserir`, `atualizar`, `remover` em memória · 🔗 Persistência
- [x] **8.7.2** Leitura/gravação no `localStorage` com chave `medicore:<colecao>:v1`, tudo em `try/catch` (sem storage → só memória)
- [x] **8.7.3** `versao`: `inserir` define 1; `atualizar` incrementa; `criadoEm`/`atualizadoEm` via `agora()`
- [x] **8.7.4** ⭐ `transacao(fn)`: cópia das coleções, execução, gravação, **desfazer** em qualquer erro, notificação única no sucesso · 🔗 M4
- [x] **8.7.5** `assinar(callback)` → função para cancelar; notificação após gravação
- [x] **8.7.6** `QuotaExceededError` → `ErroArmazenamento` (E-06), desfazendo a transação · 🔗 M5, RS-03
- [x] **8.7.7** `usoArmazenamento()` (bytes das chaves `medicore:*`) e alerta único por sessão acima de 80%
- [x] **8.7.8** Leitura tolerante: JSON inválido → backup em `medicore:backup:<data>`, recria pelo seed, sinaliza E-07
- [x] **8.7.9** Chave `medicore:meta` (`esquema`, `semeadoEm`) e semeadura na primeira carga
- [x] **8.7.10** ⭐ Sincronização entre abas: escutar o evento `storage` das chaves `medicore:*`, recarregar a coleção e notificar · 🔗 M6, RS-07
- [x] **8.7.11** `resetar()` (apaga `medicore:*` e semeia de novo) — usado nos testes e no botão de dev
- [x] **8.7.12** Testes `repositorio.test.ts` (1/2): CRUD, persistência ao "recarregar" (nova instância), `versao`, `assinar`/cancelar
- [x] **8.7.13** Testes `repositorio.test.ts` (2/2): transação desfaz em erro de regra; cota estourada (simular `setItem` lançando); JSON corrompido; evento `storage` vindo de "outra aba" (`dispatchEvent(new StorageEvent(...))`); sem `localStorage`
- [ ] **8.7.14** Commit `fase-8: 8.7 repositório com transação e sincronização`

### 8.8 Migrações

- [x] **8.8.1** `services/migracoes.ts`: lista ordenada de migrações e `executarMigracoes(meta)`; só a v1 (sem passos) por enquanto
- [x] **8.8.2** Executar as migrações na inicialização, antes de liberar os serviços
- [x] **8.8.3** Teste: uma migração fictícia v1→v2 transforma os dados e atualiza `meta.esquema`
- [ ] **8.8.4** Commit `fase-8: 8.8 mecanismo de migrações`

### 8.9 Utilitários de agenda e busca ⭐ (M12)

- [x] **8.9.1** `utils/agenda.ts` → `sobrepoe(a, b)` com intervalos semiabertos · 🔗 A2
- [x] **8.9.2** `gerarHorarios(medico, data, duracao, ocupacoes, opcoes)` conforme o pseudocódigo · 🔗 A1, R-C1, R-C2, R-M4
- [x] **8.9.3** `consultasForaDaDisponibilidade(disponibilidade, consultas)` · 🔗 A3
- [x] **8.9.4** `proximoDiaLivre(...)` com limite de 60 dias · 🔗 A5
- [x] **8.9.5** `podeTransitar(status, novo, agora, inicio)` · 🔗 R-S1–R-S3
- [x] **8.9.6** `utils/busca.ts`: `normalizar`, `filtrarPorTermo` (dígitos vs palavras), `ordenar` (`Intl.Collator('pt-BR')` + desempate por id), `paginar` (volta à última página válida) · 🔗 A4
- [x] **8.9.7** Testes `agenda.test.ts`: consultas que se tocam (10:00–10:30 e 10:30–11:00) não conflitam; pausa; fim de expediente; horário passado com tolerância de 5 min; A3; A5 sem dia livre; todas as transições · relógio fixo com `vi.setSystemTime`
- [x] **8.9.8** Testes `busca.test.ts`: "joao" acha "João"; "silva ana" acha "Ana Silva"; CPF com e sem máscara; ordenação com acentos; página além do fim
- [ ] **8.9.9** Commit `fase-8: 8.9 algoritmos de agenda e busca`

### 8.10 Serviço de pacientes (P1–P5)

- [x] **8.10.1** `services/pacientes.ts` → `listarPacientes(filtros)` retornando `Paginado<PacienteResumo>` (busca A4, status, ordenação, próxima consulta) · 🔗 R-G3, R-P4, R-P6
- [x] **8.10.2** `obterPaciente(id)` (lança `ErroNaoEncontrado`) e `cpfDisponivel(cpf, ignorarId?)`
- [x] **8.10.3** `criarPaciente(entrada)`: normaliza (R-G2), valida esquema, R-P1, grava paciente + atividade em transação · 🔗 P1
- [x] **8.10.4** `atualizarPaciente(id, entrada, versao)`: R-G1, R-P1 ignorando o próprio · 🔗 P2
- [x] **8.10.5** ⭐ `inativarPaciente(id, motivo?)`: cancela consultas futuras `agendada` (eventos + motivo) na mesma transação; retorna a quantidade · 🔗 P3, R-P2
- [x] **8.10.6** `reativarPaciente(id)` · 🔗 P4
- [x] **8.10.7** `excluirPaciente(id)`: bloqueia se tiver qualquer consulta · 🔗 P5, R-P3
- [x] **8.10.8** Testes `pacientes.service.test.ts`: CPF duplicado (criar e editar), concorrência, menor sem responsável, inativar cancela só as futuras agendadas, exclusão bloqueada, busca por nome social
- [ ] **8.10.9** Commit `fase-8: 8.10 serviço de pacientes`

### 8.11 Serviço de médicos (P6–P8)

- [x] **8.11.1** `services/medicos.ts` → `listarMedicos(filtros)` (`MedicoResumo` com consultas de hoje e resumo dos dias)
- [x] **8.11.2** `obterMedico(id)`, `crmDisponivel(numero, uf, ignorarId?)`
- [x] **8.11.3** `criarMedico(entrada)` (R-M1: CRM e e-mail únicos) · 🔗 P6
- [x] **8.11.4** `consultasAfetadas(id, novaDisponibilidade)` e `atualizarMedico(id, entrada, versao)` · 🔗 P7, R-M3, A3
- [x] **8.11.5** `inativarMedico(id, motivo?)`: bloqueia com `ErroConflito` listando as consultas futuras; `reativarMedico(id)` · 🔗 P8, R-M2
- [x] **8.11.6** Testes `medicos.service.test.ts`: CRM/e-mail duplicados, consultas afetadas por mudança de horário, inativação bloqueada e liberada
- [ ] **8.11.7** Commit `fase-8: 8.11 serviço de médicos`

### 8.12 Serviço de consultas ⭐ (P9–P13)

- [x] **8.12.1** `services/consultas.ts` → `detalhar(consulta)` (monta `ConsultaDetalhada`: nomes, alergias, `fim`, `atrasada`) · 🔗 R-C7, R-P6
- [x] **8.12.2** `listarConsultas(filtros)` (data, intervalo, médico, paciente, departamento, status, pendentes)
- [x] **8.12.3** `obterConsulta(id)`
- [x] **8.12.4** `horariosLivres(medicoId, data, duracao, pacienteId?, ignorarConsultaId?)` usando A1 · 🔗 R-C5
- [x] **8.12.5** ⭐ `agendarConsulta(entrada)`: valida R-C1 a R-C4, R-C8, R-C9; copia `departamentoId` do médico; evento `agendada`; atividade · 🔗 P9
- [x] **8.12.6** `reagendarConsulta(id, entrada, versao)`: R-S1, R-G1, R-C6 (ignora a própria), evento `reagendada {de, para}` · 🔗 P10
- [x] **8.12.7** `cancelarConsulta(id, motivo, versao)` · 🔗 P11
- [x] **8.12.8** `concluirConsulta(id)` e `marcarFalta(id)` com R-S2 · 🔗 P12
- [x] **8.12.9** `registrarEmLote(ids, acao)` em uma transação (tudo ou nada) · 🔗 P13
- [x] **8.12.10** Testes `consultas.service.test.ts` (1/2): conflito do médico, conflito do paciente com outro médico, passado, fora do expediente, pausa, antecedência > 180 dias, duração inválida, médico/paciente inativo
- [x] **8.12.11** Testes `consultas.service.test.ts` (2/2): transições permitidas e bloqueadas, cancelamento sem motivo, reagendar gera evento, lote desfaz se um item falhar, `atrasada` calculado com relógio fixo
- [ ] **8.12.12** Commit `fase-8: 8.12 serviço de consultas`

### 8.13 Atividades e latência simulada

- [x] **8.13.1** `services/atividades.ts`: `registrarAtividade` (usado dentro das transações; mantém só 200) e `listarAtividades({ limite })`
- [x] **8.13.2** Aplicar `delay` e `VITE_SIMULAR_ERRO` (como em `api.ts`) nas funções públicas dos serviços
- [x] **8.13.3** Testes: limite de 200; cada operação de escrita gera a atividade certa
- [ ] **8.13.4** Commit `fase-8: 8.13 atividades`

### 8.14 Dados iniciais (seeds) — D6

- [x] **8.14.1** `data/seeds/gerador.ts`: PRNG com semente fixa; `gerarCpfValido()`, `gerarCrm()`
- [x] **8.14.2** `data/seeds/medicos.ts`: 8 médicos (os 4 da tabela de troca + 4), 1 por departamento no mínimo, 1 com pausa, 1 inativo, 1 sem sextas
- [x] **8.14.3** `data/seeds/pacientes.ts`: ~30 pacientes (os 4 da tabela de troca + outros), 2 menores com responsável, 3 com alergias, 2 com nome social, 3 inativos
- [x] **8.14.4** `data/seeds/consultas.ts`: ~40 consultas da semana passada à próxima, relativas a `agora()`, cobrindo os 4 status e 2 atrasadas; os 4 horários de hoje do Painel (09:00, 10:30, 12:00, 16:00)
- [x] **8.14.5** Teste de integridade dos seeds: todos passam no esquema zod; nenhum conflito de agenda; CPFs e CRMs únicos e válidos
- [ ] **8.14.6** Commit `fase-8: 8.14 dados de exemplo`

### 8.15 Troca de nomes no Painel (D6)

- [x] **8.15.1** `data/mock.ts`: usuário → Dr. Ricardo Almeida; médicos dos alertas; textos da linha do tempo (tabela de troca)
- [x] **8.15.2** Atualizar expectativas em `dashboard.test.tsx`, `layout.test.tsx`, `qualidade.test.tsx` · ✔ testes passando
- [x] **8.15.3** Conferir no navegador: avatar "RA", títulos e listas com os nomes novos
- [ ] **8.15.4** Commit `fase-8: 8.15 nomes brasileiros no Painel`

### 8.16 Hooks de dados

- [x] **8.16.1** `hooks/useColecao.ts`: como `useAsync` + recarga quando o repositório notifica (inclusive de outra aba)
- [x] **8.16.2** Hooks por entidade: `usePaciente`, `useMedico`, `useConsulta`, `useListaPacientes`, `useListaMedicos`, `useAgenda`, `useHorariosLivres`
- [x] **8.16.3** Testes `useColecao.test.ts`: recarrega após gravação; ignora resposta antiga; cancela a assinatura ao desmontar
- [ ] **8.16.4** Commit `fase-8: 8.16 hooks reativos`

### 8.17 Fechamento da Fase 8

- [x] **8.17.1** `npm run test:coverage`: `services/` ≥ 85%, `utils/` ≥ 90% · ajustar os limites em `vite.config.ts` para essas metas
- [x] **8.17.2** (M13) Conferir a matriz de regras: cada R-xx da especificação tem ao menos um teste positivo e um negativo (listar no PR)
- [ ] **8.17.3** Teste manual de duas abas: alterar dados por um script no console de uma aba e ver a outra receber (via `useColecao` numa página temporária ou no console)
- [x] **8.17.4** `npm run lint`, `npm run build` sem avisos
- [x] **8.17.5** Painel visualmente igual à referência, exceto nomes
- [ ] **8.17.6** Abrir PR "Fase 8 — Fundação de dados e roteamento" com resumo, matriz de regras e cobertura
- [x] **8.17.7** Atualizar checkboxes deste plano e da especificação; painel de execução: Fase 8 ✅
- [ ] **8.17.8** Mesclar o PR na `main`

---

## Fase 9 — Componentes de formulário e listagem

**Objetivo:** todos os blocos de tela prontos e na vitrine `/ui`. **Duração:** 2,5 dias. **Branch:** `feat/fase-9-formularios`.

### 9.0 Abertura

- [ ] **9.0.1** Atualizar a `main` e criar `feat/fase-9-formularios`
- [x] **9.0.2** `npm run test` verde

### 9.1 Validação e máscaras (versão completa)

- [x] **9.1.1** Completar `utils/validacao.ts`: CPF rejeita sequências repetidas; telefone com DDD 11–99 e celular começando com 9; CRM 4–7 dígitos
- [x] **9.1.2** `utils/mascaras.ts`: `mascararCpf`, `mascararTelefone` (fixo e celular), `mascararCep`, `somenteDigitos`, `ocultarCpf` · 🔗 R-P4
- [x] **9.1.3** Testes `validacao.test.ts` com uma lista de CPFs válidos e inválidos conhecidos, telefones fixos/celulares, CEP, CRM
- [x] **9.1.4** Testes `mascaras.test.ts`: digitação parcial, colagem de valor formatado e não formatado
- [ ] **9.1.5** Commit `fase-9: 9.1 validação e máscaras`

### 9.2 Campos básicos

- [x] **9.2.1** `components/ui/form/Campo.tsx`: rótulo, `*` + "obrigatório" (sr-only), dica, erro; `aria-describedby`, `aria-invalid`, `aria-required`
- [x] **9.2.2** `Input.tsx` (com variante de erro e somente leitura)
- [x] **9.2.3** `Textarea.tsx` com contador de caracteres ("120/500")
- [x] **9.2.4** `Select.tsx` nativo estilizado
- [x] **9.2.5** `Checkbox.tsx` e `RadioGroup.tsx` (`fieldset` + `legend`)
- [x] **9.2.6** `SecaoFormulario.tsx` (título, descrição, grade 1/2/3 colunas)
- [x] **9.2.7** Estados nos temas claro e escuro: normal, foco, erro, desabilitado, somente leitura · ✔ contraste AA (axe)
- [x] **9.2.8** Testes: `Campo` liga dica e erro por `aria-describedby`; contador do `Textarea`
- [ ] **9.2.9** Commit `fase-9: 9.2 campos de formulário`

### 9.3 Campo com máscara

- [x] **9.3.1** `InputMascarado.tsx`: exibe com máscara, entrega o valor limpo ao react-hook-form (`Controller`)
- [x] **9.3.2** Preservar a posição do cursor ao editar no meio do texto
- [x] **9.3.3** Testes: digitar, apagar no meio, colar · ✔ cursor não "pula"
- [ ] **9.3.4** Commit `fase-9: 9.3 campo com máscara`

### 9.4 Combobox acessível ⭐ (RS-05)

- [x] **9.4.1** `Combobox.tsx` (padrão ARIA 1.2): `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`
- [x] **9.4.2** Busca com atraso de 250 ms via função `buscar(termo)` assíncrona; estado "Buscando…"; "Nenhum resultado"
- [x] **9.4.3** Teclado: ↑/↓ navegam, Enter seleciona, Esc fecha, Tab sai; anúncio "5 resultados" em `aria-live`
- [x] **9.4.4** Renderização customizada da opção (nome + detalhe, ex.: CPF mascarado)
- [x] **9.4.5** Testes só com teclado; seleção atualiza o valor do formulário
- [ ] **9.4.6** Commit `fase-9: 9.4 combobox`

### 9.5 Componentes de página e listagem

- [x] **9.5.1** `Breadcrumb.tsx` (lê `handle.breadcrumb` de `useMatches()`; `nav aria-label`; último item com `aria-current="page"`)
- [x] **9.5.2** `CabecalhoPagina.tsx` (`<h1 tabIndex={-1}>`, breadcrumb, área de ações)
- [x] **9.5.3** `BarraFiltros.tsx` (busca com atraso de 300 ms, filtros, "Limpar filtros")
- [x] **9.5.4** ⭐ `DataTable.tsx`: colunas declarativas, ordenação com `aria-sort`, link na 1ª coluna
- [x] **9.5.5** `DataTable`: versão em cartões abaixo de 640px (container query), estados carregando/vazio/erro
- [x] **9.5.6** `DataTable`: seleção múltipla opcional (checkbox por linha + "selecionar todos" da página)
- [x] **9.5.7** `Paginacao.tsx` ("Mostrando 1–10 de 48", `aria-current`)
- [x] **9.5.8** `MenuAcoes.tsx` ("⋯"), reaproveitando o teclado do `UserMenu`
- [x] **9.5.9** `DescricaoLista.tsx` (`<dl>` em grade)
- [x] **9.5.10** `hooks/useFiltrosUrl.ts`: busca, filtros, ordenação e página na query string; guarda a URL em `location.state.de` ao abrir um detalhe · 🔗 M14
- [x] **9.5.11** Testes: `DataTable` ordena, troca para cartões (container), seleciona; `Paginacao`; `useFiltrosUrl` lê e escreve a URL
- [ ] **9.5.12** Commit `fase-9: 9.5 componentes de listagem`

### 9.6 Feedback

- [x] **9.6.1** `Modal.tsx`: foco preso, Esc, `aria-modal`, devolve o foco (lógica do `MobileDrawer`)
- [x] **9.6.2** `DialogoConfirmacao.tsx` + `hooks/useConfirmar.ts` (Promise; opção `perigo`; opção `exigirTexto` para P5)
- [x] **9.6.3** `ToastProvider.tsx` + `hooks/useToast.ts`: sucesso/erro/aviso; `role="status"`/`alert`; 5 s (erros ficam até fechar); botão de ação
- [x] **9.6.4** Montar `ToastProvider` e o provedor de confirmação no `AppLayout`
- [x] **9.6.5** Testes: `Modal` prende e devolve o foco; `useConfirmar` resolve `true`/`false`; toast some sozinho e o de erro não
- [ ] **9.6.6** Commit `fase-9: 9.6 modal, confirmação e toast`

### 9.7 Resumo de erros e formulário de entidade ⭐

- [x] **9.7.1** `components/ui/form/ResumoErros.tsx` (`role="alert"`, links que focam cada campo)
- [x] **9.7.2** `hooks/useFormularioEntidade.ts`: `useForm` + `zodResolver`, `mode: 'onTouched'`, foco no 1º erro ao enviar, `aplicarErrosNoFormulario` para erros do serviço
- [x] **9.7.3** Em `useFormularioEntidade`: `useBlocker` só quando `isDirty` e não enviando + `DialogoConfirmacao` "Descartar alterações?" · 🔗 M1
- [x] **9.7.4** Em `useFormularioEntidade`: `beforeunload` quando houver alterações
- [x] **9.7.5** Testes: bloqueio de saída só com alterações; erro do serviço aparece no campo; foco no 1º erro
- [ ] **9.7.6** Commit `fase-9: 9.7 formulário de entidade`

### 9.8 Banner de demonstração (RS-01, M15)

- [x] **9.8.1** Componente `BannerDemonstracao` no `AppLayout` (texto de `t.demo`); oculto com `VITE_AMBIENTE=producao`
- [x] **9.8.2** Teste: aparece por padrão e some com a variável · ✔ axe sem violações
- [ ] **9.8.3** Commit `fase-9: 9.8 banner de demonstração`

### 9.9 Anúncio de rota (M11)

- [x] **9.9.1** `hooks/useAnunciarRota.ts`: a cada navegação, foca o `<h1>` e anuncia "Página: {titulo}" em `aria-live="polite"`
- [x] **9.9.2** Usar no `AppLayout` (não focar na primeira carga)
- [x] **9.9.3** Teste: navegar muda o foco para o `<h1>` e atualiza a região viva
- [ ] **9.9.4** Commit `fase-9: 9.9 anúncio de rota`

### 9.10 Textos e vitrine

- [x] **9.10.1** Grupos `formulario`, `lista`, `confirmacao`, `toast`, `demo` em `i18n/pt-BR.ts`
- [x] **9.10.2** Vitrine `/ui`: seção de cada componente novo com todos os estados
- [ ] **9.10.3** Commit `fase-9: 9.10 textos e vitrine`

### 9.11 Verificação

- [x] **9.11.1** Vitrine em 375, 768 e 1280px, claro e escuro
- [x] **9.11.2** Vitrine só com teclado (todos os componentes interativos)
- [x] **9.11.3** axe na vitrine nos dois temas · ✔ 0 violações

### 9.12 Fechamento da Fase 9

- [x] **9.12.1** Lint, build, `test:coverage` (`components/ui/` ≥ 70%)
- [ ] **9.12.2** PR "Fase 9 — Componentes" com capturas da vitrine
- [x] **9.12.3** Atualizar checkboxes e painel de execução: Fase 9 ✅
- [ ] **9.12.4** Mesclar o PR

---

## Fase 10 — Cadastro de Pacientes

**Objetivo:** P1–P5 funcionando de ponta a ponta. **Duração:** 2 dias. **Branch:** `feat/fase-10-pacientes`.

### 10.0 Abertura

- [ ] **10.0.1** Atualizar a `main` e criar `feat/fase-10-pacientes`
- [x] **10.0.2** `npm run test` verde

### 10.1 Rotas

- [x] **10.1.1** Rotas `pacientes`, `pacientes/novo`, `pacientes/:id`, `pacientes/:id/editar` com `lazy`, `handle.titulo` e `handle.breadcrumb` — `router.tsx`
- [x] **10.1.2** Páginas vazias com `CabecalhoPagina` em `pages/pacientes/` · ✔ navegar entre elas funciona; menu "Pacientes" ativo em todas
- [x] **10.1.3** ID inexistente → tela E-08 "Paciente não encontrado" com link para a lista
- [x] **10.1.4** Grupo `pacientes` em `i18n/pt-BR.ts`
- [ ] **10.1.5** Commit `fase-10: 10.1 rotas de pacientes`

### 10.2 Lista

- [x] **10.2.1** `ListaPacientes`: `CabecalhoPagina` + "+ Novo paciente"; `BarraFiltros` (busca, status padrão Ativos) com `useFiltrosUrl`
- [x] **10.2.2** `components/pacientes/TabelaPacientes.tsx`: colunas Nome (exibição + avatar + ícone de alergia), CPF mascarado, Idade, Telefone, Convênio, Próxima consulta, Status, ações · 🔗 R-P4, R-P6
- [x] **10.2.3** Ordenação por nome, idade e próxima consulta; paginação de 10
- [x] **10.2.4** `MenuAcoes` por linha: Ver, Editar, Agendar consulta, Inativar/Reativar
- [x] **10.2.5** Estados vazios: sem cadastros; sem resultado para a busca ("Limpar filtros")
- [x] **10.2.6** Testes: busca, filtro, ordenação, paginação, estados vazios; "Voltar" do detalhe mantém filtros
- [ ] **10.2.7** Commit `fase-10: 10.2 lista de pacientes`

### 10.3 Formulário — cadastro (P1) ⭐

- [x] **10.3.1** `components/pacientes/FormPaciente.tsx` com `useFormularioEntidade` e as seções: Dados pessoais, Contato, Endereço, Convênio, Informações clínicas, Contato de emergência, Consentimento
- [x] **10.3.2** Máscaras (CPF, telefone, CEP) com `InputMascarado`; foco inicial em "Nome completo"
- [x] **10.3.3** Validação de CPF disponível ao sair do campo (`cpfDisponivel`), com link "Abrir cadastro existente" · 🔗 R-P1, E-02
- [x] **10.3.4** Idade ao lado da data de nascimento; seção "Responsável legal" aparece e fica obrigatória se menor · 🔗 R-P5
- [x] **10.3.5** Campos de convênio só com "Convênio" selecionado; aviso (não erro) se a validade estiver vencida
- [x] **10.3.6** `ResumoErros` ao tentar salvar; botão "Salvando…" desabilitado durante o envio
- [x] **10.3.7** `NovoPaciente`: salvar → toast "Paciente cadastrado" → detalhe; com `?voltarPara=` → volta ao agendamento com `?pacienteId=`
- [x] **10.3.8** Barra de ações fixa no rodapé no celular
- [x] **10.3.9** Testes: obrigatórios, CPF inválido, CPF duplicado, menor sem responsável, convênio condicional, sucesso redireciona, `voltarPara`
- [ ] **10.3.10** Commit `fase-10: 10.3 cadastro de paciente`

### 10.4 Busca de CEP (A6, RS-06)

- [x] **10.4.1** `services/cep.ts`: `buscarCep(cep, signal)` com tempo limite de 5 s e cache em memória · 🔗 A6
- [x] **10.4.2** No formulário: dispara com 8 dígitos; cancela a busca anterior; indicador de carregamento
- [x] **10.4.3** Preenche só campos não editados (`dirtyFields`) e move o foco para "Número"
- [x] **10.4.4** Mensagens: "CEP não encontrado" e "Não foi possível buscar o CEP…" (E-10)
- [x] **10.4.5** Testes com `fetch` simulado: sucesso, `{erro:true}`, tempo esgotado, não sobrescreve campo editado, cache
- [ ] **10.4.6** Commit `fase-10: 10.4 busca de CEP`

### 10.5 Formulário — edição (P2)

- [x] **10.5.1** `EditarPaciente`: carrega os dados e guarda a `versao`
- [x] **10.5.2** Confirmação ao alterar o CPF; "Salvar" desabilitado sem alterações; aviso "Este paciente está inativo"
- [x] **10.5.3** E-05 (concorrência): diálogo "Recarregar dados" / "Continuar editando"
- [x] **10.5.4** Aviso não bloqueante quando o registro muda em outra aba · 🔗 M6
- [x] **10.5.5** Testes: edição salva; concorrência; troca de CPF exige confirmação
- [ ] **10.5.6** Commit `fase-10: 10.5 edição de paciente`

### 10.6 Detalhe

- [x] **10.6.1** `DetalhePaciente`: cabeçalho (avatar, nome de exibição, "Nome civil" se houver nome social, idade, status, ações)
- [x] **10.6.2** `components/pacientes/AlertaAlergias.tsx` em destaque quando houver
- [x] **10.6.3** Cards com `DescricaoLista`: Dados pessoais, Responsável (se houver), Contato e endereço, Convênio, Informações clínicas
- [x] **10.6.4** CPF oculto com botão "Mostrar CPF" · 🔗 R-P4
- [x] **10.6.5** "Próximas consultas" e "Histórico" (`CardHistorico`, paginado) com links
- [x] **10.6.6** Faixa de paciente inativo (data e motivo)
- [x] **10.6.7** Testes: E-08; CPF oculto por padrão; alergias; nome social
- [ ] **10.6.8** Commit `fase-10: 10.6 detalhe do paciente`

### 10.7 Inativar, reativar e excluir (P3–P5)

- [x] **10.7.1** Inativar: diálogo com a quantidade de consultas futuras e motivo opcional; toast "Paciente inativado. N consultas canceladas." com ação · 🔗 P3
- [x] **10.7.2** Reativar: confirmação + toast lembrando que as consultas não voltam · 🔗 P4
- [x] **10.7.3** Excluir: só sem consultas; confirmação digitando o nome; volta para a lista · 🔗 P5
- [x] **10.7.4** Testes: inativar cancela consultas futuras; reativar; excluir bloqueado com histórico
- [ ] **10.7.5** Commit `fase-10: 10.7 inativação e exclusão`

### 10.8 Fechamento da Fase 10

- [x] **10.8.1** Fluxo manual completo: cadastrar → ver → editar → inativar → reativar → (outro) excluir
- [x] **10.8.2** 375/768/1280px, claro/escuro, só teclado, axe nas 4 telas
- [x] **10.8.3** Lint, build, `test:coverage`
- [ ] **10.8.4** PR "Fase 10 — Pacientes" com capturas
- [x] **10.8.5** Atualizar checkboxes e painel de execução: Fase 10 ✅
- [ ] **10.8.6** Mesclar o PR

---

## Fase 11 — Cadastro de Médicos

**Objetivo:** P6–P8 funcionando; disponibilidade refletida nos horários. **Duração:** 1,5 dia. **Branch:** `feat/fase-11-medicos`.

### 11.0 Abertura

- [ ] **11.0.1** Atualizar a `main` e criar `feat/fase-11-medicos`
- [x] **11.0.2** `npm run test` verde

### 11.1 Rotas

- [x] **11.1.1** Rotas `medicos`, `medicos/novo`, `medicos/:id`, `medicos/:id/editar` (`lazy`, `handle`)
- [x] **11.1.2** Páginas vazias + E-08 "Médico não encontrado"; grupo `medicos` em `i18n/pt-BR.ts`
- [ ] **11.1.3** Commit `fase-11: 11.1 rotas de médicos`

### 11.2 Lista

- [x] **11.2.1** `ListaMedicos`: busca (nome/CRM), filtros por departamento e status, na URL
- [x] **11.2.2** Colunas: Nome com tratamento, CRM (`12345/SP`), Departamento, Dias (`Seg–Sex`), Consultas hoje, Status, ações
- [x] **11.2.3** Ações: Ver, Editar, Ver agenda, Agendar, Inativar/Reativar
- [x] **11.2.4** Alternância tabela/cartões (preferência no `localStorage`, com try/catch)
- [x] **11.2.5** Testes: busca por CRM, filtro por departamento, alternância de visualização
- [ ] **11.2.6** Commit `fase-11: 11.2 lista de médicos`

### 11.3 Formulário (P6, P7)

- [x] **11.3.1** `components/medicos/FormMedico.tsx`: seções Identificação, Contato, Lotação, Disponibilidade
- [x] **11.3.2** ⭐ `components/medicos/EditorDisponibilidade.tsx`: dias com `aria-pressed`; início, fim e pausa (`type="time"`, passo de 5 min); duração padrão
- [x] **11.3.3** `components/medicos/PreviaDisponibilidade.tsx`: texto em tempo real ("Seg a Sex · 08:00–17:00 · pausa 12:00–13:00 · 16 horários de 30 min")
- [x] **11.3.4** CRM disponível ao sair do campo · 🔗 R-M1
- [x] **11.3.5** `NovoMedico` e `EditarMedico` (com `versao`); na edição, diálogo de consultas afetadas antes de salvar · 🔗 P7, A3
- [x] **11.3.6** Testes: CRM inválido/duplicado; sem dias; fim antes do início; pausa fora do expediente; prévia com e sem pausa; aviso de consultas afetadas
- [ ] **11.3.7** Commit `fase-11: 11.3 formulário de médico`

### 11.4 Detalhe

- [x] **11.4.1** `DetalheMedico`: cabeçalho (avatar, nome, CRM, departamento, status, ações)
- [x] **11.4.2** Grade semanal de disponibilidade (com pausa)
- [x] **11.4.3** `components/medicos/AgendaMedico.tsx`: "Agenda de hoje" (ocupados/livres) e "Próximos 7 dias" (quantidade por dia)
- [x] **11.4.4** Indicadores do mês: consultas, taxa de faltas, cancelamentos
- [x] **11.4.5** Testes: E-08; indicadores calculados com seeds e relógio fixo
- [ ] **11.4.6** Commit `fase-11: 11.4 detalhe do médico`

### 11.5 Inativar (P8)

- [x] **11.5.1** Diálogo bloqueante com a lista viva de consultas futuras (links para reagendar/cancelar); botão habilita quando a lista zera
- [x] **11.5.2** Sem pendências: confirmação + motivo; reativar com confirmação
- [x] **11.5.3** Testes: bloqueio; a lista se atualiza ao cancelar uma consulta; inativação liberada
- [ ] **11.5.4** Commit `fase-11: 11.5 inativação de médico`

### 11.6 Verificação

- [x] **11.6.1** Cadastrar um médico novo e conferir os horários gerados em um teste rápido com `horariosLivres` (console ou teste)
- [x] **11.6.2** 375/768/1280px, claro/escuro, só teclado, axe nas 4 telas

### 11.7 Fechamento da Fase 11

- [x] **11.7.1** Lint, build, `test:coverage`
- [ ] **11.7.2** PR "Fase 11 — Médicos" com capturas
- [x] **11.7.3** Atualizar checkboxes e painel de execução: Fase 11 ✅
- [ ] **11.7.4** Mesclar o PR

---

## Fase 12 — Cadastro e agenda de Consultas

**Objetivo:** P9–P13 funcionando; nenhum conflito de agenda possível. **Duração:** 3 dias. **Branch:** `feat/fase-12-consultas`.

### 12.0 Abertura

- [ ] **12.0.1** Atualizar a `main` (com as Fases 10 e 11 mescladas) e criar `feat/fase-12-consultas`
- [x] **12.0.2** `npm run test` verde

### 12.1 Rotas

- [x] **12.1.1** Rotas `consultas`, `consultas/nova`, `consultas/:id`, `consultas/:id/editar` (`lazy`, `handle`)
- [x] **12.1.2** Páginas vazias + E-08 "Consulta não encontrada"; grupo `agenda` em `i18n/pt-BR.ts`
- [x] **12.1.3** "Ver agenda" (Painel) e "Ver todas" (Consultas de hoje) passam a apontar para a agenda real
- [ ] **12.1.4** Commit `fase-12: 12.1 rotas de consultas`

### 12.2 Agenda do dia (D7)

- [x] **12.2.1** `pages/consultas/Agenda.tsx`: data em destaque por extenso; botões ‹ Hoje ›; seletor de data (fuso do hospital); `?data=` na URL
- [x] **12.2.2** Filtros médico, departamento, status e "Pendentes de registro", na URL
- [x] **12.2.3** Resumo do dia: total, agendadas, concluídas, canceladas, faltas, pendentes
- [x] **12.2.4** `components/consultas/ListaAgenda.tsx`: itens por horário (hora–fim, paciente, alergia, médico, departamento, tipo, status, faixa "Aguardando registro") · 🔗 R-C7
- [x] **12.2.5** Alternância "por horário" / "por médico"
- [x] **12.2.6** Estado vazio "Nenhuma consulta em dd/mm" + "Agendar consulta"
- [x] **12.2.7** Testes: navegação de dias pela URL; filtros; resumo; consulta atrasada destacada (relógio fixo)
- [ ] **12.2.8** Commit `fase-12: 12.2 agenda do dia`

### 12.3 Seletor de horário ⭐

- [x] **12.3.1** `components/consultas/SeletorHorario.tsx`: grupo de rádio (setas navegam, Espaço seleciona), um botão por horário
- [x] **12.3.2** Horários indisponíveis desabilitados com motivo visível e lido pelo leitor de tela ("Ocupado", "Paciente já tem consulta", "Pausa", "Horário passado")
- [x] **12.3.3** Estado vazio com "Próximo dia com horário livre" · 🔗 A5
- [x] **12.3.4** Testes só com teclado; motivos anunciados; vazio
- [ ] **12.3.5** Commit `fase-12: 12.3 seletor de horário`

### 12.4 Agendar (P9) ⭐

- [x] **12.4.1** `components/consultas/FormConsulta.tsx` + `NovaConsulta`: pré-preenchimento por `?pacienteId=`, `?medicoId=`, `?data=`
- [x] **12.4.2** Paciente via `Combobox` (nome, nome social, CPF; só ativos) com resumo e `AlertaAlergias`; link "+ Cadastrar novo paciente" com `voltarPara`
- [x] **12.4.3** Departamento (filtro opcional) e Médico (só ativos, com dias de atendimento)
- [x] **12.4.4** Data com aviso "não atende às terças" + sugestão do próximo dia de atendimento
- [x] **12.4.5** Tipo (sugere "Retorno" quando aplicável) e duração (padrão do médico)
- [x] **12.4.6** `useHorariosLivres` recalcula ao mudar paciente/médico/data/duração e limpa a seleção inválida com aviso
- [x] **12.4.7** Salvar → toast "Consulta agendada: qui, 29/10 às 10:30 com Dr. Paulo Mendes" → detalhe
- [x] **12.4.8** E-03 (inativado no meio) e E-04 (horário ocupado no meio): erro no lugar certo, horários recarregados
- [x] **12.4.9** Estado sem pacientes ou sem médicos ativos: links para cadastrar
- [x] **12.4.10** Testes: fluxo completo; pré-preenchimento; E-04 simulando gravação direta no repositório; alergia aparece; sugestão de próximo dia
- [ ] **12.4.11** Commit `fase-12: 12.4 agendamento`

### 12.5 Detalhe da consulta

- [x] **12.5.1** `DetalheConsulta`: paciente (link + alergias), médico (link), departamento, data, hora–fim, tipo, motivo, status
- [x] **12.5.2** `components/consultas/LinhaDoTempoConsulta.tsx` a partir de `eventos`
- [x] **12.5.3** `components/consultas/AcoesConsulta.tsx`: botões conforme o status e o horário (com dica quando desabilitado)
- [x] **12.5.4** Testes: eventos na ordem; ações certas por status
- [ ] **12.5.5** Commit `fase-12: 12.5 detalhe da consulta`

### 12.6 Reagendar (P10)

- [x] **12.6.1** `EditarConsulta`: paciente fixo; horários com `ignorarConsultaId`; "Horário atual" marcado
- [x] **12.6.2** Troca de médico atualiza o departamento; R-G1 com `versao`
- [x] **12.6.3** Testes: reagendar gera evento de/para; mesma consulta não conflita consigo; consulta não agendada redireciona com aviso
- [ ] **12.6.4** Commit `fase-12: 12.6 reagendamento`

### 12.7 Cancelar (P11)

- [x] **12.7.1** Modal com motivo obrigatório (5–300) e sugestões em um clique
- [x] **12.7.2** Toast "Consulta cancelada" com ação "Agendar novamente" (pré-preenchida)
- [x] **12.7.3** Testes: motivo obrigatório; ação do toast abre o agendamento preenchido
- [ ] **12.7.4** Commit `fase-12: 12.7 cancelamento`

### 12.8 Concluir e registrar falta (P12)

- [x] **12.8.1** Ações no detalhe e na linha da agenda, com confirmação curta
- [x] **12.8.2** Desabilitadas antes do início, com a dica "Disponível a partir das HH:mm"
- [x] **12.8.3** Testes com relógio fixo antes e depois do início
- [ ] **12.8.4** Commit `fase-12: 12.8 concluir e falta`

### 12.9 Baixa pendente em lote (P13)

- [x] **12.9.1** Filtro "Pendentes de registro" (qualquer dia) com seleção múltipla
- [x] **12.9.2** Ações em lote "Marcar como concluídas" / "Marcar falta" com confirmação e resumo no toast
- [x] **12.9.3** Testes: lote em transação; se um item falhar, nenhum muda
- [ ] **12.9.4** Commit `fase-12: 12.9 baixa em lote`

### 12.10 Verificação e fechamento da Fase 12

- [x] **12.10.1** Teste manual de duas abas: agendar o mesmo horário nas duas → a segunda recebe E-04
- [x] **12.10.2** Tentar todas as combinações de conflito (médico, paciente, pausa, passado, fim do expediente) · ✔ nenhuma passa
- [x] **12.10.3** 375/768/1280px, claro/escuro, só teclado (incluindo `Combobox` e `SeletorHorario`), axe nas 4 telas
- [x] **12.10.4** Lint, build, `test:coverage`
- [ ] **12.10.5** PR "Fase 12 — Consultas" com capturas e vídeo curto do agendamento
- [x] **12.10.6** Atualizar checkboxes e painel de execução: Fase 12 ✅
- [ ] **12.10.7** Mesclar o PR

---

## Fase 13 — Integração com o Painel

**Objetivo:** o Painel reflete os cadastros em tempo real, sem mudar o visual. **Duração:** 1 dia. **Branch:** `feat/fase-13-integracao`.

### 13.0 Abertura

- [ ] **13.0.1** Atualizar a `main` e criar `feat/fase-13-integracao`
- [ ] **13.0.2** `npm run test` verde

### 13.1 Consultas de hoje

- [ ] **13.1.1** `AppointmentsTable` passa a usar `useAgenda({ data: hojeNoFuso() })` com `ConsultaDetalhada`
- [ ] **13.1.2** Linhas clicáveis → detalhe da consulta (link real na coluna do paciente)
- [ ] **13.1.3** Aviso "N consultas aguardando registro" com link para o filtro de pendentes · 🔗 P13
- [ ] **13.1.4** Testes: agendar uma consulta hoje aparece no card sem recarregar

### 13.2 Boas-vindas e KPIs

- [ ] **13.2.1** Resumo "{n} consultas hoje" calculado do repositório
- [ ] **13.2.2** KPI "Total de pacientes" = pacientes ativos (variação continua mockada; registrar no Diário)
- [ ] **13.2.3** KPI "Médicos de plantão" = médicos ativos que atendem no dia da semana atual
- [ ] **13.2.4** Testes com seeds e relógio fixo

### 13.3 Linha do tempo de atividades

- [ ] **13.3.1** `ActivityTimeline` passa a ler `listarAtividades({ limite: 4 })`
- [ ] **13.3.2** Teste: cadastrar paciente gera item no topo

### 13.4 Limpeza

- [ ] **13.4.1** Remover `criarConsultasHoje`, `criarAtividadesHoje` e o tipo `ConsultaPainel` sem uso; remover funções antigas de `api.ts` que ficarem órfãs
- [ ] **13.4.2** `npx tsc -b` e lint sem avisos de código não usado

### 13.5 Restaurar dados de exemplo

- [ ] **13.5.1** Botão "Restaurar dados de exemplo" na vitrine `/ui` (só em desenvolvimento), com confirmação de perigo
- [ ] **13.5.2** Teste: restaura os seeds e notifica as telas

### 13.6 Verificação e fechamento da Fase 13

- [ ] **13.6.1** Agendar, concluir e cancelar em uma aba e ver o Painel mudar em outra
- [ ] **13.6.2** Comparar o Painel em 1600px com `referencia-fase7.png` · ✔ igual, exceto nomes e dados
- [ ] **13.6.3** Lint, build, `test:coverage`; PR "Fase 13 — Integração"
- [ ] **13.6.4** Atualizar checkboxes e painel de execução: Fase 13 ✅; mesclar o PR

---

## Fase 14 — Qualidade, testes e entrega

**Objetivo:** confiança para entregar: e2e, acessibilidade, performance e documentação. **Duração:** 2 dias. **Branch:** `feat/fase-14-qualidade`.

### 14.0 Abertura

- [ ] **14.0.1** Atualizar a `main` e criar `feat/fase-14-qualidade`
- [ ] **14.0.2** `npm run test` verde

### 14.1 Configuração do Playwright

- [ ] **14.1.1** `npm install -D @playwright/test@^1.64` e `npx playwright install chromium`
- [ ] **14.1.2** `playwright.config.ts`: `webServer` com `npm run build && npm run preview`, `baseURL`, fuso `America/Sao_Paulo`, locale `pt-BR`
- [ ] **14.1.3** Script `test:e2e` no `package.json`; pasta `e2e/` fora do Vitest (`test.exclude`)
- [ ] **14.1.4** Utilitário e2e: limpar `localStorage` e fixar o relógio (`page.clock`) antes de cada cenário

### 14.2 Cenários e2e

- [ ] **14.2.1** Cenário 1: cadastrar paciente → agendar → ver no Painel → concluir
- [ ] **14.2.2** Cenário 2: tentar horário ocupado → erro → escolher outro
- [ ] **14.2.3** Cenário 3: inativar médico com consultas futuras → bloqueio → cancelar → inativar
- [ ] **14.2.4** Cenário 4: duas abas (`context.newPage()`) agendando o mesmo horário → a segunda recebe E-04
- [ ] **14.2.5** axe-core em todas as rotas, claro e escuro (`@axe-core/playwright`)
- [ ] **14.2.6** `npm run test:e2e` verde 3 vezes seguidas (sem instabilidade)

### 14.3 Acessibilidade

- [ ] **14.3.1** Revisar resumo de erros, foco no 1º erro e anúncio de rota em todas as telas
- [ ] **14.3.2** Só teclado: `Combobox`, `SeletorHorario`, `Modal`, `MenuAcoes`, `Toast`, `DataTable`
- [ ] **14.3.3** NVDA: P1 (cadastrar paciente) e P9 (agendar) · ✔ anotações no Diário e correções feitas

### 14.4 Idioma e formatos

- [ ] **14.4.1** Varredura de textos fora do `pt-BR.ts` (script da Fase 7)
- [ ] **14.4.2** Conferir formatos: `dd/mm/aaaa`, 24h, CPF, telefone, CEP, CRM `12345/SP`
- [ ] **14.4.3** Revisar as mensagens E-01 a E-10 com alguém que não seja desenvolvedor

### 14.5 Performance

- [ ] **14.5.1** Conferir no build os pacotes separados por módulo (pacientes, médicos, consultas)
- [ ] **14.5.2** Gerar 1.000 pacientes e 3.000 consultas (script de dev) → busca < 100 ms; uso do armazenamento < 80%
- [ ] **14.5.3** Lighthouse desktop em lista, formulário e agenda · ✔ ≥ 90 em todas as categorias

### 14.6 Documentação

- [ ] **14.6.1** README: seção "Cadastros" (rotas, processos resumidos, regras principais, limites, restaurar dados)
- [ ] **14.6.2** README: aviso de ambiente de demonstração (RS-01) e privacidade do CEP
- [ ] **14.6.3** README: como trocar o repositório local pela API real
- [ ] **14.6.4** Capturas novas em `docs/capturas/` (listas, formulários, agenda, Painel com nomes novos)

### 14.7 Verificação final

- [ ] **14.7.1** Percorrer o [Checklist final de aceite](PLANO_CADASTROS_MEDICORE.md#-checklist-final-de-aceite) da especificação e marcar cada item
- [ ] **14.7.2** Registrar no Diário os números finais (testes, cobertura, Lighthouse, tamanho dos pacotes) contra a linha de base da Etapa 0

### 14.8 Fechamento da Fase 14

- [ ] **14.8.1** Lint, build, `test:coverage`, `test:e2e`
- [ ] **14.8.2** PR "Fase 14 — Qualidade e entrega" com os números finais
- [ ] **14.8.3** Atualizar checkboxes e painel de execução: Fase 14 ✅
- [ ] **14.8.4** Mesclar o PR

---

## Encerramento do projeto

- [ ] **E.1** Deploy da `main` final e teste da URL publicada (desktop e celular)
- [ ] **E.2** Fluxo completo na URL publicada: cadastrar paciente e médico, agendar, concluir, ver no Painel
- [ ] **E.3** Criar a tag de versão: `git tag v1.1.0 && git push --tags`
- [ ] **E.4** Atualizar o `PLANO_CADASTROS_MEDICORE.md`: todas as fases ✅ e registro final
- [ ] **E.5** Atualizar o painel de execução deste plano: todas ✅, datas de início e fim preenchidas
- [ ] **E.6** Revisar o Backlog e escolher o próximo passo (recomendado: backend real, por causa do RS-01)
- [ ] **E.7** Registrar no Diário as lições aprendidas (o que atrasou, o que ajudou)
- [ ] **E.8** Arquivar os planos concluídos em `docs/planos/`

---

## 📓 Diário de execução

Use para registrar o dia a dia: bloqueios, decisões pequenas, desvios de prazo e números.

### Linha de base (Etapa 0) e números finais (Fase 14)

| Indicador | Linha de base | Final |
|---|---|---|
| Testes (quantidade) | 84 | (Fase 8: 214) |
| Cobertura geral | | |
| Cobertura `services/` / `utils/` | — | (Fase 8: 97,9% / 98,4% linhas) |
| Pacote inicial (gzip) | | |
| Lighthouse desktop (Perf · A11y · BP · SEO) | | |
| Violações axe | | |

### Registro diário

| Data | Fase / tarefa | Anotação (feito, bloqueio, decisão, desvio) |
|---|---|---|
| 27/10/2026 | Fase 8 | Código e testes concluídos (214 testes; services 97,9% e utils 98,4% de linhas). Pendentes: branch, commits, PR e merge (feitos pelo usuário). `paraInputDate` (8.3.5) dispensado: `DataIso` já é o formato do `<input type="date">`. Dados de exemplo ocupam de −7 a +7 dias a partir de hoje; testes de serviço agendam fora dessa janela. Resumo e matriz de regras em `docs/PR_FASE_8.md`. |
| 27/10/2026 | Fase 9 | Componentes concluídos (286 testes; `components/ui/` 93,8% das linhas). Vitrine `/ui` em 375, 768 e 1280px, claro e escuro: sem rolagem horizontal e 0 violações axe (também com combobox, menu, diálogo e toasts abertos). Ajustes: borda de campo com contraste ≥ 3:1 (`--color-border-input`); iniciais do avatar com contraste AA no escuro; vitrine carregada sob demanda (fora do build de produção). Banner de demonstração no topo do conteúdo desloca o Painel em ~32px. |
| 27/10/2026 | Fase 10 | Pacientes de ponta a ponta (313 testes). Fluxo manual completo no navegador (cadastrar → ver → editar → inativar → reativar → excluir → E-08) sem erros; 4 telas em 375/768/1280px, claro/escuro: sem rolagem horizontal e 0 violações axe. Decisões: regras cruzadas do esquema de paciente rodam mesmo com outros erros (`when`); após conflito de versão, "Continuar editando" adota a versão atual e o próximo salvar grava por cima. Corrigido: texto `sr-only` do cabeçalho da tabela alargava a página em 768px. Links para `/consultas/...` dependem da Fase 12. |
| 27/10/2026 | Fase 11 | Médicos de ponta a ponta (328 testes). Fluxo no navegador: cadastro → edição de disponibilidade → inativação bloqueada até cancelar as 4 consultas futuras no próprio diálogo → inativar → reativar. 4 telas em 375/768/1280px, claro/escuro, 0 violações axe (grade semanal vira lista no celular). Corrigido: estilo "perigo" do diálogo de confirmação não era aplicado (nova variante `perigo` do Button). CRM exibido como `123456/SP`. |
| 27/10/2026 | Fase 12 | Consultas de ponta a ponta (346 testes). Teste de duas abas revelou perda de dados quando uma aba gravava antes de receber o evento `storage`: `transacao()` agora relê as coleções alteradas no storage antes de validar. E-04 confirmado no navegador sem gravação dupla. 4 telas em 375/768/1280px, claro/escuro, 0 violações axe; agendamento completo só com teclado. Vídeo em `docs/capturas/fase12-agendamento.mp4`. |
| | | |
| | | |
