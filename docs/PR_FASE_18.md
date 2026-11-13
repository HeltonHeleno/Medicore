# Fase 18 — Emergência

- **Branch:** `feat/fase-18-emergencia` (sobre a Fase 17)
- **Plano:** `PLANO_EXECUCAO_OPERACOES.md`, tarefas 18.0 a 18.11
- **Especificação:** `PLANO_OPERACOES_MEDICORE.md`, Fase 18, processos E1–E10 e a matriz de ações do atendimento

## Resumo

Agora os processos E1 a E10 têm telas:

- **Fila** (`/emergencia`):
  - resumo por cor (aguardando e acima do prazo), espera média até o chamado nas últimas 24 h e atendimentos de hoje;
  - os cinco grupos da fila, com "Aguardando atendimento" na ordem do A7;
  - filtro "Mostrar só" (por cor ou grupo) gravado na URL;
  - botões Triar, Chamar e Ver;
  - anúncio de um vermelho ou laranja novo que chega de outra aba.
- **Alertas** (`/emergencia?aba=alertas`): a lista completa do A12, com o número de alertas na aba.
- **Registrar chegada** (`/emergencia/chegada`): paciente cadastrado ou sem identificação, modo de chegada, queixa com sugestões, chegada retroativa de até 2 h, emergência imediata (pede confirmação) e o E-14.
- **Triagem e retriagem** (`/emergencia/:id/triagem`): sinais vitais sinalizados por faixa etária; cor escolhida pelo profissional, com o tempo-alvo; prazo recalculado na hora; triagem anterior ao lado; justificativa obrigatória quando a cor fica menos grave.
- **Atendimento** (`/emergencia/:id`):
  - dados, triagens, evolução dos sinais em tabela e linha do tempo;
  - faixas de situação: leito reservado, aguardando leito e em observação;
  - todas as ações da matriz.
- **Histórico** (`/emergencia/historico`): atendimentos encerrados nos últimos 7 dias, com filtros de data, cor e desfecho na URL.

## Números

| Indicador                                           | Fase 17               | Fase 18                                                                                        |
| --------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| Testes Vitest                                       | 610 (57)              | **638 (58)**                                                                                   |
| Testes Playwright                                   | 86                    | **104** (+7 rotas × 2 temas, diálogo de desfecho e triagem com alerta × 2 temas, 2 de teclado) |
| Cobertura geral (linhas · ramos)                    | 93,8% · 85,6%         | **93,0% · 85,0%**                                                                              |
| Cobertura `services/` · `utils/` · `components/ui/` | 97,9% · 97,8% · 95,4% | **97,9% · 97,8% · 97,6%**                                                                      |
| Telas da emergência (linhas)                        | —                     | páginas 89,9% · componentes 79,6%                                                              |
| Pacote inicial (gzip)                               | 151,3 kB              | **152,2 kB** (+0,9 kB) · marcadores: 0                                                         |

**Pacote inicial (+0,9 kB):** vem das 5 rotas novas (títulos em `t.rotasEmergencia`) e de mais nomes na lista de pré-carga das páginas carregadas sob demanda. Nenhum texto nem código do módulo entrou no pacote inicial (marcadores = 0). O acumulado desde a Etapa 0 chega a **+6,5 kB**, ainda abaixo do teto de 8 kB definido na Fase 17. A Farmácia (Fase 19) acrescenta mais 9 rotas. Se o acumulado passar de 8 kB, carregar cada módulo com um único `import()`.

## O que foi feito

| Tarefa                   | Entrega                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 18.1 Rotas               | `rotasEmergencia` no `router.tsx` (`lazy`, com título e breadcrumb); `/emergencia` saiu do `Placeholder`. Abas Fila · Alertas · Histórico em `pages/emergencia/abas.ts`, com o número de alertas                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 18.2 Fila                | `ResumoFila` (cada cor leva ao filtro) e `ListaFila`. Cada linha mostra a cor, o número, o nome (ou a descrição provisória), a queixa, a espera, o prazo e a faixa "Acima do prazo (+N min)", que aparece sozinha quando o prazo passa (`useRelogio`). Abaixo de `sm`, cada linha vira um cartão. "Chamar" abre `DialogoChamar`, com os médicos da Emergência primeiro e o último escolhido nesta aba já marcado (`sessionStorage`, com try/catch). Um vermelho ou laranja novo é anunciado em `aria-live`                                                                                                                                            |
| 18.3 Chegada             | `RegistrarChegada`, com `useFormularioEntidade` sobre o `esquemaChegada`. Os nomes dos campos seguem o esquema, para que os erros caiam no campo certo. `?pacienteId=` vem preenchido. Para paciente internado ou com atendimento aberto (E-14), aparece um aviso com link e o botão fica desabilitado. Depois de salvar, vai para a triagem; na emergência imediata, volta para a fila                                                                                                                                                                                                                                                               |
| 18.4 Triagem             | `Triagem` com `CamposSinaisVitais`, que usa a idade do cadastro ou a aproximada. O grupo de cores mostra `BadgeRisco` e o tempo-alvo; o sistema não sugere cor. O prazo previsto é calculado pelo A7 e anunciado com `aria-live`. A tela pede confirmação para classificar sem sinais vitais e mostra o aviso de escopo. No E-05, recarrega a versão e mantém o que foi digitado; no E-16, volta ao atendimento                                                                                                                                                                                                                                       |
| 18.5 Detalhe             | `DetalheAtendimento`: cabeçalho com a cor e a situação, alergias (ou "não informadas"), faixa do provisório com "Identificar", faixa da situação, dados (prazo, chamado com o excesso, médico, encerramento), triagens com os sinais de atenção, evolução dos sinais em tabela (`caption` e cabeçalhos com `abbr`) e linha do tempo com o autor                                                                                                                                                                                                                                                                                                       |
| 18.6 Ações               | `acoes-atendimento.ts` aplica a matriz. `useAcoesAtendimento` trata o E-16 e o E-05 como aviso. Diálogos: `DialogoChamar`; `DialogoObservacao` (só leitos OBS, pelo novo serviço `leitosParaObservacao`); `DialogoPedirLeito` (o provisório é levado a identificar antes); `DialogoDesfecho` (só os desfechos permitidos, evasão desabilitada com o motivo antes de 30 min, óbito e evasão com segundo passo, aviso da R-E15); `DialogoVincular`; `DialogoReavaliacao` (se um sinal piora, sugere retriagem); `DialogoReabrir` (se o leito OBS original foi ocupado, escolhe outro). O aviso do encerramento tem "Desfazer", que reabre o atendimento |
| 18.6.7 Paciente novo     | `NovoPaciente` aceita `?sexo=` (propriedade `sexoInicial` no `FormPaciente`). A volta para `/emergencia/:id?pacienteId=` abre a confirmação do vínculo com o paciente já escolhido                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 18.7 Alertas e histórico | Aba de alertas com a prioridade, o local, o responsável, há quanto tempo e um link para o atendimento, o leito ou o setor. `Historico` com `DataTable`, filtros e paginação na URL; registro arquivado aparece sem link                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 18.8 Integração          | O pedido do E6 aparece na hora no painel do mapa (`COLECOES.leitos`). Internar pelo pedido e cancelar o pedido no mapa já estavam cobertos na Fase 17                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## Testes

- **`emergencia.paginas.test.tsx`** (28 testes, com o roteador real e os dados de exemplo; os fluxos que gravam terminam em `esperarConsistente()`):
  - **fila:** ordem e grupos; "Mostrar só" na URL; chamar lembrando o médico; chamar quem outra aba já chamou; anúncio vindo de outra aba; prazo que estoura com a tela aberta (`setInterval` falso);
  - **chegada:** identificada; sem identificação; emergência imediata; E-14;
  - **triagem:** com sinais e alerta; sem sinais; retriagem mais grave (o prazo adianta) e menos grave (justificativa; o prazo não adia); menos grave sem justificativa; criança (PAS pediátrica);
  - **atendimento:** E-08; observação e retomar; pedir leito, que aparece no mapa; provisório ao pedir leito; vincular na volta do cadastro; alta e reabertura pelo "Desfazer"; reabrir depois de 2 h (E-18); óbito; evasão desabilitada; alta a partir de "aguardando leito" (R-E15); sinais que pioram e sugerem retriagem;
  - **alertas e histórico:** "Sem triagem há 16 min"; filtros do histórico.
- **18.9.2:** o número E-0001 na virada do dia e as duas abas registrando ao mesmo tempo continuam cobertos em `fila.test.ts` e `emergencia.service.test.ts`, no serviço, que é onde a regra mora.
- **`e2e/acessibilidade.spec.ts`:** 7 rotas novas nos dois temas, o diálogo de desfecho aberto, a triagem com alerta, e a fila e o atendimento em 375 px.
- **`e2e/teclado.spec.ts`:**
  - fila: Tab passa pelo nome, Chamar, Ver e o próximo; o diálogo abre com Enter e Esc devolve o foco;
  - triagem: sinais vitais só com teclado; cor escolhida pelas setas.

## Verificação (18.10)

| Verificação                                   | Resultado                                                                                                                                                                                                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 375, 768 e 1280 px, claro e escuro (10 rotas) | 60 casos sem rolagem horizontal, 0 violações axe e 0 erros no console. **Achado corrigido:** em 375 px, a tabela de sinais rola na horizontal e o contêiner não recebia foco (`scrollable-region-focusable`). Agora é uma região com nome e `tabIndex=0` |
| Escala de cinza                               | cores legíveis pelo nome e pelo ícone (`docs/capturas/fase18-fila-cinza-1280.png`)                                                                                                                                                                       |
| Revisão visual                                | idade repetida na descrição provisória ("~40 anos… 40 anos") e título "Sinais vitais" duplicado na triagem, os dois corrigidos                                                                                                                           |
| 👤 Duas abas no navegador (18.10.3)           | **pendente, é seu:** uma chegada vermelha numa aba aparece e é anunciada na outra; chamar o mesmo atendimento nas duas faz a segunda receber o aviso. Os dois casos estão cobertos nos testes com "outra aba"                                            |
| 18.10.4 Fila aberta por 10 min                | coberto em teste (a faixa aparece sem recarregar); `TempoDecorrido` fica fora de `aria-live` e o anúncio só sai para atendimento novo                                                                                                                    |

**Capturas** (`docs/capturas/`): `fase18-fila-claro-1280.png`, `fase18-fila-escuro-375.png`, `fase18-fila-cinza-1280.png`, `fase18-triagem-claro-1280.png`, `fase18-atendimento-claro-1280.png`, `fase18-chegada-claro-1280.png`.

## Desvios e observações

| Tema                        | Plano                                   | Feito                                                            | Por quê                                                                             |
| --------------------------- | --------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Evolução dos sinais         | Tabela + gráfico simples no desktop     | Só a tabela                                                      | A tabela atende o leitor de tela e o celular; o gráfico fica para a 21.5, se couber |
| Dispensações no atendimento | Seção na tela                           | Fica para a Fase 19                                              | Depende das telas da farmácia (18.5.4: "preenchida na Fase 19")                     |
| `FormChegada`/`FormTriagem` | Componentes em `components/emergencia/` | Funções no próprio arquivo da página                             | Só uma tela usa cada formulário                                                     |
| Leitos OBS                  | `SeletorLeito` filtrado                 | Serviço novo `leitosParaObservacao(id)`                          | Funciona também para o provisório (idade aproximada) e para reabrir em outro leito  |
| Último médico escolhido     | "nesta aba"                             | `sessionStorage`, com try/catch                                  | É por aba; sem armazenamento, só não lembra                                         |
| `opcaoDoPaciente`           | —                                       | Saiu do `Internar` para `components/pacientes/opcao-paciente.ts` | A chegada e o vínculo usam a mesma função                                           |

## Verificação de fechamento

- [x] `npm run lint` sem avisos; Prettier sem diferenças
- [x] `npm run build` sem erros
- [x] `npm run test:coverage`: 638 testes; metas atingidas
- [x] `npm run i18n:verificar` sem achados
- [x] `npm run pacote:medir`: 152,2 kB, marcadores 0
- [x] `npm run test:e2e`: 104 verdes
- [ ] 👤 Teste manual com duas abas (18.10.3)
- [ ] 👤 PR aberto, revisado e mesclado

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TpSdmCvMp9hkqHxXnLjuub
