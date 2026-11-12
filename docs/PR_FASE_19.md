# Fase 19 — Farmácia

- **Branch:** `feat/fase-19-farmacia` (sobre a `main` com as Fases 15 a 18)
- **Plano:** `PLANO_EXECUCAO_OPERACOES.md`, tarefas 19.0 a 19.13
- **Especificação:** `PLANO_OPERACOES_MEDICORE.md`, Fase 19 e processos F1–F9

## Resumo

Os processos F1 a F9 agora funcionam nas telas:

- **Estoque** (`/farmacia`):
  - resumo (baixo, zerado, lotes vencendo e vencidos), cada número com link;
  - busca por nome, princípio ativo ou nome comercial;
  - filtros e ordenação na URL;
  - atalhos de entrada e dispensação em cada linha;
  - link para o livro de controlados.
- **Catálogo**:
  - novo e editar medicamento: E-02 com link para o existente; unidade travada depois da primeira movimentação; E-05;
  - detalhe com estoque, dados, lotes (ajuste, perda, bloqueio), últimas movimentações e inativar/reativar (E-17 lista os lotes).
- **Entrada de lote** (`/farmacia/entrada`): em unidades ou embalagens, com a conversão; validade vencida (E-13), curta (confirmação) e "Somar ao lote".
- **Dispensar** (`/farmacia/dispensar`):
  - destino, médico solicitante e alergias;
  - itens com FEFO em tempo real;
  - alerta de alergia, controlado e quantidade alta;
  - resumo antes de confirmar.
- **Detalhe da dispensação**: itens e lotes, alertas confirmados, devolução por item (F4), estorno (F8) e comprovante para impressão.
- **Movimentações**, **Vencimentos** (descarte em lote, F6) e **Livro de controlados** (M28, para impressão).
- **Ligações:** "Dispensar medicamento" e a seção de dispensações no detalhe da internação e do atendimento.

## Números

| Indicador | Fase 18 | Fase 19 |
| --- | --- | --- |
| Testes Vitest | 638 (58) | **663 (59)** |
| Testes Playwright | 104 | **129** (+11 rotas × 2 temas, alerta e resumo abertos × 2 temas, 1 de teclado) |
| Cobertura geral (linhas · ramos) | 93,0% · 85,0% | **92,3% · 84,0%** |
| Cobertura `services/` · `utils/` · `components/ui/` | 97,9% · 97,8% · 97,6% | **97,8% · 97,8% · 97,6%** |
| Telas da farmácia (linhas) | — | páginas 78,7% · componentes 93,7% |
| Pacote inicial (gzip) | 152,2 kB | **153,3 kB** (+1,1 kB) · marcadores: 0 |

**Pacote inicial (+1,1 kB).** O aumento vem de três fontes:

- as 10 rotas da farmácia, com os títulos em `t.rotasFarmacia`;
- mais nomes na lista de pré-carga;
- as classes `print:` do layout.

Os textos e o código do módulo continuam fora do pacote inicial (marcadores = 0). O título da rota do livro é "Controlados", porque o nome completo é um dos marcadores do D16.

O acumulado desde a Etapa 0 é **+7,6 kB**, perto do teto de 8 kB definido na Fase 17. A Fase 20 tem duas tarefas para isso:

- a D20 (indicadores do Painel sob demanda) é obrigatória;
- se as rotas da Fase 20 empurrarem o acumulado acima de 8 kB, a saída é carregar cada módulo com um único `import()`.

## O que foi feito

| Tarefa | Entrega |
| --- | --- |
| 19.1 Rotas | `rotasFarmacia` no `router.tsx`, com `lazy`, título e breadcrumb. `/farmacia` saiu do `Placeholder`. Abas Estoque · Movimentações · Vencimentos (`pages/farmacia/abas.ts`) |
| 19.2 Estoque | `TabelaEstoque`: nome, concentração, forma e lista de controlado; disponível com a unidade (e vencido/bloqueado à parte); mínimo; `BadgeEstoque` (OK, baixo, zerado, vencendo, vencido); próximo vencimento. O serviço ganhou `ordenarPor` (nome, disponível, vencimento) e `obterResumoEstoque` |
| 19.3 Catálogo | `FormMedicamento`: o controlado mostra o aviso da R-F7; a unidade travada vira campo somente leitura, com a explicação. `DetalheMedicamento`: lotes em tabela, com menu (ajuste, perda, bloquear/desbloquear); `DialogoAjusteLote` (E-12 no campo); bloqueio com motivo, sugestões e referência; inativar com motivo opcional e E-17 |
| 19.4 Entrada | `Entrada`: mostra disponível, mínimo e lotes do medicamento; `?medicamentoId=`; "Quantidade em" unidades ou embalagens ("3 × 20 = 60 comprimidos"); validade curta com confirmação; "Somar ao lote" quando número e validade coincidem |
| 19.5 Dispensar | `Dispensar` + `ItemDispensacao` + `validar-dispensacao.ts`:<br>• `ComboboxPaciente` só com internados ou em atendimento;<br>• destino ("Internado em UTI-07");<br>• médico sugerido (`destinoDetalhado`);<br>• alergias fixas no topo (ou "não informadas");<br>• prévia FEFO a cada mudança;<br>• alerta de alergia, controlado e quantidade alta;<br>• item repetido pede para unir;<br>• até 10 itens;<br>• resumo com os alertas confirmados e o aviso de escopo.<br>Erros: E-12 no item, E-15 no topo |
| 19.6 Detalhe e correções | `DetalheDispensacao`:<br>• devolução por item (quantidade até o saldo, motivo com sugestões);<br>• estorno com "Pode ser estornada até…";<br>• E-18 depois de 24 h;<br>• aviso quando já houve devolução;<br>• estornada aparece riscada;<br>• "Imprimir comprovante": as classes `print:` escondem menu, cabeçalho, banner e botões |
| 19.7 Movimentações | `DataTable` com quantidade com sinal, saldo, dispensação (com o paciente), motivo e autor. Filtros na URL: tipo, medicamento, período e `?pacienteId=` (com chip para remover) |
| 19.8 Vencimentos | Vencidos com seleção e vencendo em 60 dias. Descarte em lote com motivo; o termo é obrigatório quando há controlado na seleção |
| 19.9 Controlados | Medicamento controlado e período na URL; saldo inicial, entradas, saídas e saldo final; movimentações; versão para impressão |
| 19.10 Ligações | "Dispensar medicamento" na internação ativa e no atendimento aberto; o provisório identifica antes (E7). `SecaoDispensacoes` nos dois detalhes (`listarDispensacoesDoDestino`). A R-F12 já estava completa no serviço |

## Testes

- **`farmacia.paginas.test.tsx`** (25 testes, com o roteador real e os dados de exemplo; os fluxos que gravam terminam em `esperarConsistente()`):
  - **estoque:** resumo, filtro na URL, busca por nome comercial, ordenação;
  - **catálogo:** cadastrar; E-02 com link; unidade travada; ajuste acima do saldo (E-12) e perda; bloquear e desbloquear lote; inativar com saldo (E-17); E-08;
  - **entrada:** por embalagem; vencida e curta; somar ao lote;
  - **dispensar:** FEFO em 2 lotes; alergias não informadas; alergia sem e com justificativa; controlado e quantidade alta; E-12 vindo de outra aba; item repetido;
  - **detalhe:** devolução parcial, que bloqueia o estorno; estorno; E-18 depois de 24 h; saldo relido depois da devolução de outra aba;
  - **movimentações, vencimentos e controlados:** filtro; descarte em lote; termo de controlado; saldo final = inicial + entradas − saídas;
  - **ligações:** botão e seção no detalhe da internação.
- **19.5.9 e 19.6.5:** a devolução de lote vencido (que vira descarte) continua coberta no serviço (`farmacia.service.test.ts`). Pela tela, ela exige um lote que vença depois da dispensação.
- **`layout.test.tsx`:** a Farmácia deixou de ser placeholder, então o teste do drawer agora espera o título carregado sob demanda.
- **`e2e/acessibilidade.spec.ts`:** 11 rotas novas nos dois temas, o alerta de alergia e o resumo da dispensação abertos, e o estoque e o dispensar em 375 px.
- **`e2e/teclado.spec.ts`:** itens da dispensação só com teclado (medicamento, quantidade com setas e botões, adicionar e remover item).

## Verificação (19.12)

| Verificação | Resultado |
| --- | --- |
| 375, 768 e 1280 px, claro e escuro (12 rotas) | 72 casos sem rolagem horizontal, 0 violações axe e 0 erros no console |
| Achados corrigidos | (1) Em 375 px, o detalhe do medicamento rolava 197 px: o `sr-only` do cabeçalho de ações da tabela escapava do contêiner rolável. O contêiner ganhou `relative` (a tabela de sinais da emergência e o livro também). (2) axe `label-content-name-mismatch` no botão "Entrada de lote" da tabela: o nome acessível agora começa pelo texto visível. (3) axe `target-size` nas movimentações: dois links empilhados na mesma célula; a dispensação ganhou coluna própria. (4) "Quantidade (—)" antes de escolher o medicamento; quantidades sem separador de milhar |
| Escala de cinza | situações legíveis pelo texto e pelo ícone (`docs/capturas/fase19-estoque-cinza-1280.png`) |
| Prévia de impressão | o comprovante e o livro saem sem menu, cabeçalho, banner nem botões, com fundo branco |
| 👤 Duas abas (19.12.3) | **pendente, é seu:** dispensar o último estoque nas duas abas. A segunda recebe E-12 e o estoque nunca fica negativo (coberto em teste com "outra aba") |
| 19.12.4 Rastreabilidade | lote → dispensação (movimentações com link) → paciente e médico (detalhe da dispensação), conferida nos testes e nas telas |

**Capturas** (`docs/capturas/`):

- `fase19-estoque-claro-1280.png`
- `fase19-estoque-escuro-375.png`
- `fase19-estoque-cinza-1280.png`
- `fase19-dispensar-alerta-claro-1280.png`
- `fase19-medicamento-claro-1280.png`
- `fase19-vencimentos-claro-1280.png`
- `fase19-comprovante-impressao.png`
- `fase19-livro-impressao.png`

## Desvios e observações

| Tema | Plano | Feito | Por quê |
| --- | --- | --- | --- |
| Escolha do medicamento no item | Combobox | `Select` nativo com o disponível no texto da opção ("— 890 cápsulas disponíveis") | São ~45 medicamentos; o `select` nativo é acessível e funciona bem no celular |
| `FormEntrada`/`FormDispensacao` | Componentes separados | O formulário fica na página; o item (`ItemDispensacao`) e a validação (`validar-dispensacao.ts`) ficaram separados | Cada formulário é usado por uma tela só |
| Resumo do estoque | "vencendo, vencidos" | Contam **lotes** e levam a Vencimentos | É o que o serviço calcula e o que a pessoa precisa resolver |
| Título da rota do livro | "Livro de controlados" | "Controlados" no breadcrumb; o título da página continua completo | O nome completo é marcador do D16 e não pode estar no pacote inicial |
| Médico solicitante | "Só ativos" | Lista de médicos ativos (`useListaMedicos`) com o do destino preenchido | — |

## Verificação de fechamento

- [x] `npm run lint` sem avisos; Prettier sem diferenças
- [x] `npm run build` sem erros
- [x] `npm run test:coverage`: 663 testes; metas atingidas
- [x] `npm run i18n:verificar` sem achados
- [x] `npm run pacote:medir`: 153,3 kB, marcadores 0
- [x] `npm run test:e2e`: 129 verdes
- [ ] 👤 Teste manual com duas abas (19.12.3)
- [ ] 👤 PR aberto, revisado e mesclado

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TpSdmCvMp9hkqHxXnLjuub
