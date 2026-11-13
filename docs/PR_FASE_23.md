# Fase 23 — Monitoramento de erros (BL-05)

- **Branch:** `feat/fase-23-monitoramento` (sobre a `fix/fase-22-pendencias`, que traz a correção do teste instável)
- **Plano:** `PLANO_EXECUCAO_MELHORIAS.md`, tarefas 23.0 a 23.F
- **Especificação:** `PLANO_MELHORIAS_MEDICORE.md`, BL-05 (processos BL-05.1 a BL-05.4) e D34

## Resumo

Os erros de produção passam a ir para o **Sentry**, sem dados pessoais. Sem a variável `VITE_SENTRY_DSN`, nada muda: o SDK nem é carregado.

| Arquivo                                                 | Papel                                                                                                                                                                                                                |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/monitoramento/index.ts` (pacote inicial, +0,4 kB)  | Decide o que capturar, liga a captura de erros não tratados (`error` e `unhandledrejection`) e carrega o SDK sob demanda: quando o navegador fica livre ou no primeiro erro                                          |
| `src/monitoramento/sentry.ts` (sob demanda, 53 kB gzip) | SDK `@sentry/browser` 11.10 com a coleta de dados pessoais desligada na fonte (`dataCollection`), 10% de desempenho, versão e ambiente. A integração `GlobalHandlers` sai, porque a captura global é a do `index.ts` |
| `src/monitoramento/limpeza.ts`                          | Tudo o que sai passa por aqui (`beforeSend`, `beforeBreadcrumb`, `beforeSendSpan`). Não depende do SDK, para a API reaproveitar na Fase 24                                                                           |

**Onde captura (23.1.2):**

- tela de erro de rota (`ErroDeRota`, E-09), que agora mostra o **código do erro para o suporte**;
- falhas ao carregar dados (`useAsync` e `useColecao`, que alimentam o `ErrorState`);
- erros não tratados.

Erros esperados ficam de fora: validação, conflito, concorrência, não encontrado e 404.

**O que a limpeza tira (23.1.3, D34):**

- texto entre aspas duplas (é assim que as mensagens citam nomes);
- CPF, CNS, e-mail, telefone, CEP e qualquer sequência de 5 dígitos ou mais;
- busca e âncora das URLs; ids nas rotas (`/pacientes/:id`);
- cabeçalhos, cookies, corpo e usuário;
- variáveis locais da pilha, `extra`, contextos e tags fora da lista permitida;
- migalhas de digitação; o texto dos cliques (o seletor pode ter um nome no `aria-label`);
- domínio externo (ViaCEP) sem o caminho.

Aspas simples ficam, porque o navegador as usa para nomes de propriedades (`reading 'nome'`).

**Mapas de código (23.1.5):** só com `SENTRY_AUTH_TOKEN` (build da Vercel). São gerados como `hidden`, enviados ao Sentry e apagados de `dist/` antes da publicação. Testado com um token falso: o envio falha no log, o build termina e nenhum `.map` nem `sourceMappingURL` fica em `dist/`.

## Números

| Indicador                | Fase 22  | Fase 23                                                                            |
| ------------------------ | -------- | ---------------------------------------------------------------------------------- |
| Testes Vitest            | 681 (62) | **717 (65)** (+36 do monitoramento)                                                |
| Testes Playwright        | 139      | **139** (6,9 min com 2 workers)                                                    |
| Cobertura geral (linhas) | 92,31%   | **92,2%** (`src/monitoramento`: 80,6%; o `sentry.ts` é testado com o SDK simulado) |
| Pacote inicial (gzip)    | 153,6 kB | **154,0 kB (+0,4 kB)** · marcadores: 0 · SDK fora do inicial                       |

## Verificação

- [x] `lint`, `format:check`, `i18n:verificar`, `tsc -b` e `build` sem erros
- [x] `test:coverage` (713 na hora) e `vitest run` (717) verdes; 139 e2e verdes
- [x] 23.1.4: evento com um paciente fictício inteiro em mensagem, exceção, pilha, migalhas, URL, usuário, contextos e tags; nenhum dos 19 dados pessoais aparece no que sai
- [x] **SDK real contra um Sentry falso local** (build com `VITE_SENTRY_DSN` apontando para `localhost`): erro global e rejeição com nome, CPF, e-mail e telefone provocados em `/pacientes/pac-ana-silva?busca=Ana Silva`. Chegaram 2 eventos com a pilha, `release: medicore@1.2.0`, `environment: demonstracao`, tags `origem` e `rota: /pacientes/:id`, e nenhum dos 8 textos procurados (nome, CPF nos dois formatos, e-mail, telefone, id, `busca=`), também nos envelopes de desempenho
- [x] Sem DSN: o SDK não carrega (teste) e o pacote do Sentry não entra no `index.html`
- [ ] 👤 Projeto `medicore-web` no Sentry e as variáveis na Vercel (0.3.3, 23.0.1)
- [ ] 👤 Erro provocado em homologação aparece no Sentry com a pilha legível (23.F.1)
- [ ] 👤 Regras de alerta: erro novo e pico (23.3.1)
- [ ] 👤 PR revisado e mesclado com o `verificacoes` verde

## Para o revisor

- **Limite conhecido:** um nome **fora de aspas** num texto livre não é reconhecido. As mensagens do sistema citam nomes entre aspas, e os erros esperados (cujos textos citam pacientes) nem são enviados. Se surgir um caso, a correção é na mensagem.
- **23.2.1** fica para a 24.3.6: a limpeza já está pronta e sem dependência do SDK, mas o módulo de captura da API só existe com a API.
- O `beforeSendTransaction` foi trocado por `beforeSendSpan`, porque no SDK 11 o envio de spans é contínuo e o `beforeSendTransaction` é ignorado.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TpSdmCvMp9hkqHxXnLjuub
