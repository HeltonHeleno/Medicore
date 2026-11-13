# Fase 22 — Integração contínua no GitHub (BL-60)

- **Branch:** `feat/fase-22-integracao-continua` (sobre a `docs/plano-melhorias`, que traz os planos e a Etapa 0)
- **Plano:** `PLANO_EXECUCAO_MELHORIAS.md`, tarefas 22.0 a 22.F
- **Especificação:** `PLANO_MELHORIAS_MEDICORE.md`, BL-60 (processos BL-60.1 a BL-60.4) e D35

## Resumo

Nada entra na `main` sem as verificações. O workflow `.github/workflows/verificacoes.yml` roda em todo PR, em todo push na `main` e sob demanda.

| Job                       | Passos                                                                                                                                                               | Tempo local\* |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------: |
| Lint, formato e textos    | `lint`, `format:check`, `i18n:verificar`                                                                                                                             |          18 s |
| Testes e cobertura        | `test:coverage` com as metas de `vite.config.ts`; anexa a pasta `coverage/`                                                                                          |       4,2 min |
| Build e pacote inicial    | `build`, `pacote:medir -- --json`; na `main` guarda a medição em cache; no PR compara, escreve no resumo da execução e comenta no PR                                 |          19 s |
| Ponta a ponta (1/2 e 2/2) | Chromium (só o _headless shell_) com cache por versão do Playwright; `test:e2e --shard=N/2`; anexa o relatório HTML e os traces quando falha                         |  3,2 min cada |
| `verificacoes`            | Depende dos quatro; falha se algum não terminar com sucesso (falha, cancelado ou pulado). **É o check a exigir** na Vercel (agora) e na proteção da `main` (Fase 41) |             — |

\* Num contêiner de 2 CPUs. Somando `npm ci` e a instalação do Chromium, a estimativa no GitHub é de **~7 min** do início ao fim, contra 15 min do critério (22.F.1). O tempo real entra no Diário depois da primeira execução.

### Comparação do pacote (BL-60.4)

- `pacote:medir` ganhou a opção `--json <arquivo>`.
- `scripts/comparar-pacote.ts` gera o comentário: total, JS e CSS da `main` e do PR, e os arquivos que mudaram (comparados sem o hash do nome).
- O comentário é um só por PR: cada push edita o anterior (`gh pr comment --edit-last --create-if-none`).
- Crescimento acima de **5 kB** gera um aviso (`::warning::`) e um alerta no comentário. Não reprova: quem reprova é o marcador dos módulos, como antes.
- PRs de forks não podem comentar; para eles, o resumo da execução mostra o mesmo texto.

### Outros ajustes

- **22.0.3:** Prettier nos 10 `docs/PR_FASE_*.md` (8–13, 16, 18–20) que falhavam no `format:check`. Só o alinhamento das tabelas mudou.
- **Playwright:** na CI, além das anotações do GitHub, gera o relatório HTML (para anexar quando falhar).
- **README:** seção "Integração contínua", com a configuração dos Deployment Checks da Vercel e o aviso de falha por e-mail.

## Números

| Indicador                      | Etapa 0 (linha de base) | Fase 22                                      |
| ------------------------------ | ----------------------- | -------------------------------------------- |
| Testes Vitest                  | 672 (61)                | **681 (62)** (+9 de `comparar-pacote`)       |
| Testes Playwright              | 139                     | **139**                                      |
| Cobertura geral (linhas)       | 92,31%                  | **92,31%** (`scripts/` fica fora)            |
| Pacote inicial (gzip)          | 153,6 kB                | **153,6 kB** · marcadores: 0                 |
| Tempo das verificações (local) | —                       | e2e 7,0 min com 2 workers; 3,2 min por parte |

## Verificação

- [x] `actionlint` sem achados no workflow
- [x] `npm run lint`, `format:check` e `i18n:verificar` verdes (o `format:check` falhava antes da 22.0.3)
- [x] `npm run test:coverage`: 681 testes; metas atingidas
- [x] `npm run build` e `pacote:medir -- --json`: 153,6 kB, marcadores 0, JSON gravado
- [x] Comparação simulada: sem a `main` (só o tamanho), igual (±0,0), +5,9 kB (aviso no comentário e `::warning::`)
- [x] Lógica do check agregado simulada: só passa com os quatro `success`
- [x] `CI=1 npm run test:e2e -- --shard=1/2`: 70 verdes em 3,2 min, relatório HTML gerado; o conjunto completo com 2 workers: 139 verdes em 7,0 min
- [x] Primeira execução no GitHub (PR #8): o workflow aparece no PR, o comentário do pacote veio ("153,6 kB → 153,6 kB (±0,0 kB)"); verde na 2ª tentativa (ver abaixo)
- [x] Com um teste falhando, o `verificacoes` fica vermelho (1ª tentativa do PR #8). "Não pode ser publicado" depende da 22.3.1
- [ ] 👤 Vercel: Deployment Checks com o check `verificacoes` (22.3.1)
- [x] PR #8 mesclado (13/11, antes do fim da 1ª execução)

## Depois do merge (13/11/2026)

| Execução            | Resultado                                                                                                                                   |      Tempo |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------: |
| PR #8, 1ª tentativa | ❌ "Testes e cobertura": 1 teste instável (`leitos.paginas.test.tsx`, busca no mapa: 6,9 s contra a espera de 5 s); `verificacoes` vermelho | 3 min 16 s |
| PR #8, 2ª tentativa | ✅ os seis checks                                                                                                                           | 3 min 22 s |
| `main` (`7555855`)  | ✅ os seis checks; medição do pacote gravada                                                                                                | 3 min 00 s |

- **22.F.4 (branch `fix/fase-22-pendencias`):** o teste passa a colar o nome em vez de digitar letra a letra (cada tecla re-renderizava os 130 cartões) e espera até 10 s. Com 1 CPU e cobertura: 9,1 s → 7,1 s, verde 3 vezes; `test:coverage` completo com 2 CPUs verde (681).
- **22.3.1 continua pendente:** a versão de produção do merge ficou pronta às 13:45:41, 2,5 min antes de o `verificacoes` terminar; nada indica que os Deployment Checks estejam ligados.
- **Sugestão:** antecipar a Fase 41 (proteger a `main`), porque o PR foi mesclado com a verificação ainda rodando.

## Para o revisor

- Os `uses:` estão nas versões principais (`@v4`). Fixar por SHA fica para a Fase 41, junto com a proteção da `main`.
- A primeira execução na `main` grava a medição do pacote. Até lá, os PRs mostram só o tamanho atual.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TpSdmCvMp9hkqHxXnLjuub
