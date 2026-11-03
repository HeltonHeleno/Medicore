# Fase 15 — Fundação dos módulos operacionais

- **Branch:** `feat/fase-15-fundacao-operacoes`
- **Plano:** `PLANO_EXECUCAO_OPERACOES.md`, tarefas 15.0 a 15.18
- **Especificação:** `PLANO_OPERACOES_MEDICORE.md`, Fase 15
- **Telas novas:** nenhuma (de propósito: as telas vêm nas Fases 16 a 19)

## Resumo

- **Regras de negócio dos três módulos prontas e testadas no serviço:**
  - Gestão de leitos: L1–L9;
  - Emergência: E1–E10;
  - Farmácia: F1–F9;
  - regras entre módulos: R-X1 a R-X9, incluindo o óbito (R-X7).
- **Invariantes INV-1 a INV-10** (A17), conferidas:
  - depois de cada operação nos testes de serviço;
  - num teste de 500 operações aleatórias, com 3 sementes;
  - no console, ao abrir o sistema em desenvolvimento.
- **Dados de exemplo dos módulos (D13, A16):**
  - 130 leitos, 86 internações ativas, 13 atendimentos abertos, 45 medicamentos e os lotes;
  - 90 pacientes novos (120 no total).
  - O Painel continua com 72% de ocupação e 3 medicamentos com estoque baixo.
- **Retenção e rotina diária (A15):**
  - resumos mensais, registros arquivados e `saldoArquivado`;
  - roda no máximo uma vez por dia, depois da primeira pintura.
- **O que vai para o pacote inicial:** só os textos que os cadastros e o Painel usam. Serviços,
  esquemas e textos dos módulos são carregados sob demanda.

## Números

| Indicador                                      | Etapa 0 (linha de base) | Fase 15                                            |
| ---------------------------------------------- | ----------------------- | -------------------------------------------------- |
| Testes Vitest                                  | 353 (36 arquivos)       | **557 (54 arquivos)**                              |
| Testes Playwright                              | 66                      | 66 (nenhuma tela nova)                             |
| Cobertura geral (linhas · ramos)               | 94,15% · 85,8%          | **95,2% · 86,6%**                                  |
| Cobertura `services/` · `utils/` (linhas)      | 98,31% · 98,63%         | **97,5% · 97,8%** (metas: 85% e 90%)               |
| Pacote inicial (gzip)                          | 145,7 kB                | **149,0 kB** (+3,3 kB, ver abaixo) · marcadores: 0 |
| Primeira semeadura dos módulos                 | —                       | **73 ms** (meta < 300 ms, M31)                     |
| Armazenamento dos dados de exemplo             | 73,1 KB                 | **~985 KB** (meta ~0,9 MB, D15)                    |
| Violações das invariantes nos dados de exemplo | —                       | **0**                                              |

### Pacote inicial: +3,3 kB (abaixo do limite de 5 kB, com justificativa)

O critério 15.18.5 pedia "sem crescimento". Nenhum código dos módulos entrou no pacote inicial
(marcadores = 0), mas três coisas que **precisam** estar lá cresceram:

| Origem                                                                     | Por que está no pacote inicial                                                         | ≈ gzip |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------ |
| Gerador dos 90 pacientes extras (`data/seeds/pacientes-extras.ts`)         | A semeadura de pacientes é síncrona e roda na primeira leitura (D13)                   | 1,5 kB |
| Textos das 14 atividades novas e das pendências em `pt-BR.ts`              | O Painel mostra a linha do tempo; os diálogos de cadastro mostram as pendências (E-17) | 0,9 kB |
| R-X2–R-X4, migração v2 e `lerMeta`/`gravarMeta`/`aoResetar` no repositório | Fazem parte dos serviços de pacientes e médicos, que já estavam no pacote              | 0,9 kB |

- **Recuperado no fechamento: 0,6 kB.** Os textos usados só pelos serviços dos módulos (erros
  E-11–E-16 e E-18, óbito, sinais, meses, descrições das invariantes) saíram de `pt-BR.ts` para
  `i18n/pt-BR/operacoes.ts`, carregado sob demanda.

## O que foi feito, por etapa

| Etapa                        | Entrega                                                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15.1 Configuração            | `config/setores.ts`; `config/sinais-vitais.ts` (faixas por idade, `SINALIZACAO_PEDIATRICA_ATIVA = true`); tempos-alvo, limites, janelas de correção, retenção e tetos em `config/limites.ts`; `utils/autor.ts` |
| 15.2 Textos (D16)            | `i18n/pt-BR/leitos.ts` (`tl`), `emergencia.ts` (`te`), `farmacia.ts` (`tf`) e `operacoes.ts` (`to`); atividades e pendências em `pt-BR.ts`                                                                     |
| 15.3 Tipos                   | `types/leito.ts`, `internacao.ts`, `emergencia.ts`, `farmacia.ts`, `resumo.ts`; 14 tipos novos de atividade; `obito?` no paciente                                                                              |
| 15.4 Esquemas                | `schemas/internacao.ts`, `emergencia.ts` (`esquemaTriagem(corAnterior?)`), `farmacia.ts`, carregados sob demanda                                                                                               |
| 15.5 Erros                   | E-11 a E-18 em `services/erros.ts`, com o campo certo no formulário                                                                                                                                            |
| 15.6 Algoritmos              | `utils/tempos.ts`, `sinais-vitais.ts`, `fila.ts` (A7, A8), `fefo.ts` (A9), `alergia.ts` (A10), `compatibilidade-leito.ts` (A11)                                                                                |
| 15.7 Repositórios            | 9 coleções em `services/colecoes-operacoes.ts`; `aoResetar`, `lerMeta` e `gravarMeta` no repositório; "Restaurar dados de exemplo" inclui as coleções novas                                                    |
| 15.8 Consistência            | `utils/consistencia.ts` (INV-1 a INV-10) e o ajudante `esperarConsistente()`                                                                                                                                   |
| 15.9–15.11 Serviços          | `services/leitos.ts`, `emergencia.ts`, `farmacia.ts` e `operacoes-comum.ts`                                                                                                                                    |
| 15.12 Regras R-X             | `pendencias-modulos.ts` (carregado sob demanda por pacientes e médicos), `situacao-hospitalar.ts`, óbito e reativação; `ListaPendencias` nos diálogos de inativar                                              |
| 15.13 Indicadores            | `services/indicadores-operacionais.ts` (A12, A13, A14 e resumo de estoque)                                                                                                                                     |
| 15.14 Retenção               | `services/retencao.ts` e `services/inicializacao-operacoes.ts` (carregado com `requestIdleCallback` no `main.tsx`)                                                                                             |
| 15.15 Dados de exemplo       | `data/seeds/pacientes-extras.ts`, `medicamentos.ts` e `operacoes.ts` (`gerarDadosOperacionais`, uma geração para as 9 coleções)                                                                                |
| 15.16 Hooks                  | `hooks/useRelogio.ts` e `hooks/useDadosOperacoes.ts`                                                                                                                                                           |
| 15.17 Invariantes aleatórias | `__tests__/invariantes.aleatorio.test.ts` (3 sementes × 500 operações)                                                                                                                                         |

## Matriz de regras

Legenda dos arquivos de teste: **LS** `leitos.service` · **ES** `emergencia.service` · **FS**
`farmacia.service` · **RM** `regras-modulos` · **IO** `indicadores-operacionais` · **RT**
`retencao` · **U** testes de `utils/` (nome do arquivo entre parênteses).
Em toda operação de serviço, o teste termina com `esperarConsistente()`.

### Gestão de leitos (R-L)

| Regra                                                          | Caso positivo                                                                                  | Caso negativo                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| R-L1 uma ocupação por leito, uma internação ativa por paciente | LS L1 "grava a internação…"                                                                    | LS "R-L1 / E-14: paciente já internado"; INV-1/INV-4 no teste aleatório |
| R-L2 só leito livre ou reservado para o mesmo pedido           | LS L6 "no leito reservado…"; U (compatibilidade) "reservado só serve para a mesma solicitação" | LS "R-L2 / E-11: leito ocupado ou reservado para outro pedido"          |
| R-L3 saída sempre vai para higienização                        | LS L2 e L3 (origem e leito em higienização)                                                    | LS L4 "pula o leito que mudou (E-16)"                                   |
| R-L4 bloquear só livre ou em higienização                      | LS L5 "bloqueia livre… e desbloqueia"                                                          | LS L5 "recusa ocupado (E-16)"                                           |
| R-L5 perfil adulto × pediátrico                                | LS R-L5 com justificativa registrada no evento; U 17 × 18 anos                                 | LS R-L5 sem justificativa                                               |
| R-L6 isolamento                                                | LS R-L6 com justificativa; U "precaução padrão prefere leito sem isolamento"                   | LS R-L6 sem justificativa; U "contato sem leito de isolamento"          |
| R-L7 transferência interna                                     | LS "L2: transfere…"                                                                            | LS "L2: destino ocupado (E-11), mesmo leito e versão antiga (E-05)"     |
| R-L8 alta prevista vencida                                     | LS "alta prevista hoje (3) e vencida (2)"                                                      | mesmo teste (as demais não aparecem)                                    |
| R-L9 reserva                                                   | LS "reservar, trocar a reserva e cancelar só a reserva"; IO alerta "Reserva há…"               | LS reserva de outro pedido recusada (R-L2)                              |
| R-L10 paciente e médico ativos                                 | LS L1                                                                                          | LS "R-L10 / E-03: médico inativo"                                       |
| R-L11 alta final                                               | LS L8 dentro da janela                                                                         | LS L8 "fora da janela (E-18)"                                           |
| R-L12 desfazer alta (6 h)                                      | LS "L8: desfaz a alta dentro de 6 h"                                                           | LS "L8: fora da janela (E-18) ou com o leito já ocupado (E-11)"         |
| R-L13 tipo de higienização                                     | LS L3 "isolamento pela precaução"; IO "Higienização atrasada"                                  | LS L2 precaução padrão → terminal                                       |
| R-L14 liberação prevista vencida                               | LS L5 (relógio passa da previsão → `liberacaoVencida`)                                         | LS L5 (antes da previsão)                                               |

### Emergência (R-E)

| Regra                                         | Caso positivo                                                       | Caso negativo                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| R-E1 número sequencial por dia                | ES "número do dia"; U (fila) virada da meia-noite                   | ES "números diferentes mesmo com outra aba registrando ao mesmo tempo"                              |
| R-E2 emergência imediata                      | ES "emergência imediata: vermelho, prazo na chegada"                | ES sem a opção: `aguardando_triagem`                                                                |
| R-E3 prazo e retriagem                        | ES "retriagem mais grave adianta o prazo"; U (fila)                 | ES "menos grave exige justificativa e não adia"                                                     |
| R-E4 ordem da fila                            | ES "grupos por status e ordem de A7"; U (fila) desempates           | ES "o prazo estoura com o relógio" (não muda a ordem entre cores)                                   |
| R-E5 sinais vitais                            | U (sinais-vitais) limites por faixa etária                          | ES "SpO₂ 101 e PAS ≤ PAD são erro"                                                                  |
| R-E6 retriagem acrescenta                     | ES "triagem: prazo, status e evento de → para"                      | ES "E-05 com versão antiga"                                                                         |
| R-E7 médico ativo, Emergência primeiro        | ES "médicos ativos para chamar, os da Emergência primeiro"          | ES E3 "médico inativo (E-03)"                                                                       |
| R-E8 desfechos encerram e liberam o leito OBS | ES "alta: encerra e libera o leito OBS"                             | ES "desfecho fora da matriz é E-16"                                                                 |
| R-E9 pedir leito exige cadastro               | ES E6 "pede leito (status anterior guardado)"                       | ES E6 "provisório é recusado"                                                                       |
| R-E10 um atendimento aberto por paciente      | ES E1 paciente cadastrado                                           | ES "E-14: paciente internado ou com atendimento aberto"; E7 "E-14 se o paciente já tem atendimento" |
| R-E11 evasão após 30 min                      | ES evasão aos 31 min                                                | ES evasão aos 29 min                                                                                |
| R-E12 observação                              | ES E4 "retomar mantém o leito"                                      | ES E4 "só em leito OBS de perfil compatível"                                                        |
| R-E13 limites de tempo                        | IO "alerta aparece… (sem triagem: 15 min)"                          | IO "…e some no limite"                                                                              |
| R-E14 reabrir (2 h)                           | ES "E9: reabre dentro de 2 h"                                       | ES "fora da janela é E-18"; "desfecho internação não reabre"                                        |
| R-E15 aguardando leito × outros desfechos     | ES "alta de quem aguarda leito cancela o pedido e libera a reserva" | LS "cancelar o pedido da emergência devolve o atendimento ao status anterior"                       |
| R-E16 reavaliação                             | ES "E10: reavaliação não muda cor nem prazo"; U `pioraParaAlerta`   | U `pioraParaAlerta` sem piora                                                                       |

### Farmácia (R-F)

| Regra                         | Caso positivo                                                                              | Caso negativo                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| R-F1 disponível sem vencidos  | FS "estoque: 3 baixo, 1 zerado"; IO "na virada do dia, o lote que vence sai do disponível" | U (fefo) vencido ontem fora                                                        |
| R-F2 lote único e validade    | FS F2 "registra o lote…"; mesma validade soma                                              | FS "vencido é E-13"; "outra validade é E-13"; validade curta pede confirmação      |
| R-F3 FEFO                     | FS "FEFO em 2 lotes, uma movimentação por lote"; U (fefo)                                  | U (fefo) pedido maior que o disponível                                             |
| R-F4 nunca negativo           | FS dispensação dentro do disponível                                                        | FS "E-12 acima do disponível"; F5 "saldo nunca negativo"; INV-8                    |
| R-F5 vencido não é dispensado | FS F6 "descarta os vencidos"                                                               | U (fefo) vencido fora; FS F6 "recusa lote válido"                                  |
| R-F6 situação do estoque      | FS e IO "3 baixo, 1 zerado, 5 vencendo, 2 vencidos"                                        | IO medicamentos OK fora do resumo                                                  |
| R-F7 controlado               | FS "R-F7 controlado… exige confirmação" (com confirmação, grava)                           | FS sem confirmação recusado; F5 "controlado exige motivo maior"                    |
| R-F8 alergia                  | FS "com justificativa, gravada"                                                            | FS "alergia sem justificativa é recusada"                                          |
| R-F9 movimentações imutáveis  | FS F4/F8 corrigem com movimento contrário; RT saldo arquivado (INV-7)                      | O serviço não tem função de editar ou apagar movimentação                          |
| R-F10 devolução               | FS "F4: devolve ao último lote usado"                                                      | FS "não passa do saldo do item"; "lote que venceu vira descarte"                   |
| R-F11 inativar medicamento    | FS "reativar"; inativar com saldo zero                                                     | FS "inativar exige saldo zero (E-17 com os lotes)"                                 |
| R-F12 destino da dispensação  | FS "destino internação"                                                                    | FS "E-15: o paciente não está internado nem em atendimento"; "E-15 depois da alta" |
| R-F13 lote bloqueado          | FS F9 desbloquear                                                                          | FS "lote bloqueado fica fora do FEFO"; "bloquear duas vezes é E-16"                |
| R-F14 quantidade alta         | FS "R-F14 quantidade alta exige confirmação" (com confirmação, grava)                      | FS sem confirmação recusado                                                        |
| R-F15 alergias não informadas | U (alergia) `alergiasNaoInformadas('')`                                                    | U (alergia) com alergias preenchidas                                               |
| R-F16 estorno (24 h)          | FS "F8: estorna em 24 h (tudo volta)"                                                      | FS "depois é E-18; com devolução não estorna"                                      |

### Entre módulos (R-X)

| Regra                             | Caso positivo                                                                                                               | Caso negativo                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| R-X1 internação × atendimento     | LS L6 internação pelo pedido do atendimento                                                                                 | LS "R-X1 / E-14: paciente em atendimento só pelo pedido do próprio atendimento"; ES E1 paciente internado      |
| R-X2 inativar paciente            | RM "liberado depois do desfecho"                                                                                            | RM "bloqueado com internação ativa (E-17 com o link)"; "bloqueado com atendimento aberto"                      |
| R-X3 excluir paciente             | RM "quem não teve nada, sim"                                                                                                | RM "quem teve atendimento não é excluído"                                                                      |
| R-X4 inativar médico              | RM "cardiologista sem pendências nos módulos"                                                                               | RM "responsável por internação ativa"; "com atendimento aberto"                                                |
| R-X5 nome social                  | LS "o mapa mostra o nome social; a busca acha pelos dois nomes"                                                             | mesmo teste (o nome civil nunca aparece no cartão)                                                             |
| R-X6 atividade na mesma transação | Os 14 tipos novos conferidos nos testes de serviço (tabela abaixo)                                                          | Transações desfeitas não gravam atividade (LS "E-11 com outra aba… nada é gravado"; RT "se falhar, nada muda") |
| R-X7 óbito                        | RM "alta por óbito: inativa, cancela só as consultas futuras"; "desfecho óbito na emergência"                               | RM "reabrir reativa" (desfazer óbito); consulta passada intacta                                                |
| R-X8 situação hospitalar          | RM "internado, em atendimento"; LS "consultas agendadas durante a internação"; `situacoesHospitalares` em `dados-operacoes` | RM "sem situação"                                                                                              |
| R-X9 autor                        | LS e ES: eventos com `autor: 'Usuário de demonstração'`                                                                     | — (sempre preenchido por `autorAtual()`)                                                                       |

### Atividades novas (R-X6)

| Tipo                                                                                                                      | Teste                      |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `paciente_internado`, `paciente_transferido`, `alta_registrada`, `alta_desfeita`, `leito_bloqueado`, `leito_desbloqueado` | LS                         |
| `emergencia_vermelho`, `emergencia_desfecho`, `atendimento_reaberto`                                                      | ES                         |
| `lote_recebido`, `estoque_baixo`, `lote_bloqueado`, `dispensacao_estornada`                                               | FS                         |
| `obito_registrado`                                                                                                        | RM                         |
| `lote_vencido`                                                                                                            | RT (uma vez por lote) e IO |

### Invariantes

| Invariante     | Teste próprio (`consistencia.test.ts`)                                    | Também conferida em                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INV-1 a INV-10 | Um retrato válido (nenhuma violação) e um retrato quebrado por invariante | Depois de cada operação nos testes de serviço; 3 × 500 operações aleatórias; dados de exemplo (`seeds.operacoes`); console em desenvolvimento (`dados-operacoes`) |

Verificação por mutação: com um defeito injetado em `liberarParaHigienizacao` (o leito não
liberava o `internacaoId`), o teste aleatório falhou na primeira semente, mostrando a semente,
a operação e a violação (INV-3).

## Decisões e desvios em relação ao plano

| Tema                                    | Plano                                                      | Feito                                                          | Por quê                                                                                                            |
| --------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Pacientes extras na instalação 1.1.0    | `ESQUEMA_ATUAL` continua 1                                 | **Migração v2** (`migracaoPacientesExtras`)                    | Quem já usa a 1.1.0 tem a coleção de pacientes gravada; sem migração, os 90 pacientes nunca entrariam (A16, RS-15) |
| Registro arquivado (A15)                | Tipo separado                                              | Flag `arquivado: true` na mesma coleção (`Arquivavel`)         | Referências continuam com o mesmo id; nada de buscar em dois lugares                                               |
| INV-1                                   | "atendimento em observação"                                | "atendimento **aberto** com `leitoObservacaoId`"               | "Retomar" mantém o leito (R-E12) com o status `em_atendimento`                                                     |
| Hooks de dados                          | `useDadosLeitos`, `useDadosEmergencia`, `useDadosFarmacia` | Um arquivo, `hooks/useDadosOperacoes.ts`                       | Mesmo padrão nos três; cada hook assina só as coleções do seu módulo                                               |
| Resumos mensais                         | "valores próximos dos atuais do gráfico"                   | ~70 internações por mês, com o mesmo desenho do gráfico        | Coerente com 120 leitos; o gráfico continua simulado até a Fase 20                                                 |
| Pacote inicial                          | Sem crescimento                                            | +3,3 kB                                                        | Ver a seção do pacote inicial                                                                                      |
| Busca no mapa                           | Só o nome exibido                                          | Nome civil **ou** social, mostrando o social                   | Igual à lista de pacientes (R-X5)                                                                                  |
| Responsáveis das internações de exemplo | —                                                          | Clínica geral, neurologia e ortopedia (pediatria para menores) | Os cardiologistas continuam inativáveis nos testes de ponta a ponta (cenário 3)                                    |
| Paginação                               | —                                                          | Botões com `gap-0.5` abaixo de 640px                           | Com 120 pacientes há 12 páginas, e a lista passava 2 px da tela em 375px (axe e2e)                                 |

**Para as próximas fases:**

- Os links das pendências (`/leitos/internacoes/:id`, `/emergencia/:id`) levam à página "não
  encontrada" até as Fases 17 e 18.
- O KPI "Leitos disponíveis" passa de 34 para os leitos **livres** (29 nos dados de exemplo)
  na Fase 20.
- `concluirHigienizacao` pula e informa os leitos que mudaram (base do aviso da 17.3.3).

## Verificação

- [x] `npm run lint` sem avisos
- [x] `npm run build` sem erros
- [x] `npm run test:coverage`: 557 testes; `services/` 97,5% e `utils/` 97,8% (linhas)
- [x] `npm run i18n:verificar`: nenhum texto fora de `src/i18n/`
- [x] `npm run test:e2e`: 66 testes verdes (inclui axe em 375px depois do ajuste da paginação)
- [x] `npm run pacote:medir`: 149,0 kB gzip, marcadores dos módulos 0
- [x] Painel continua com 72% de ocupação e 3 medicamentos com estoque baixo (fonte simulada,
      `dashboard.test.tsx`)
- [ ] 👤 PR aberto, revisado e mesclado
