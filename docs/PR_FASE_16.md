# Fase 16 — Componentes compartilhados

- **Branch:** `feat/fase-16-componentes-operacoes` (depois da Fase 15 mesclada)
- **Plano:** `PLANO_EXECUCAO_OPERACOES.md`, tarefas 16.0 a 16.13
- **Especificação:** `PLANO_OPERACOES_MEDICORE.md`, Fase 16 e Acessibilidade específica dos módulos
- **Telas novas:** só a seção "Módulos operacionais" da vitrine `/ui` (desenvolvimento)

## Resumo

- **Tokens de cor:**
  - 5 cores de risco, cada uma com fundo, texto e borda;
  - 5 situações de leito, cada uma com fundo suave e texto, ícone e borda;
  - temas claro e escuro, todos os pares AA (tabela abaixo).
- **6 componentes gerais:**
  - `AbasModulo`, `ResumoNumeros`, `TempoDecorrido` e `CampoQuantidade`;
  - `LinhaDoTempo` genérica, que a `LinhaDoTempoConsulta` passou a usar;
  - `ComboboxPaciente`, extraído do `FormConsulta`.
- **7 componentes dos módulos:** `BadgeRisco`, `BadgeLeito`, `BadgeEstoque`, `CartaoLeito`,
  `SeletorLeito`, `CamposSinaisVitais` e `AlertaAlergia`.
- **Vitrine:** a seção "Módulos operacionais" tem todos os estados. Teve 0 violações do axe nos
  dois temas, em 375, 768 e 1280px, sem rolagem horizontal.
- **Agendamento sem mudança:** o `FormConsulta` usa o `ComboboxPaciente` e o `ResumoPaciente`,
  e os testes da Fase 12 continuam verdes.

## Números

| Indicador                           | Fase 15       | Fase 16                                        |
| ----------------------------------- | ------------- | ---------------------------------------------- |
| Testes Vitest                       | 557 (54)      | **589 (56)**                                   |
| Testes Playwright                   | 66            | 66                                             |
| Cobertura geral (linhas · ramos)    | 95,2% · 86,6% | **95,3% · 87,0%**                              |
| Cobertura `components/ui/` (linhas) | —             | **95,4%** (meta 70%)                           |
| Componentes dos módulos (linhas)    | —             | leitos 97,7% · emergência 100% · farmácia 100% |
| Pacote inicial (gzip)               | 149,0 kB      | **150,1 kB** (+1,1 kB) · marcadores: 0         |

**Pacote inicial (+1,1 kB):**

- **De onde vem:** quase tudo é CSS (+1,0 kB). O Tailwind gera um único arquivo de estilos
  para todas as páginas, e ele inclui os 50 tokens novos e as classes dos componentes.
- **JS:** subiu 0,1 kB, com os textos gerais do `CampoQuantidade`, do `TempoDecorrido` e do
  `ResumoPaciente`.
- **Fora do pacote:** os textos dos módulos e da vitrine continuam fora. O build de produção
  não contém "Módulos operacionais" nem "Higienização atrasada".
- **Em relação à Etapa 0:** +4,4 kB.
- **Atenção na Fase 20:** os indicadores do Painel precisam ficar sob demanda (D20), para não
  passar dos 5 kB acima da linha de base.

## 16.1 Contraste dos tokens

O fundo de cada selo de risco é comparado com o texto dele e com o card. Nos leitos, o texto
também serve de ícone e de borda, então é comparado com o fundo suave e com o card. A meta é
4,5:1 para texto e 3:1 para borda e ícone.

| Token                 | Claro: texto/fundo | Claro: fundo ou texto × card | Escuro: texto/fundo | Escuro: × card |
| --------------------- | -----------------: | ---------------------------: | ------------------: | -------------: |
| Risco vermelho        |               6,54 |                         6,54 |                6,78 |           5,87 |
| Risco laranja         |               5,57 |                         5,57 |                8,57 |           7,57 |
| Risco amarelo         |               9,96 |            1,68 → borda 5,07 |               11,85 |          10,73 |
| Risco verde           |               5,38 |                         5,38 |                7,63 |           8,46 |
| Risco azul            |               6,79 |                         6,79 |                7,25 |           6,90 |
| Leito livre           |               6,50 |                         7,43 |                8,04 |          10,29 |
| Leito ocupado         |               7,24 |                         8,99 |                7,25 |           8,64 |
| Leito reservado       |               6,70 |                         8,20 |                7,80 |           8,67 |
| Leito em higienização |               6,07 |                         6,80 |                8,51 |          10,16 |
| Leito bloqueado       |               6,51 |                         7,73 |                7,25 |           8,80 |

- **Amarelo no tema claro:** é a única cor que não chega a 3:1 contra o card (1,68). Por isso o
  selo tem a borda própria `--color-borda-risco-amarelo` (#8a6a00, 5,07:1). O nome da cor por
  extenso e o ícone continuam sendo a informação principal.
- **Escala de cinza:** cada cor de risco tem um ícone de forma diferente:
  - vermelho: sirene;
  - laranja: triângulo;
  - amarelo: círculo com exclamação;
  - verde: círculo com ponto;
  - azul: círculo com traço.

  As situações de leito e de estoque também têm ícone próprio. Captura:
  `docs/capturas/fase16-vitrine-cinza-1280.png`.

## Componentes

| Componente                   | Onde                     | Destaques de acessibilidade                                                                                                                                                                                                                                             | Testes                                        |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `AbasModulo`                 | `components/ui/`         | Links com `aria-current="page"` (não é `tablist`). Vence a aba de caminho mais longo; a query desempata. Rola na horizontal sem alargar a página                                                                                                                        | URL atual, query, subpáginas                  |
| `ResumoNumeros`              | `components/ui/`         | Lista com nome acessível; cada número pode ser link para o filtro                                                                                                                                                                                                       | com e sem link, destaque                      |
| `TempoDecorrido`             | `components/ui/`         | `<time dateTime>`; recalcula pelo `useRelogio`, sempre a partir do instante gravado (RS-14); **fora de `aria-live`**; prazo vencido destacado e lido como "até 10:28, passou 15 min"                                                                                    | relógio falso, prazo estourando               |
| `CampoQuantidade`            | `components/ui/form/`    | Só inteiros (D11). Botões − e + com nome próprio e `aria-controls`, desabilitados nos limites; setas do teclado no campo                                                                                                                                                | botões, limites, digitação, decimal           |
| `LinhaDoTempo`               | `components/ui/`         | Lista ordenada com data, hora e autor (R-X9). `LinhaDoTempoConsulta` passou a usá-la, sem mudança visual                                                                                                                                                                | ordem, autor; testes da Fase 12               |
| `ComboboxPaciente`           | `components/pacientes/`  | Só ativos. Filtro "internados ou em atendimento" e etiqueta ("Internado em UTI-07"), que fazem parte do nome da opção. A situação hospitalar é carregada sob demanda e relida quando os dados mudam                                                                     | teclado, inativos, filtro, alta muda o filtro |
| `ResumoPaciente`             | `components/pacientes/`  | Alergias em destaque; "Alergias não informadas" quando pedido (R-F15)                                                                                                                                                                                                   | com e sem aviso                               |
| `BadgeRisco`                 | `components/emergencia/` | Cor, ícone e nome por extenso ("Laranja — muito urgente"); variantes "até 10 min" e curta                                                                                                                                                                               | as 5 cores e as 3 variantes                   |
| `BadgeLeito`, `BadgeEstoque` | `leitos/`, `farmacia/`   | Texto, ícone e cor                                                                                                                                                                                                                                                      | todas as situações                            |
| `CartaoLeito`                | `components/leitos/`     | O código é um link com nome completo ("UTI-03, Em higienização, há 40 min"). A ação rápida é um botão separado ("Concluir higienização do leito UTI-03"), e as demais ficam no menu, conforme a matriz. Mostra os destaques de R-L9, R-L13 e R-L14. Memorizado (`memo`) | nome por situação, destaques, matriz          |
| `SeletorLeito`               | `components/leitos/`     | Grupo de rádio no padrão do `SeletorHorario` (setas, Home e End). Agrupado por setor, com o sugerido primeiro. Os incompatíveis ficam focáveis e com o motivo lido. "Usar mesmo assim" libera só as exceções de perfil e isolamento, com justificativa (R-L5, R-L6)     | só teclado, exceção, vazio                    |
| `CamposSinaisVitais`         | `components/emergencia/` | Rótulo com unidade e faixa válida na dica. Fora da faixa é erro; na faixa de alerta da idade (D18), aparece o texto "Atenção…" ligado ao campo, sem ser erro. Sem idade, usa a faixa de adulto e avisa                                                                  | faixa válida, alerta, idade, texto inválido   |
| `AlertaAlergia`              | `components/farmacia/`   | Só a faixa do alerta é `role="alert"`, com texto fixo, então é anunciada **uma vez**. "Ciente" e justificativa ficam fora da região                                                                                                                                     | anúncio único, justificativa                  |

Os ajudantes sem interface ficaram em arquivos próprios (`ui/abas.ts`, `leitos/acoes-leito.ts`,
`leitos/estilos-leito.ts`, `emergencia/sinais.ts`), porque o lint pede que arquivos de componente
exportem só componentes.

## Verificação (16.12)

| Verificação                       | Como                                                                                                                 | Resultado                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 375, 768 e 1280px, claro e escuro | Script Playwright no servidor de desenvolvimento (`/ui` não existe no build)                                         | `scrollWidth` igual à largura nos 6 casos                       |
| axe nos dois temas                | Mesmas regras do `e2e/acessibilidade.spec.ts` (WCAG 2.2 AA + boas práticas)                                          | **0 violações** nos 6 casos; 0 erros no console                 |
| Só teclado                        | Testes com `userEvent`: `SeletorLeito` (setas, Home, End, Espaço), `CampoQuantidade`, `ComboboxPaciente` (↓ e Enter) | verde                                                           |
| Escala de cinza                   | Captura com `filter: grayscale(1)`                                                                                   | riscos, situações e selos distinguíveis pelo texto e pelo ícone |

**Capturas** (`docs/capturas/`):

- `fase16-vitrine-claro-1280.png`;
- `fase16-vitrine-escuro-375.png`;
- `fase16-vitrine-cinza-1280.png`.

**Achados da revisão visual, corrigidos antes do fechamento:**

- **Ícone do vermelho:** o octógono parecia o círculo do amarelo em escala de cinza, e foi
  trocado pela sirene.
- **Concordância:** o alerta dizia "corresponde ao classe". Agora o texto concorda com cada
  campo: "ao princípio ativo", "à classe" e "ao nome".
- **Borda de "atenção":** nos sinais vitais, a borda ficava igual à de erro, porque neste tema
  a cor de aviso é vinho. A borda foi removida; o aviso continua em texto, com ícone.

## Desvios em relação ao plano

| Tema               | Plano                                | Feito                                                                          | Por quê                                                                                   |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Arquivo da vitrine | `pages/vitrine/VitrineOperacoes.tsx` | Igual, com os textos em `i18n/pt-BR/vitrine-operacoes.ts`                      | Os textos da vitrine não vão para o `pt-BR.ts` (pacote inicial)                           |
| Resumo do paciente | Dentro do `ComboboxPaciente`         | Componente separado, `ResumoPaciente`, no mesmo arquivo                        | O agendamento mostra o resumo fora do campo; os módulos ligam o aviso de "não informadas" |
| Sinais vitais      | —                                    | Controlado por textos (aceita vírgula) e com conferência local da faixa válida | Mostra o erro na hora; a mensagem é a mesma do esquema                                    |
| axe da vitrine     | Ponta a ponta                        | Script com o mesmo conjunto de regras                                          | O e2e roda contra o build de produção, onde `/ui` não existe                              |
| Pacote             | ≤ 5 kB                               | +1,1 kB (+4,4 kB desde a Etapa 0)                                              | Ver Números                                                                               |

## Verificação de fechamento

- [x] `npm run lint` sem avisos; Prettier sem diferenças
- [x] `npm run build` sem erros
- [x] `npm run test:coverage`: 589 testes; `components/ui/` 95,4%
- [x] `npm run i18n:verificar` sem achados
- [x] `npm run pacote:medir`: 150,1 kB, marcadores 0
- [x] `npm run test:e2e`: 66 verdes
- [ ] 👤 PR aberto, revisado e mesclado
