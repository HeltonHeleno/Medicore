# Fase 21 — Qualidade, testes e entrega

- **Branch:** `feat/fase-21-qualidade-operacoes` (sobre a `feat/fase-20-integracao-operacoes`)
- **Plano:** `PLANO_EXECUCAO_OPERACOES.md`, tarefas 21.0 a 21.7
- **Especificação:** `PLANO_OPERACOES_MEDICORE.md`, Fase 21, Estratégia de testes e Checklist final de aceite

## Resumo

A fase fecha os módulos operacionais para a versão 1.2.0.

- **Seis cenários de ponta a ponta novos (5 a 10)**, passando nas 3 execuções seguidas do `test:e2e`.
- **Acessibilidade:**
  - axe com os diálogos dos módulos abertos;
  - foco no 1º campo inválido **na ordem da tela** em todos os formulários;
  - roteiros NVDA ampliados.
- **Armazenamento:** o teste de carga da D15 mostrou que os tetos originais não cabiam (148% do limite). Os tetos foram revistos, e o pior caso agora ocupa 73%.
- **Documentação:**
  - README com os três módulos, as janelas de correção e o novo limite prático;
  - capturas novas;
  - `docs/VERIFICACAO_MANUAL.md` com os roteiros e as tabelas de revisão.

## Números

| Indicador                                           | Etapa 0 (linha de base) | Fase 20               | Fase 21                                       |
| --------------------------------------------------- | ----------------------- | --------------------- | --------------------------------------------- |
| Testes Vitest                                       | 353 (36)                | 667 (59)              | **672 (61)**                                  |
| Testes Playwright                                   | 66                      | 129                   | **139**                                       |
| Cobertura geral (linhas · ramos)                    | 94,2% · 85,8%           | 92,3% · 84,0%         | **92,3% · 84,0%**                             |
| Cobertura `services/` · `utils/` · `components/ui/` | 98,3% · 98,6% · —       | 97,8% · 97,8% · 97,6% | **97,8% · 97,8% · 97,6%**                     |
| Pacote inicial (gzip)                               | 145,7 kB                | 153,7 kB              | **153,6 kB** (−0,1 kB) · marcadores: 0        |
| Lighthouse desktop (Painel)                         | 99 · 100 · 100 · 100    | —                     | **99 · 100 · 100 · 100**                      |
| Armazenamento dos dados de exemplo                  | 73 KB (só cadastros)    | —                     | **950 KB** (com os módulos)                   |
| Primeira semeadura                                  | —                       | —                     | **95 ms** (nova) · **105 ms** (sobre a 1.1.0) |

O acumulado do pacote inicial desde a Etapa 0 é **+7,9 kB**, dentro do teto de 8 kB. A Fase 21 terminou 0,1 kB abaixo da Fase 20. O ajuste de foco dos formulários entrou primeiro no pacote inicial (+0,2 kB) e foi movido para `components/ui/form/foco.ts`, usado só pelos formulários, que são carregados sob demanda.

## O que foi feito

| Tarefa                  | Entrega                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 21.1.1 Ajudantes        | `e2e/fixtures.ts`: `ler` (espera a coleção ser semeada), `abrir`, `pacienteLivre`, `valorKpi`, `escolherPaciente`, `registrarChegadaSemIdentificacao` e `triar`                                                                                                                                                                                                                                                                                                                                                                                         |
| 21.1.2 Cenário 5        | Chegada sem identificação → triagem laranja → vincular → chamar → pedir leito na UTI → reservar no mapa → internar. O paciente aparece na busca do mapa ("Dia 1 de internação") e no Painel (UTI 23 de 30 e a linha do tempo)                                                                                                                                                                                                                                                                                                                           |
| 21.1.3 Cenário 6        | Alta → higienização (o KPI não muda) → concluir no mapa → "Leitos disponíveis" sobe 1 sem recarregar                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 21.1.4 Cenário 7        | Entrada de lote da ampicilina → dispensação para paciente alérgica à penicilina, com FEFO em 2 lotes, alerta justificado e quantidade alta → o estoque fica no mínimo e o Painel mostra +1 com estoque baixo → a devolução tira o medicamento do "baixo"                                                                                                                                                                                                                                                                                                |
| 21.1.5 Cenário 8        | Duas abas (a segunda sem o aviso entre abas): internar no mesmo leito (a segunda recebe E-11; um só paciente no leito) e dispensar o último estoque (a segunda recebe E-12; saldo 4, uma dispensação só)                                                                                                                                                                                                                                                                                                                                                |
| 21.1.6 Cenário 9        | Desfazer alta (o paciente volta ao leito), reabrir pelo "Desfazer" do aviso e estornar (o estoque volta). Numa aba com o relógio 25 h à frente, os três botões somem e o E-18 explica o prazo                                                                                                                                                                                                                                                                                                                                                           |
| 21.1.7 Cenário 10       | Consulta futura para paciente internado (com o aviso R-X8) → alta por óbito com a segunda confirmação → cadastro inativo ("Óbito em…"), consulta cancelada com "Óbito do paciente", sem as ações de internar e de chegada, e o paciente não aparece na chegada                                                                                                                                                                                                                                                                                          |
| 21.1.8                  | Os cenários 5 a 10 passaram 3 vezes seguidas (`--repeat-each=3`, 36 de 36); depois, o `test:e2e` inteiro rodou 3 vezes seguidas (ver Verificação)                                                                                                                                                                                                                                                                                                                                                                                                       |
| 21.2.1                  | Todas as rotas já estavam no `acessibilidade.spec.ts`. Entrou o teste "diálogos dos módulos abertos": chamar, pedir leito, sinais vitais, identificar, pedido eletivo, reservar, bloquear, devolver e estornar, nos dois temas. Em 375 px entraram estoque, dispensar e detalhe do paciente                                                                                                                                                                                                                                                             |
| 21.2.3                  | **Achado e corrigido:** depois de enviar com erros, o foco ia para o 1º erro **do esquema**, não da tela. No Internar, ia para "Motivo" em vez de "Paciente"; na Chegada, para "Queixa"; no Dispensar, ficava no botão. `useFormularioEntidade` e o Dispensar agora ordenam o resumo e o foco pela posição na tela (`naOrdemDaTela`), e `focarCampo` leva o foco à opção marcada (ou à primeira) quando o campo é um grupo. Teste novo no `teclado.spec.ts` (4 telas) e `foco.test.tsx`. O anúncio de rota já funcionava nas telas novas                |
| 21.2.4                  | Painel, fila e atendimento em escala de cinza: risco e situação legíveis pelo texto e pelo ícone (`fase21-*-cinza-1280.png`, além dos da 17 a 19)                                                                                                                                                                                                                                                                                                                                                                                                       |
| 21.2.5                  | `docs/VERIFICACAO_MANUAL.md`: roteiros NVDA do Painel, L1, E2 e F3; mensagens E-11 a E-18; revisão dos termos; testes com duas abas                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 21.3.1–21.3.3           | `i18n:verificar` sem achados. Varredura de 18 rotas atrás de "NaN", "undefined", hora em 12 h, inglês, data ISO e milhar sem separador: nada encontrado. O livro de controlados e as movimentações passaram a formatar quantidade e saldo com separador de milhar. Avisos de escopo presentes na triagem, no alerta de alergia, no controlado e no dispensar                                                                                                                                                                                            |
| 21.4.1–21.4.2           | `carga.operacoes.test.ts`: ver "Armazenamento" abaixo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 21.4.3                  | Primeira semeadura: 95 ms em instalação nova e 105 ms sobre uma instalação 1.1.0 (migração v2 + módulos). O teste da 1.1.0 passou a medir também                                                                                                                                                                                                                                                                                                                                                                                                        |
| 21.4.5                  | Lighthouse desktop: mapa 95 · 100 · 100 · 100; fila 94; atendimento 97; estoque 96; dispensar 95 (as outras três categorias com 100 em todas). Painel e pacientes: 99                                                                                                                                                                                                                                                                                                                                                                                   |
| 21.6.2 Uso no navegador | Script de ~10 min no servidor de desenvolvimento, com o relógio real: chegada, triagem, chamar, encerrar, alta, higienização, internar, dispensar, devolver e estornar em ciclos, reabrindo o Painel a cada ciclo (a A17 roda a cada abertura). **Achado e corrigido:** a alta de uma internação feita no mesmo minuto era recusada com "A alta não pode ser antes do início da internação". O campo "Data e hora" manda o minuto (10:30:00), e o início guardava os segundos (10:30:40). O `darAlta` passou a comparar no minuto, com teste no serviço |
| Testes instáveis        | Dois testes de página falhavam às vezes sob a carga do `test:coverage`. O "prazo estoura com a tela aberta" avançava o relógio falso antes de o efeito do `useRelogio` instalar o `setInterval`; agora espera os efeitos. A "busca de paciente no mapa" (130 cartões) passou a ter 5 s de espera. Depois disso, duas execuções seguidas do `test:coverage` passaram por inteiro                                                                                                                                                                         |
| 21.5                    | README (módulos, rotas, processos, regras, correções com prazo, integração com os cadastros, retenção, tetos e limite prático); capturas novas (`painel-*.png` atualizadas e `fase21-*`)                                                                                                                                                                                                                                                                                                                                                                |

## Armazenamento (21.4.1 e 21.4.2)

O cenário da D15 tem 600 pacientes, 2.000 consultas e cada coleção dos módulos no seu teto. Com os tetos originais, ele ocupou **7,4 MB, 148% do limite** de 5 MB. A especificação estimava 3,3 MB no pior caso, mas os itens reais são maiores que o estimado:

| Coleção      | Estimado | Medido (UTF-16) |
| ------------ | -------- | --------------- |
| Atendimento  | 1,5 KB   | 2,3 KB          |
| Dispensação  | 0,6 KB   | 1,2 KB          |
| Internação   | 1,2 KB   | 1,3 KB          |
| Movimentação | 0,4 KB   | 0,4 KB          |

A redução de retenção prevista no plano (atendimentos de 7 para 3 dias, movimentações de 60 para 30) não resolveria, porque o que estoura são os tetos. **Decisão, com o usuário:** baixar os tetos e manter as retenções em dias (as telas de "últimos 7 dias" não mudam). O teto só age no uso intenso e remove primeiro os itens fechados mais antigos, que já foram somados nos resumos.

| Coleção                   | Teto anterior | Teto novo |
| ------------------------- | ------------- | --------- |
| Internações               | 600           | 200       |
| Pedidos de leito          | 200           | 50        |
| Atendimentos              | 400           | 120       |
| Medicamentos (referência) | 500           | 150       |
| Lotes (referência)        | 1.000         | 350       |
| Movimentações             | 3.000         | 800       |
| Dispensações              | 1.000         | 200       |

**Resultado:** 3,67 MB, **73% do limite**.

| Tela                              | Tempo   |
| --------------------------------- | ------- |
| Fila                              | 2 ms    |
| Mapa                              | 5 ms    |
| Estoque                           | 4 ms    |
| Movimentações                     | 13 ms   |
| Indicadores do Painel             | 15 ms   |
| Primeira leitura do armazenamento | ≤ 13 ms |

Os dados de exemplo (950 KB) ficam abaixo de todos os tetos. O README registra o novo limite prático: 600 pacientes + 2.000 consultas com os módulos no teto. Só os cadastros continuam indo até 1.000 + 3.000.

## Verificação

| Verificação                                                   | Resultado                                                                                                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test:e2e` 3 vezes seguidas                                   | 139 de 139 nas 3 execuções seguidas (10,8 a 10,9 min cada), sem instabilidade                                                                              |
| axe                                                           | 0 violações em todas as rotas e nos diálogos, nos dois temas e em 375 px                                                                                   |
| Formatos e textos (18 rotas)                                  | Sem achados (ver 21.3)                                                                                                                                     |
| `verificarConsistencia()` depois de uso no navegador (21.6.2) | 0 violações das invariantes e 0 erros no console em ~10 min de uso (21 ciclos, 209 operações dos três módulos), depois da correção da alta no mesmo minuto |
| Checklist final de aceite                                     | Marcado na especificação. Fica pendente só o que é manual (NVDA) e o Encerramento (versão 1.2.0)                                                           |
| 👤 21.2.6 NVDA e 21.3.4 revisão de termos e mensagens         | **Pendentes, são seus:** roteiros e tabelas em `docs/VERIFICACAO_MANUAL.md`                                                                                |

**Capturas** (`docs/capturas/`):

- `fase21-mapa-claro-1440.png`, `fase21-mapa-escuro-1440.png`, `fase21-mapa-celular.png`
- `fase21-fila-claro-1440.png`, `fase21-fila-escuro-1440.png`, `fase21-fila-celular.png`
- `fase21-atendimento-claro-1440.png`
- `fase21-estoque-claro-1440.png`, `fase21-estoque-escuro-1440.png`
- `fase21-dispensar-claro-1440.png`
- `fase21-painel-cinza-1280.png`, `fase21-fila-cinza-1280.png`, `fase21-atendimento-cinza-1280.png`
- `painel-claro.png`, `painel-escuro.png`, `painel-celular.png` (atualizadas)

## Desvios e observações

| Tema                               | Plano                                                           | Feito                                                                                            | Por quê                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 21.4.2 Se não couber               | Reduzir a retenção (atendimentos 3 dias, movimentações 30 dias) | Tetos menores; retenções em dias iguais                                                          | Os tetos é que estouravam; decisão do usuário                                                                     |
| Medicamentos e lotes               | Teto                                                            | Volume de referência (a retenção não corta catálogo nem lote com saldo)                          | Cortar catálogo ou lote com saldo apagaria estoque real                                                           |
| 21.2.3                             | Revisar                                                         | Correção no `useFormularioEntidade` (vale para todos os formulários, inclusive os dos cadastros) | O foco seguia a ordem do esquema zod                                                                              |
| Resumo do mapa no celular (390 px) | —                                                               | Sem mudança                                                                                      | Os cartões do resumo ocupam duas colunas com folga à direita. É só visual: não há rolagem nem perda de informação |

## Verificação de fechamento

- [x] `npm run lint` sem avisos; Prettier sem diferenças
- [x] `npm run build` sem erros
- [x] `npm run test:coverage`: 672 testes; metas atingidas
- [x] `npm run i18n:verificar` sem achados
- [x] `npm run pacote:medir`: 153,6 kB, marcadores 0
- [x] `npm run test:e2e`: 139 verdes, 3 vezes seguidas
- [ ] 👤 NVDA (21.2.6) e revisão de termos e mensagens (21.3.4)
- [ ] 👤 PR aberto, revisado e mesclado (depois dos PRs das Fases 19 e 20)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TpSdmCvMp9hkqHxXnLjuub
