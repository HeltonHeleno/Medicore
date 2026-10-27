# Fase 13 — Integração com o Painel

- **Branch:** `feat/fase-13-integracao`
- **Plano:** `PLANO_EXECUCAO_CADASTROS.md`, tarefas 13.1 a 13.6

## Resumo

O Painel passa a ler o mesmo repositório dos cadastros. Agendar, concluir ou cancelar uma consulta, cadastrar ou inativar um paciente e mudar a escala de um médico atualizam o Painel na hora, sem recarregar, inclusive quando a mudança vem de outra aba. O visual continua o da Fase 7: só mudam os nomes e os números.

### Consultas de hoje (13.1)

- O card lê `useAgenda({ data: hojeNoFuso() })` (`ConsultaDetalhada`), em ordem de horário.
- O nome do paciente é um link para `/consultas/:id` (com "Voltar" para o Painel). Isso vale na tabela e na versão em lista do celular.
- Novo aviso "N consultas aguardando registro" (P13). Ele conta as pendências de qualquer dia e leva a `/consultas?status=pendentes`. Sem pendências, o aviso não aparece.

### Boas-vindas e KPIs (13.2)

- **Resumo de boas-vindas:** "{n} consultas hoje" vem do repositório. As canceladas não entram na conta. UTI e medicamentos continuam simulados.
- **Total de pacientes:** conta os pacientes ativos (27 nos dados de exemplo). A variação "12% em relação a ontem" continua simulada, porque ainda não existe histórico diário. Isso está registrado no Diário.
- **Médicos de plantão:** conta os médicos ativos que atendem no dia da semana de hoje, pelo fuso do hospital.
- Novo `services/painel.ts` (`indicadoresPainel`). O tipo `Kpis` ficou só com o que continua simulado: variação e casos de emergência.

### Linha do tempo de atividades (13.3)

- O card lê `listarAtividades({ limite: 4 })`. Uma ação nova (paciente cadastrado, consulta agendada, concluída, cancelada…) aparece no topo na hora.
- **Dados de exemplo de atividades (`data/seeds/atividades.ts`):**
  - antes desta fase a coleção começava vazia, e o card mostraria "Nenhuma atividade";
  - agora ela é semeada com as 20 atividades mais recentes do histórico das consultas de exemplo, com os mesmos nomes e horários que as outras telas mostram;
  - só entram eventos que já aconteceram.
- **Horário de cada atividade:**
  - atividade de hoje: só a hora;
  - atividade de ontem: "Ontem, 14:20";
  - atividade mais antiga: "06/11/2026 · 09:15".
- **Texto do card vazio:** passou a ser "Nenhuma atividade registrada ainda.", porque as atividades não são mais só de hoje.
- **Ajuste nos dados de exemplo de consultas:**
  - antes, o agendamento das consultas futuras podia cair exatamente em "agora", e a linha do tempo mostrava quatro itens no mesmo minuto;
  - agora o horário do agendamento recua um pouco, num valor derivado do id da consulta;
  - o sorteio não muda, então as consultas, os horários e as situações continuam os mesmos.

### Limpeza (13.4)

- Removidos `criarConsultasHoje`, `criarAtividadesHoje` e `hojeAs` de `data/mock.ts`.
- Removidos os tipos `ConsultaPainel` e `AtividadePainel`.
- Removidas as funções `getConsultasHoje` e `getAtividades` de `api.ts`.
- `npx tsc -b` e `npm run lint` terminam sem avisos.
- Alertas de emergência e Desempenho por departamento continuam simulados (backlog).

### Restaurar dados de exemplo (13.5)

- O botão fica na vitrine `/ui`, que só existe em desenvolvimento. Ele usa o estilo `contornoPerigo` e pede confirmação de perigo antes de agir ("Esta ação não pode ser desfeita.").
- **`services/demo.ts` (`restaurarDadosExemplo`):**
  - apaga as chaves `medicore:*`, mas preserva o tema;
  - semeia as 4 coleções e já as grava no storage, para que as outras abas recebam os mesmos dados em vez de semear por conta própria;
  - avisa todas as telas.

## Números

| Indicador | Fase 12 | Fase 13 |
|---|---|---|
| Testes | 346 (34 arquivos) | 352 (35 arquivos) |
| Cobertura de linhas (geral) | 94,0% | 94,1% |
| `services/` · `utils/` (linhas) | 98,3% · 98,5% | 98,3% · 98,5% |
| Pacote inicial (`index.js`) | 57 kB | 70 kB (21,5 kB gzip) |

**Por que o pacote inicial cresceu:** o Painel é a página inicial e agora importa o repositório, os serviços e os dados de exemplo. Antes, esse código só era carregado ao abrir Pacientes, Médicos ou Consultas. O aumento é esperado.

**Testes:**
- `dashboard.test.tsx` agora usa os dados de exemplo com relógio fixo (segunda, 09/11/2026, 11:30). Ele cobre:
  - agendar e cancelar consultas;
  - concluir uma pendência;
  - cadastrar e inativar pacientes;
  - mudar a escala de um médico;
  - os rótulos "Ontem" e de data;
  - o card vazio e o erro.
- O novo `demo.test.tsx` cobre a restauração dos dados de exemplo.

## Verificação

- **Duas abas (13.6.1), testadas no navegador:** com a aba A no Painel, a aba B agendou, concluiu e cancelou consultas. Em cada passo, a aba A mudou sozinha:

  | Passo na aba B | Linhas da tabela | Resumo | Aviso de pendências | Topo da linha do tempo |
  |---|---|---|---|---|
  | Início | 9 | 7 consultas hoje | 4 | — |
  | Agendou | 10 | 8 consultas hoje | 4 | "Consulta agendada: Ana Paula Silva com Dr. Paulo Mendes" |
  | Concluiu a das 10:30 | 10 | 8 consultas hoje | 3 | "Consulta concluída com Mariana Alves" |
  | Cancelou | 10 | 7 consultas hoje | 3 | "Consulta de Ana Paula Silva cancelada" |

  "Restaurar dados de exemplo" numa aba também atualizou a outra. No fim, as duas tinham dados idênticos no storage.
- **Comparação em 1600px (13.6.2):** o layout é igual ao de `referencia-fase7.png`. Mudam apenas:
  - nomes e números;
  - a faixa de demonstração da Fase 9, que desloca a página cerca de 28px;
  - a linha de aviso de pendências;
  - a altura do card de consultas, que segue a quantidade de consultas do dia.

  A comparação lado a lado está em `fase13-comparacao-1600.png`.
- **Acessibilidade:** o Painel e a vitrine foram verificados em 375, 768, 1280 e 1600px, nos temas claro e escuro. O axe não encontrou nenhuma violação, e nenhuma largura teve rolagem horizontal.

Capturas em `docs/capturas/`:
- `fase13-painel-claro-1600.png`
- `fase13-painel-escuro-1280.png`
- `fase13-comparacao-1600.png`
- `fase13-restaurar-dados.png`

## Observação para quem já usava a aplicação

Os dados que já estão gravados no navegador são mantidos. Neles, a coleção de atividades começou vazia na Fase 8, então a linha do tempo só mostra as ações feitas desde então. Para ver os dados de exemplo completos, use "Restaurar dados de exemplo" em `/ui`.
