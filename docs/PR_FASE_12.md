# Fase 12 — Cadastro e agenda de Consultas

- **Branch:** `feat/fase-12-consultas`
- **Plano:** `PLANO_EXECUCAO_CADASTROS.md`, tarefas 12.1 a 12.10

## Resumo

Os processos P9 a P13 funcionam de ponta a ponta. A agenda é navegável pela URL, e nenhuma combinação permite conflito de médico ou de paciente, nem com duas abas abertas. As 4 telas são carregadas sob demanda. "Ver agenda" e "Ver todas", no Painel, já abrem a agenda real.

### Agenda (`/consultas`, D7)

- Data por extenso, botões ‹ Hoje › e seletor de data no fuso do hospital (`?data=`).
- Período: Dia, Próximas ou Todas as datas. "Pendentes de registro" e o filtro por paciente mostram todas as datas.
- Filtros de médico, departamento, situação e "Pendentes de registro", todos guardados na URL. O filtro de paciente aparece como etiqueta removível.
- Resumo do período: total, agendadas, concluídas, canceladas, faltas e pendentes.
- Lista por horário ou por médico. Cada item mostra:
  - hora de início e de fim, e o paciente (nome de exibição);
  - ícone de alergia, médico, departamento, tipo e situação;
  - a faixa "Aguardando registro" (R-C7), quando a consulta já passou sem registro.
- Ações rápidas Concluir, Faltou e Cancelar. Antes do início, Concluir e Faltou ficam desabilitadas com a dica "Disponível a partir das HH:mm".
- Baixa em lote (P13): com "Pendentes de registro", dá para marcar várias consultas como concluídas ou como falta numa única transação.

### Agendar (`/consultas/nova`, P9)

- Pré-preenchimento por `?pacienteId=`, `?medicoId=` e `?data=`.
- Escolha do paciente:
  - busca com sugestões entre os pacientes ativos;
  - resumo com idade e convênio, e alerta de alergias;
  - "Cadastrar novo paciente", que volta para cá com o novo paciente já selecionado.
- Escolha do médico:
  - o departamento serve como filtro opcional;
  - só aparecem médicos ativos, cada um com os dias de atendimento ("Dr. Paulo Mendes — Seg a Sex · 08:00–17:00").
- Data:
  - se o médico não atende no dia, aparece um aviso ("não atende aos sábados");
  - um botão leva ao próximo dia de atendimento.
- A duração assume a padrão do médico. O tipo sugere "Retorno" quando o paciente teve consulta concluída com o mesmo médico nos últimos 30 dias.
- `SeletorHorario`:
  - grupo de rádio acessível: as setas, Home e End movem o foco, e Espaço ou Enter escolhem;
  - horários indisponíveis continuam focáveis e anunciam o motivo ("Ocupado", "Paciente já tem consulta", "Pausa", "Horário passado");
  - sem horário livre no dia, o botão "Próximo dia com horário livre" usa a A5.
- Os horários são recalculados quando muda o paciente, o médico, a data ou a duração, e também quando outra aba grava. Se o horário escolhido deixar de valer, a escolha é limpa com um aviso.
- E-04 (o horário foi ocupado entre a escolha e o salvamento): aparece "Este horário acabou de ser ocupado" junto ao seletor, a escolha é limpa e os horários são recarregados. E-03 (médico ou paciente inativado) aparece no campo correspondente.
- Sem paciente ou sem médico ativo cadastrado, a tela mostra um estado vazio com link para cadastrar.
- Ao salvar, aparece o aviso "Consulta agendada: seg., 23/11 às 09:00 com Dr. Paulo Mendes" e abre o detalhe.

### Detalhe (`/consultas/:id`)

- Dados: paciente (com link e alergias), médico (com link), departamento, data, horário, tipo, motivo, situação e motivo do cancelamento.
- `LinhaDoTempoConsulta`: os eventos em ordem (agendada; reagendada de X para Y; cancelada com o motivo; concluída; falta).
- `AcoesConsulta`: os botões dependem da situação e do horário. Consultas finalizadas oferecem "Agendar novamente".

### Reagendar, cancelar, concluir e falta (P10–P12)

- **Reagendar (P10):**
  - o paciente fica fixo;
  - os horários são calculados ignorando a própria consulta, e o horário original aparece como "Horário atual";
  - controle de versão (R-G1);
  - uma consulta que não está mais agendada volta ao detalhe com um aviso.
- **Cancelar (P11):**
  - o motivo é obrigatório, com sugestões de um clique;
  - o aviso final tem a ação "Agendar novamente", que abre o agendamento já preenchido.
- **Concluir e falta (P12):** pedem uma confirmação curta e só ficam disponíveis a partir do início da consulta.

## Correção importante: duas abas

No teste com duas abas, encontrei uma janela de perda de dados. Se uma aba gravasse antes de receber o evento `storage` da outra, ela validava as regras com os dados antigos da memória e regravava a coleção inteira. Com isso, apagava a consulta que a outra aba tinha acabado de criar.

Agora `transacao()` compara o conteúdo do `localStorage` com o último conteúdo lido ou gravado e relê as coleções que mudaram **antes** de validar e gravar. As telas também são avisadas da mudança. A correção tem teste automatizado em `repositorio.test.ts`.

## Outros ajustes

- **Botão `contornoPerigo`:** nova variante para ações destrutivas secundárias, como "Cancelar consulta".
- **Horário vazio:** a mensagem passou a ser "Escolha um horário", no lugar de "Informe um horário válido (HH:mm)".
- **Links para as telas de consulta:**
  - "Reagendar", no diálogo de inativação de médico, aponta para `/consultas/:id/editar`;
  - "Ver consultas afetadas", na edição de médico, abre a agenda filtrada pelas consultas futuras agendadas.

## Números

| Indicador | Fase 11 | Fase 12 |
|---|---|---|
| Testes | 328 | 346 (34 arquivos) |
| Cobertura de linhas (geral) | 95,2% | 94,0% |
| `services/` · `utils/` · `components/ui/` (linhas) | 98,3% · 98,5% · 94,9% | 98,3% · 98,5% · 94,9% |
| Pacote inicial (`index.js`) | 56 kB | 57 kB |

`npm run lint` e `npm run build` terminam sem avisos.

## Verificação

- **Duas abas (12.10.1), testadas no navegador:**
  1. As duas abas escolhem 09:00 e uma delas salva. A outra recebe o aviso e o horário passa a aparecer como "Ocupado".
  2. Com o evento `storage` neutralizado, a aba atrasada tenta salvar: recebe E-04, e o horário fica com uma única consulta, sem gravação dupla.
- **Combinações de conflito (12.10.2):** médico, paciente, pausa, horário passado, fim do expediente, antecedência e duração estão cobertos pelos testes de serviço e de tela. Nenhuma passa.
- **Larguras, temas e acessibilidade (12.10.3):**
  - as 4 telas foram verificadas em 375, 768 e 1280px, nos temas claro e escuro, sem nenhuma violação no axe;
  - o axe também passou com a busca de paciente aberta e com o diálogo de cancelamento aberto;
  - um agendamento completo foi feito só com o teclado: busca do paciente, setas e Espaço no seletor, e Enter em "Agendar".

Capturas e vídeo do agendamento estão em `docs/capturas/`:
- `fase12-agenda-claro-1280.png`
- `fase12-agendar-claro-1280.png`
- `fase12-detalhe-claro-1280.png`
- `fase12-agenda-escuro-375.png`
- `fase12-agendamento.mp4`
