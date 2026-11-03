# Fase 17 — Gestão de leitos

- **Branch:** `feat/fase-17-leitos` (sobre a Fase 16)
- **Plano:** `PLANO_EXECUCAO_OPERACOES.md`, tarefas 17.0 a 17.14
- **Especificação:** `PLANO_OPERACOES_MEDICORE.md`, Fase 17 e processos L1–L9

## Resumo

Os processos L1 a L9 agora funcionam nas telas:

- **Mapa de leitos** (`/leitos`):
  - resumo por setor;
  - grade por setor e quarto;
  - filtros na URL;
  - busca de paciente;
  - ações rápidas;
  - painel de pedidos de leito.
- **Internar** (`/leitos/internar`): eletiva, transferência de outro hospital, pelo pedido de
  leito (L6) e "Internar novamente".
- **Internações** (`/leitos/internacoes`): ativas e encerradas, com filtros.
- **Detalhe da internação**: transferir, dar alta (com óbito), desfazer alta, editar e
  consultas no período.
- **Detalhe do leito**: situação, ocupante, bloqueio e ocupação nos últimos 30 dias.

## Números

| Indicador                                           | Fase 16               | Fase 17                                                                 |
| --------------------------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| Testes Vitest                                       | 589 (56)              | **610 (57)**                                                            |
| Testes Playwright                                   | 66                    | **86** (+8 rotas × 2 temas, diálogos abertos nos 2 temas, 2 de teclado) |
| Cobertura geral (linhas · ramos)                    | 95,3% · 87,0%         | **93,8% · 85,6%**                                                       |
| Cobertura `services/` · `utils/` · `components/ui/` | 97,5% · 97,8% · 95,4% | **97,9% · 97,8% · 95,4%**                                               |
| Telas de leitos (linhas)                            | —                     | páginas 88,5% · componentes 81,3%                                       |
| Pacote inicial (gzip)                               | 150,1 kB              | **151,3 kB** (+1,2 kB) · marcadores: 0                                  |
| Lighthouse desktop no mapa (Perf · A11y · BP · SEO) | —                     | **99 · 100 · 100 · 100** (LCP 0,9 s · TBT 20 ms · CLS 0,02)             |

**Pacote inicial (+1,2 kB):**

- **Na fase, dentro do limite:** são +1,2 kB, e a definição de pronto aceita até 5 kB por fase.
  Nenhum texto nem código do módulo entrou no pacote inicial (marcadores = 0).
- **De onde vem:** o roteador ganhou as 6 rotas de leitos (os títulos ficam em
  `t.rotasLeitos`). Cada página carregada sob demanda também acrescenta ao pacote inicial a
  lista dos arquivos que precisa pré-carregar. Hoje essa lista tem 79 nomes, cerca de 2,7 kB
  sem compressão. O CSS das telas novas soma +0,3 kB.
- **Acumulado desde a Etapa 0:** +5,6 kB, acima dos 5 kB. Para as Fases 18 a 20:
  - as rotas novas também vão acrescentar nomes a essa lista;
  - se o acumulado passar de 8 kB, a saída é carregar um módulo inteiro por um único `import()`,
    com as páginas dele juntas;
  - a D20 (indicadores do Painel sob demanda) continua obrigatória.

## O que foi feito

| Tarefa                 | Entrega                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17.1 Rotas             | `router.tsx`: `rotasLeitos` (`lazy`, com título e breadcrumb), `/leitos` saiu do `Placeholder`. `AbasModulo` Mapa · Internações (`pages/leitos/abas.ts`)                                                                                                                                                                                                                                                                                       |
| 17.2 Mapa              | `MapaLeitos`: `ResumoNumeros` por setor (com link para o filtro), livres, em higienização, bloqueados, reservados e "Previsão em 24 h". `GradeLeitos` com uma `section` por setor e a enfermaria agrupada por quarto; vira lista abaixo de 420px. Filtros na URL (`setor`, `situacao`, `perfil`, `isolamento`, `paciente`)                                                                                                                     |
| 17.2.4 Busca (M24)     | Destaca os leitos encontrados, rola até o primeiro e move o foco para ele. Sem resultado, mostra "não está internado em nenhum leito". Acha pelo nome civil ou pelo social                                                                                                                                                                                                                                                                     |
| 17.3 Ações rápidas     | `hooks/useAcoesLeito.tsx`: "Concluir" sem diálogo, com "Desfazer" por 10 s (volta com o mesmo `desde`); "Concluir todas do setor" com a lista dos leitos; bloquear e desbloquear; transferir; dar alta; desfazer alta; cancelar reserva. E-16 e E-05 viram um aviso, e a tela se atualiza sozinha                                                                                                                                              |
| 17.4 Pedidos           | `PainelSolicitacoes`: ordem por prioridade e espera; Reservar ou Trocar leito; Internar; Cancelar reserva; Cancelar pedido (com motivo); "Nova solicitação" (L9, com prioridade amarela só com justificativa). Pedido novo vindo de outra aba é anunciado em `aria-live`. No celular, o painel fica acima do mapa                                                                                                                              |
| 17.5 Internar          | `ComboboxPaciente` com o resumo (idade, convênio, alergias ou "não informadas") e as consultas dos próximos 7 dias. Origem e hospital de origem; precaução; setor desejado; `SeletorLeito` com o sugerido e a exceção justificada; médico (o departamento do setor primeiro); motivo; início (`datetime-local` no fuso do hospital); previsão de alta. Pré-preenchimento por `?pacienteId=`, `?leitoId=`, `?solicitacaoId=` e `?deInternacao=` |
| 17.5.8 Falhas          | E-11: o leito escolhido some da lista, a escolha é limpa e o erro aparece no leito, sem perder o resto. E-14 / R-X1: aviso com link para a internação ou o atendimento, e o botão desabilitado. O leito da URL que não serve é desmarcado com aviso; se só não combina por perfil ou isolamento, a tela oferece a exceção                                                                                                                      |
| 17.6 Lista             | `DataTable` com permanência, previsão de alta ("Vencida" e "Hoje") e precaução. Situação (ativas ou encerradas nos últimos 30 dias), setor, médico e alta prevista na URL. "Registro arquivado" aparece sem link. O "Voltar" preserva os filtros (`state.de`)                                                                                                                                                                                  |
| 17.7 Detalhe           | Dados com links (paciente, leito, médico); alergias em destaque ou "não informadas"; consultas agendadas durante a internação, com "Ver na agenda" (R-X8); linha do tempo dos eventos, com autor, motivo e justificativa                                                                                                                                                                                                                       |
| 17.8 Diálogos          | `DialogoTransferir` (E-11 recarrega os leitos), `DialogoAlta` (o óbito pede um segundo passo no mesmo diálogo, com o aviso da R-X7) e `DialogoMotivo` (desfazer alta, cancelar pedido). Depois das 6 h, o botão some e aparece o aviso do E-18, com "Internar novamente"                                                                                                                                                                       |
| 17.9 Editar            | Médico, previsão, precaução e motivo. Precaução sem isolamento no leito mostra "Transferir agora" ou pede justificativa. E-05: "Recarregar" ou "Continuar editando", como nos cadastros                                                                                                                                                                                                                                                        |
| 17.10 Detalhe do leito | Situação, há quanto tempo, ocupante (internação ou atendimento), reserva, bloqueio ("Liberação prevista vencida"), ações conforme a matriz e ocupação dos últimos 30 dias                                                                                                                                                                                                                                                                      |

## Testes

- **`leitos.paginas.test.tsx`** (21 testes, com o roteador real e os dados de exemplo; todos
  terminam em `esperarConsistente()`):
  - **mapa:** resumo, filtros na URL, busca que foca o leito, "não internado";
  - **higienização:** concluir e desfazer, E-16 de outra aba, "Concluir todas do setor" com
    um leito bloqueado por outra aba;
  - **pedidos:** pedido eletivo, reserva e cancelamento; menu do cartão (cancelar reserva e
    transferir);
  - **internar:** eletiva só com teclado no seletor; transferência externa sem hospital;
    exceção de perfil sem justificativa; E-11 por outra aba; R-X1; internação pelo pedido
    da emergência (encerra o atendimento);
  - **lista:** filtro de alta vencida e encerradas;
  - **detalhe:** transferir; alta, higienização e desfazer; E-18 depois de 6 h e "Internar
    novamente"; óbito com a segunda confirmação; editar com E-05; E-08;
  - **detalhe do leito:** bloquear e desbloquear; leito ocupado.
- **`e2e/acessibilidade.spec.ts`:** 8 rotas novas nos dois temas, os diálogos de alta e de
  transferência abertos e `/leitos` em 375px sem rolagem horizontal.
- **`e2e/teclado.spec.ts`:**
  - `SeletorLeito` (setas, Home, End, Espaço; o incompatível é focável, mas não escolhível);
  - ordem de Tab na grade (link do leito, menu, ação rápida, próximo leito).

## Verificação (17.13)

| Verificação                                  | Resultado                                                                                                                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 375, 768 e 1280px, claro e escuro (11 rotas) | sem rolagem horizontal, 0 violações axe e 0 erros no console nos 66 casos                                                                                                                                                 |
| Escala de cinza                              | situações e riscos legíveis pelo texto e pelo ícone (`docs/capturas/fase17-mapa-cinza-1280.png`)                                                                                                                          |
| Lighthouse desktop no mapa (130 leitos)      | 99 · 100 · 100 · 100                                                                                                                                                                                                      |
| 👤 Duas abas no navegador (17.13.3)          | **pendente, é seu:** internar no mesmo leito nas duas abas (a segunda recebe E-11) e concluir uma higienização numa aba enquanto a outra bloqueia o leito (E-16). Os dois casos estão cobertos nos testes com "outra aba" |

**Capturas** (`docs/capturas/`):

- `fase17-mapa-claro-1280.png`;
- `fase17-mapa-escuro-375.png`;
- `fase17-mapa-cinza-1280.png`;
- `fase17-internar-claro-1280.png`;
- `fase17-internacao-claro-1280.png`.

## Desvios e observações

| Tema                    | Plano                   | Feito                                                              | Por quê                                                                                           |
| ----------------------- | ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Óbito                   | Segunda confirmação     | Segundo passo dentro do mesmo diálogo                              | Evita abrir uma janela modal sobre outra (foco e leitor de tela)                                  |
| Aviso da alta           | "Desfazer" e "Ver mapa" | Só "Desfazer"                                                      | O aviso tem lugar para uma ação; o mapa está a um clique no menu                                  |
| Dispensações no detalhe | Seção na tela           | Fica para a Fase 19                                                | Depende das telas de farmácia (17.7.3: "preenchida na Fase 19")                                   |
| Histórico do leito      | —                       | `historicoLeito` devolve as internações já detalhadas (com o nome) | A tela precisa do nome do paciente                                                                |
| Leitos do mapa          | —                       | O setor Observação também aparece                                  | Os 130 leitos ficam visíveis; a ocupação do resumo continua só com os setores de internação (D17) |
| Campo de data e hora    | —                       | `paraCampoDataHora` e `deCampoDataHora` em `utils/datas.ts`        | O `datetime-local` usa o fuso do hospital, e não o do navegador                                   |

## Verificação de fechamento

- [x] `npm run lint` sem avisos; Prettier sem diferenças
- [x] `npm run build` sem erros
- [x] `npm run test:coverage`: 610 testes; metas atingidas
- [x] `npm run i18n:verificar` sem achados
- [x] `npm run pacote:medir`: 151,3 kB, marcadores 0
- [x] `npm run test:e2e`: 86 verdes
- [ ] 👤 Teste manual com duas abas (17.13.3)
- [ ] 👤 PR aberto, revisado e mesclado
