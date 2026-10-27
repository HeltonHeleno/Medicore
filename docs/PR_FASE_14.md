# Fase 14 — Qualidade, testes e entrega

- **Branch:** `feat/fase-14-qualidade`
- **Plano:** `PLANO_EXECUCAO_CADASTROS.md`, tarefas 14.1 a 14.8

## Resumo

- **Testes de ponta a ponta:** os 4 cenários do plano, fluxos só com teclado e axe em todas as
  rotas. São 66 testes, que passaram 4 vezes seguidas, sem instabilidade.
- **Acessibilidade:** a auditoria axe atualizada achou 4 problemas de acessibilidade, todos
  corrigidos.
- **Desempenho:** o Painel deixou de baixar o zod no carregamento inicial.
- **Teste de carga:** 1.000 pacientes e 3.000 consultas; a agenda ficou até 4 vezes mais rápida.
- **Documentação:** README reescrito, com cadastros, privacidade, troca pela API real e
  verificação manual.

## 14.1–14.2 Testes de ponta a ponta (Playwright)

- **Pacotes:** `@playwright/test` 1.64 e `@axe-core/playwright` 4.14.
- **Configuração (`playwright.config.ts`):**
  - roda contra a build de produção, com `npm run build && npm run preview`;
  - o navegador fica no fuso `America/Sao_Paulo` e em `pt-BR`;
  - guarda trace e captura só quando um teste falha.
- **Scripts:** `npm run test:e2e` e `npm run test:e2e:ui`.
- **Separação do Vitest:** a pasta `e2e/` ficou fora do Vitest (`test.exclude`).
  `test-results/` e `playwright-report/` estão no `.gitignore`.
- **Base dos testes (`e2e/fixtures.ts`):**
  - cada teste começa num contexto novo, com `localStorage` vazio;
  - o relógio é fixado com `page.clock` numa segunda-feira, 09/11/2026, às 09:40. Assim os
    dados de exemplo e os horários livres são sempre os mesmos;
  - helpers: `novaAba` (com o mesmo relógio), `limparDados` e `toast`.
- **Chromium já instalado:** se a variável `PW_CHROMIUM_PATH` estiver definida, o Playwright
  usa esse executável.

| Arquivo                            | O que cobre                                                                                                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cenario1-fluxo-principal.spec.ts` | Cadastra o paciente (P1) e agenda a partir do cadastro (P9). A consulta aparece no Painel, na tabela e na linha do tempo. Depois do horário, conclui (P12) e o Painel acompanha.                                                           |
| `cenario2-horario-ocupado.spec.ts` | Outra pessoa grava o horário escolhido enquanto o formulário está aberto. O resultado é o E-04 "Este horário acabou de ser ocupado": o horário fica "Ocupado" e não pode ser escolhido. Outro horário é aceito, e nada é gravado em dobro. |
| `cenario3-inativar-medico.spec.ts` | P8: a inativação fica bloqueada. As consultas futuras são canceladas uma a uma no próprio diálogo, e então o médico é inativado e some do agendamento.                                                                                     |
| `cenario4-duas-abas.spec.ts`       | Duas abas escolhem 10:00. A segunda é avisada pelo evento `storage`; sem o evento, recebe E-04 ao salvar. Uma única consulta é gravada.                                                                                                    |
| `teclado.spec.ts`                  | Só teclado: resumo de erros e foco, anúncio de rota, Combobox, SeletorHorario, fechar o Toast, MenuAcoes, Modal (foco preso, Esc devolve o foco) e ordenação da DataTable.                                                                 |
| `acessibilidade.spec.ts`           | axe (WCAG 2.2 AA + boas práticas) em 24 rotas, nos temas claro e escuro. Inclui o formulário com erros, o diálogo de cancelamento, a busca de paciente aberta e o celular em 375px (sem rolagem horizontal).                               |

**Resultado:** 66 testes, verdes em 4 execuções seguidas (de 4,7 a 5,5 min cada).

## 14.3 Acessibilidade — problemas encontrados e corrigidos

O axe atualizado (4.14, com WCAG 2.2) e os testes de teclado encontraram estes problemas:

1. **Rótulo no nome (WCAG 2.5.3) no botão do perfil:**
   - o botão lia "Menu do usuário", mas mostrava "RA";
   - agora as iniciais do avatar são desenhadas pelo CSS (`data-iniciais`), porque são
     decorativas.
2. **Rótulo no nome nos dias da disponibilidade:**
   - o botão mostrava "Seg", mas lia "Segunda";
   - agora lê "Seg, segunda-feira".
   - Os nomes completos dos dias saíram do componente e foram para o `pt-BR.ts`.
3. **Duas regiões de busca sem nome:** a busca do cabeçalho e a das listas viraram
   "Pesquisar no sistema" e o rótulo da busca de cada lista ("Buscar por nome, CPF ou telefone", "Buscar por nome ou CRM").
4. **Combobox:**
   - "Buscando…" e "Nenhum resultado" ficavam dentro do `listbox`, mas um listbox só pode
     conter opções;
   - agora a mensagem aparece fora dele;
   - `aria-expanded` só é verdadeiro quando há opções.
5. **Diálogo de inativação do médico:**
   - os botões "Reagendar" e "Cancelar" de cada consulta tinham o mesmo nome do "Cancelar" do
     rodapé;
   - agora leem "Cancelar consulta de Rafaela Martins em 12/11/2026 · 13:30", começando pelo
     texto visível.

**Resumo de erros, foco no 1º erro e anúncio de rota:** foram revisados em todas as telas.
Agora também estão cobertos por `teclado.spec.ts`.

**NVDA (14.3.3):** não dá para automatizar. O roteiro de P1 e P9 está em
`docs/VERIFICACAO_MANUAL.md` e **continua pendente**.

## 14.4 Idioma e formatos

- **Varredura de textos:** novo script `npm run i18n:verificar` (`scripts/varrer-textos.ts`).
  - Ele analisa o código com o compilador do TypeScript e procura:
    - texto em JSX;
    - `aria-label`, `title`, `placeholder` e props como `titulo` e `mensagem` escritos direto;
    - `toast.*('...')` e `new ErroX('...')`.
  - Resultado: encontrou "Dr."/"Dra." no formulário de médico e os nomes dos dias, e os dois
    foram para o `pt-BR.ts`. Agora o resultado é "Nenhum texto de interface fora de
    src/i18n/pt-BR.ts".
- **Formatos:** `dd/mm/aaaa`, 24h, CPF, telefone, CEP e CRM `123456/SP` estão cobertos pelos
  testes de `utils/`. Os campos de data usam o calendário nativo do navegador, que mostra
  `dd/mm/aaaa` com o navegador em português.
- **Mensagens E-01 a E-10 (14.4.3):**
  - fiz uma revisão de linguagem: as mensagens dizem o que houve e o que fazer, sem jargão;
  - a revisão por alguém que não é desenvolvedor **continua pendente**. A tabela para essa
    revisão está em `docs/VERIFICACAO_MANUAL.md`.

## 14.5 Desempenho

### Pacotes (14.5.1)

- Cada tela é um pacote próprio, carregado sob demanda (Agenda, FormPaciente, DetalheMedico…).
  Os gráficos ficam em `graficos-*.js`.
- **Melhoria:**
  - desde a Fase 13, o Painel importava os serviços, e com eles o **zod**, só para ler dados;
  - agora os esquemas são carregados sob demanda dentro das funções que gravam
    (`await import('../schemas/...')`);
  - `TIPOS_CONSULTA` foi para `types/consulta.ts`;
  - o JS inicial caiu de cerca de 166 kB para **141 kB** (gzip).

### Carga (14.5.2, `src/__tests__/carga.test.ts`)

Com 1.000 pacientes e 3.000 consultas, o uso do armazenamento é de **3,39 MB, 67,9% do limite**
(meta: < 80%).

| Operação                                         |   Antes |   Depois |     Meta |
| ------------------------------------------------ | ------: | -------: | -------: |
| Buscar paciente (nome, CPF)                      | 5–16 ms |   4–7 ms | < 100 ms |
| Ordenar por idade, página 50                     |   99 ms |    12 ms | < 100 ms |
| Agenda de um dia                                 |   86 ms |    21 ms | < 100 ms |
| Pendentes de registro (todas as datas)           |   97 ms | 35–41 ms | < 100 ms |
| Horários livres (A1)                             |    6 ms |     3 ms | < 100 ms |
| Primeira leitura do storage (uma vez por página) |   48 ms |    34 ms | < 500 ms |

- **Gargalo encontrado:** o `Intl.DateTimeFormat`, chamado milhares de vezes para achar a data
  de cada consulta no fuso do hospital.
- **Correção:**
  - `partesNoFuso` agora guarda o deslocamento do fuso em cache, por bloco de 15 minutos;
  - as trocas de horário acontecem em horas cheias, então o resultado não muda;
  - os testes de fuso e de horário de verão continuam passando.

### Lighthouse desktop (14.5.3)

| Tela                         | Desempenho | Acessibilidade | Boas práticas | SEO |    LCP |
| ---------------------------- | ---------: | -------------: | ------------: | --: | -----: |
| Painel `/`                   |         98 |            100 |           100 | 100 | 0,85 s |
| Lista `/pacientes`           |         99 |            100 |           100 | 100 | 0,85 s |
| Formulário `/pacientes/novo` |         99 |            100 |           100 | 100 | 0,85 s |
| Agenda `/consultas`          |        100 |            100 |           100 | 100 | 0,71 s |
| Agendar `/consultas/nova`    |         99 |            100 |           100 | 100 | 0,80 s |
| Médicos `/medicos`           |        100 |            100 |           100 | 100 | 0,70 s |

## 14.6 Documentação

- **README reescrito.** Novas seções:
  - aviso de demonstração (RS-01);
  - rotas, processos P1–P13, regras e limites de armazenamento;
  - restaurar os dados de exemplo e privacidade do CEP (ViaCEP recebe só o CEP);
  - passo a passo para trocar o `localStorage` pela API real (assinaturas dos serviços, erros
    HTTP para as classes de erro, regras no servidor, recarga);
  - scripts novos e números de qualidade.
- **`PLANO_IMPLEMENTACAO_MEDICORE.md`:** o backlog e o registro apontam para os cadastros.
- **Capturas novas:**
  - `painel-claro.png`, `painel-escuro.png` e `painel-celular.png`, com os nomes novos e os
    dados reais;
  - `fase14-pacientes-claro-1440.png`, `fase14-agenda-escuro-1440.png`,
    `fase14-agendar-claro-1440.png`, `fase14-medico-claro-1440.png` e
    `fase14-erros-celular.png`.
- **Novo `docs/VERIFICACAO_MANUAL.md`:** roteiros de NVDA e tabela de revisão das mensagens.

## Ajuste nos dados de exemplo

O horário de cancelamento das consultas futuras de exemplo caía sempre em "agora". Por isso, a
linha do tempo mostrava vários cancelamentos no mesmo minuto. Agora ele recua um pouco, como o
agendamento já fazia desde a Fase 13. As consultas e as situações não mudam.

## Números finais (14.7.2)

| Indicador                                                           | Linha de base (Fase 7) | Fase 13               | Fase 14                                 |
| ------------------------------------------------------------------- | ---------------------- | --------------------- | --------------------------------------- |
| Testes Vitest                                                       | 84                     | 352                   | **353** (36 arquivos)                   |
| Testes Playwright                                                   | —                      | —                     | **66**                                  |
| Cobertura de linhas (geral)                                         | 94,7%                  | 94,1%                 | **94,2%**                               |
| `services/` · `utils/` · `components/ui/` (linhas)                  | —                      | 98,3% · 98,5% · 94,9% | **98,3% · 98,6% · 95,6%**               |
| JS inicial (gzip)                                                   | ~99 kB                 | ~166 kB               | **~141 kB**                             |
| Lighthouse desktop (Desempenho, Acessibilidade, Boas práticas, SEO) | 99 · 100 · 100 · 100   | —                     | **98–100 · 100 · 100 · 100**            |
| Violações axe                                                       | 0                      | 0                     | **0** (WCAG 2.2 AA, 24 rotas × 2 temas) |

`npm run lint`, `npm run build`, `npm run test:coverage`, `npm run test:e2e` e
`npm run i18n:verificar` terminam sem erros nem avisos.

## Pendências (precisam de uma pessoa)

- [ ] **14.3.3:** teste com NVDA nos fluxos P1 e P9 (`docs/VERIFICACAO_MANUAL.md`).
- [ ] **14.4.3:** revisão das mensagens E-01 a E-10 por alguém que não seja desenvolvedor.
- [ ] **Encerramento (E.1–E.8):** deploy (só com confirmação), tag `v1.1.0` e arquivar os
      planos.
