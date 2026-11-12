# Fase 20 — Integração com o Painel e os cadastros

- **Branch:** `feat/fase-20-integracao-operacoes` (sobre a `feat/fase-19-farmacia`)
- **Plano:** `PLANO_EXECUCAO_OPERACOES.md`, tarefas 20.0 a 20.13
- **Especificação:** `PLANO_OPERACOES_MEDICORE.md`, Fase 20, A12–A14, D20, R-X8

## Resumo

Nenhum número do Painel ligado a leitos, emergência ou farmácia é simulado agora, e os cadastros mostram a situação hospitalar.

- **Painel:** os indicadores vêm dos módulos, carregados sob demanda (D20), e se atualizam sem recarregar, inclusive quando a mudança vem de outra aba.
  - KPIs "Leitos disponíveis" e "Casos de emergência";
  - ocupação por setor;
  - tendência de internações (A14);
  - alertas (A12);
  - boas-vindas e insights (A13, R-F6);
  - linha do tempo com as atividades dos módulos.
- **Detalhe do paciente:** seção "Situação hospitalar", com links e com as ações Internar e Registrar chegada quando elas valem (R-X1). Seção "Histórico hospitalar" com as internações, os atendimentos dos últimos 7 dias e as dispensações dos últimos 30 dias; o registro arquivado aparece sem link.
- **Detalhe do médico:** internações sob responsabilidade e atendimentos em curso, com links.
- **Agendamento:** o aviso "Paciente internado em {leito}" aparece ao escolher um paciente internado (R-X8).
- **Limpeza:** saíram os dados simulados (`resumoDia`, `setoresLeitos`, `internacoes`, `insights`, `alertas`, `kpis.casosEmergencia`), as funções da API simulada, os hooks antigos, `utils/leitos.ts` com o seu teste e os tipos órfãos. "Desempenho por departamento" continua simulado, como previsto.

## Números

| Indicador | Fase 19 | Fase 20 |
| --- | --- | --- |
| Testes Vitest | 663 (59) | **667 (59)** |
| Testes Playwright | 129 | **129** |
| Cobertura geral (linhas · ramos) | 92,3% · 84,0% | **92,3% · 84,0%** |
| Cobertura `services/` · `utils/` · `components/ui/` | 97,8% · 97,8% · 97,6% | **97,8% · 97,8% · 97,6%** |
| Pacote inicial (gzip) | 153,3 kB | **153,7 kB** (+0,4 kB) · marcadores: 0 |

A contagem de testes quase não muda porque entraram 10 testes de integração com os cadastros e os do Painel em tempo real, e saíram os testes dos dados simulados (`leitos.test.ts` e parte do `api.test.ts`).

### Pacote inicial

O acumulado desde a Etapa 0 é **+8,0 kB**, exatamente no teto definido na Fase 17. Duas mudanças seguraram o crescimento.

**1. Indicadores sob demanda (D20).** `hooks/useIndicadoresOperacionais.ts` carrega `services/indicadores-operacionais` com `import()`. O Painel só leva no pacote inicial os nomes das coleções (`services/nomes-colecoes-operacoes.ts`), que ele precisa para recarregar quando elas mudam.

**2. Um pacote por módulo.** Com a D20 ligada, a medição foi a 154,2 kB (+8,5 kB acumulado). A causa era a lista de pré-carga do `index.html` (`__vite__mapDeps`), que tinha 130 nomes de arquivo. Os grupos `modulo-leitos`, `modulo-emergencia` e `modulo-farmacia` no `vite.config.ts` reúnem as páginas, os componentes e os hooks de ação de cada módulo, e a lista caiu para 36 nomes.
- **Primeira tentativa, desfeita:** o grupo também levava o serviço e os textos do módulo. Com a opção padrão `includeDependenciesRecursively`, ele puxava as dependências compartilhadas e acabava pré-carregado no pacote inicial (os 4 marcadores apareceram).
- **Configuração final:** só páginas, componentes e hooks de ação, com `includeDependenciesRecursively: false`. Os marcadores voltaram a 0.

Os textos dos detalhes de paciente e médico ficaram num arquivo próprio, `i18n/pt-BR/hospitalar.ts`, carregado com essas páginas. No `pt-BR.ts` eles somavam +0,4 kB ao pacote inicial.

**Margem para as próximas fases:** nenhuma. A Fase 21 não deve acrescentar nada ao pacote inicial. Se acrescentar, a saída é carregar cada módulo por um único `import()`.

## O que foi feito

| Tarefa | Entrega |
| --- | --- |
| 20.1 Indicadores sob demanda | `useIndicadoresOperacionais` e `useSerieInternacoes`. Os cards abrem com o esqueleto e se preenchem sem mudar de tamanho. Recarregam quando muda qualquer coleção dos módulos ou `pacientes` (os nomes dos alertas) |
| 20.2 Ocupação e leitos disponíveis | `OccupancyDonut` usa os leitos operacionais dos setores de internação, sem Observação: 72%, 86 de 119. Setores: UTI 22/30, Enfermaria 50/69 (1 leito bloqueado) e Apartamento 14/20. KPI "Leitos disponíveis" = leitos **livres**: 29, "de 119 leitos no total" |
| 20.3 Emergência | KPI "Casos de emergência" = atendimentos abertos (13), com o link "4 em alta prioridade" (vermelho e laranja) que leva aos alertas |
| 20.4 Alertas | `AlertList` mostra os 3 primeiros de A12, cada um com link para o atendimento, o leito ou o setor. "Ver todos" abre `/emergencia?aba=alertas` |
| 20.5 Boas-vindas e insights | "UTI tendendo a X%" (`previsaoUti`) e "N medicamentos com estoque baixo". Os insights são previsão da UTI, estoque baixo e altas previstas para hoje |
| 20.6 Tendência | `AdmissionChart` com a série de A14: semana, mês e ano (resumos mensais mais o mês corrente) |
| 20.7 Atividades | Os textos das atividades novas já vêm dos serviços (R-X6). O marcador da linha do tempo ganhou a cor do tipo (`cor-atividade.ts`): perigo (vermelho, óbito, estoque baixo, lote vencido), atenção (bloqueios, alta desfeita, reabertura, estorno) e primária (internação, transferência, alta, desfecho, entrada de lote). Ver Desvios |
| 20.8 Limpeza | Dados simulados, funções da API, hooks e tipos órfãos removidos. `npx tsc -b` e lint sem avisos |
| 20.9 Testes do Painel | `dashboard.test.tsx` com os dados de exemplo e o relógio fixo, mais o bloco "Painel em tempo real": chegada vermelha (+1 caso e +1 de alta prioridade, com a atividade na linha do tempo), dispensação até o mínimo (o insight passa de 3 para 4), alta (atividade na linha do tempo) e leito liberado por outra aba (evento `storage`) |
| 20.10 Detalhe do paciente | `SituacaoHospitalarPaciente`, que carrega `services/situacao-hospitalar` sob demanda. Mostra a internação ativa ou o atendimento aberto com "Ver internação" ou "Ver atendimento", e o pedido de leito em aberto. Sem situação e com o cadastro ativo, mostra Internar (escondido se já houver pedido de leito) e Registrar chegada na emergência. No histórico, o registro arquivado aparece sem link, com "registro arquivado". Serviço novo: `historicoHospitalar` |
| 20.11 Médico e agenda | `VinculosMedico` com as internações ativas sob responsabilidade (paciente, leito, desde) e os atendimentos em curso (paciente ou descrição provisória, número, chegada); serviço `vinculosDoMedico`. Aviso R-X8 no `FormConsulta` (`useSituacaoResumida`). A R-F12 já estava completa (Fase 18 antes da 19) |

## Comparação do Painel (20.12.1)

| | Fase 14 (`referencia-fase14.png`) | Fase 20 (`fase20-painel-claro-1600.png`) |
| --- | --- | --- |
| Layout em 1600 px | — | Igual: mesma grade, mesmas alturas de linha e mesmos cards |
| Total de pacientes | 27 | 117 (dados de exemplo ampliados na Fase 15, D13) |
| Leitos disponíveis | 34, "de 120 leitos no total" | **29**, "de 119 leitos no total": só os livres (A13); higienização, reserva e bloqueio não contam |
| Casos de emergência | 18, "Alta prioridade — ver alertas" | 13, "4 em alta prioridade" (link) |
| Ocupação | 72%; Ocupados 86 · Disponíveis 34 | 72%; Ocupados 86 · **Não ocupados** 33 (operacionais − ocupados) |
| Setores | 22/30 · 50/70 · 14/20 | 22/30 · 50/69 · 14/20 |
| Tendência | Seg…Dom (simulado) | Os 7 dias até hoje, com os dados de exemplo |
| Alertas | 3 fixos | 3 primeiros de A12, com link |
| Insights | "5 pacientes precisam de retorno hoje" | "3 altas previstas para hoje" |

Ajustes feitos para manter o layout:

- O detalhe do KPI de emergência quebrava em duas linhas e aumentava a linha dos KPIs. O texto ficou mais curto.
- "86 leitos" quebrava ao lado de "Não ocupados". A legenda ficou sem quebra de linha.

**Observação, fora do escopo:** em 1600 px, um nome longo na tabela "Consultas de hoje" ("Tatiana Santana Bezerra") empurra a coluna de situação para a borda do card. Isso vem dos dados, não desta fase. Fica anotado para a 21.2.

## Testes

- **`dashboard.test.tsx`:**
  - os KPIs, o `AlertList` (links e "Ver todos"), a ocupação ("72% dos leitos ocupados: 86 de 119", "33 leitos", Enfermaria 50 de 69), a tendência e os insights, todos a partir dos dados de exemplo;
  - o bloco 20.9.2, com a linha do tempo (cor do marcador por tipo).
- **`integracao.cadastros.test.tsx`** (10 testes):
  - **paciente:** internado (link, sem ações, internação "em curso" no histórico); em atendimento; sem situação (as ações levam a `/emergencia/chegada?pacienteId=` e `/leitos/internar?pacienteId=`); inativo sem ações; alta com a tela aberta (a situação some e o histórico mostra "alta melhorada"); registro arquivado sem link; dispensações dos últimos 30 dias;
  - **médico:** internação e atendimento em curso com links; médico sem vínculos;
  - **agendamento:** aviso para paciente internado; nenhum aviso para paciente livre.
- **`qualidade.test.tsx`** e **`api.test.ts`:** atualizados para a fonte nova.
- **`consultas.paginas.test.tsx`:** o teste do pré-preenchimento pela URL passou a esperar o nome do paciente com `waitFor`. Sob a carga do `test:coverage`, ele conferia o campo antes de o paciente carregar.

## Verificação

| Verificação | Resultado |
| --- | --- |
| Painel, paciente internado, em atendimento e livre, médico e agendamento com paciente internado: 375, 768 e 1280 px, claro e escuro | 36 casos sem rolagem horizontal, 0 violações axe e 0 erros no console |
| Painel em 1600 px × referência da Fase 14 | Igual, exceto números e nomes (tabela acima) |
| `test:e2e` | 129 verdes, incluindo o axe do Painel nos dois temas e em 375 px |
| 👤 20.12.2 duas abas | **Pendente, é seu.** Internar, dar alta, registrar chegada vermelha e dispensar numa aba e ver o Painel mudar na outra. Coberto em teste com "outra aba" |

**Capturas** (`docs/capturas/`):

- `fase20-painel-claro-1600.png`
- `fase20-painel-escuro-1600.png`
- `fase20-paciente-internado-claro-1280.png`
- `fase20-paciente-livre-escuro-375.png`
- `fase20-medico-claro-1280.png`
- `fase20-agendar-internado-claro-1280.png`

## Desvios e observações

| Tema | Plano | Feito | Por quê |
| --- | --- | --- | --- |
| 20.7 Ícones das atividades | Ícones por tipo | Marcador redondo com a cor do tipo (decorativa; o texto diz o que houve) | Ícones mudariam o visual do Painel, e a 20.12 pede o Painel igual à referência |
| Detalhe do KPI de emergência | "{n} de alta prioridade" | "{n} em alta prioridade" | O texto com "— ver alertas" quebrava em duas linhas em 1600 px e mudava a altura da linha dos KPIs |
| Fatia da rosca | "Disponíveis" | "Não ocupados" | A fatia é operacionais − ocupados (33). Chamá-la de "Disponíveis" contradiria o KPI, que agora conta só os livres (29) |
| Ação Internar no paciente | Esconder quando não vale (R-X1) | Também escondida quando há pedido de leito em aberto | Internar com pedido em aberto dá E-14 |
| Grupos de pacote por módulo | — | `vite.config.ts` com `modulo-*` e `includeDependenciesRecursively: false` | Lista de pré-carga de 130 para 36 nomes; sem isso, o acumulado passava do teto de 8 kB |

## Verificação de fechamento

- [x] `npm run lint` sem avisos; Prettier sem diferenças
- [x] `npm run build` sem erros
- [x] `npm run test:coverage`: 667 testes; metas atingidas
- [x] `npm run i18n:verificar` sem achados
- [x] `npm run pacote:medir`: 153,7 kB, marcadores 0
- [x] `npm run test:e2e`: 129 verdes
- [ ] 👤 Teste manual com duas abas (20.12.2)
- [ ] 👤 PR aberto, revisado e mesclado (depois do PR da Fase 19)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TpSdmCvMp9hkqHxXnLjuub
