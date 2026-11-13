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
- [ ] 👤 Primeira execução no GitHub: workflow aparece no PR, os cinco checks verdes e o comentário do pacote (22.1.1, 22.4.1)
- [ ] 👤 PR de teste com um teste quebrado de propósito fica vermelho e não pode ser publicado (22.1.6)
- [ ] 👤 Vercel: Deployment Checks com o check `verificacoes` (22.3.1)
- [ ] 👤 PR revisado e mesclado (22.F.3)

## Para o revisor

- Os `uses:` estão nas versões principais (`@v4`). Fixar por SHA fica para a Fase 41, junto com a proteção da `main`.
- A primeira execução na `main` grava a medição do pacote. Até lá, os PRs mostram só o tamanho atual.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TpSdmCvMp9hkqHxXnLjuub
