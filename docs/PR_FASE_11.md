# Fase 11 — Cadastro de Médicos

Branch: `feat/fase-11-medicos` · Plano: `PLANO_EXECUCAO_CADASTROS.md` (tarefas 11.1 a 11.7)

## Resumo

Os processos P6, P7 e P8 funcionam de ponta a ponta, e a disponibilidade definida no cadastro já determina os horários livres (A1). Cada tela é carregada sob demanda.

### Lista (`/medicos`)

- Busca por nome ou número do CRM, com filtros de departamento e situação. Tudo fica na URL.
- Colunas:
  - nome com tratamento;
  - CRM no formato `123456/SP`;
  - departamento;
  - atendimento (por exemplo, `Seg a Sex · 08:00–17:00`);
  - consultas de hoje;
  - situação.
- Menu "⋯": Ver, Editar, Ver agenda, Agendar e Inativar/Reativar.
- Botão para alternar entre tabela e cartões. A escolha fica guardada no navegador (`localStorage`, com try/catch).

### Cadastro e edição (P6 e P7)

- Seções: Identificação, Contato, Lotação e Disponibilidade. No cadastro, o foco começa em "Tratamento".
- O CRM é conferido ao sair do campo ou ao trocar a UF. Se já existir, aparece o link "Abrir cadastro existente".
- `EditorDisponibilidade`:
  - os dias são botões alternáveis (`aria-pressed`), com a semana começando na segunda;
  - início, fim e pausa usam campos de hora com passo de 5 minutos;
  - a duração padrão é escolhida numa lista.
- `PreviaDisponibilidade` atualiza enquanto o usuário edita: "Seg a Sex · 08:00–17:00 · pausa 12:00–13:00 · 16 horários de 30 min por dia". O número de horários é calculado pela A1.
- Na edição, se a disponibilidade mudou, o sistema calcula as consultas que ficariam fora do novo horário (A3) **antes** de gravar. O diálogo oferece "Salvar mesmo assim" ou "Revisar". Depois de salvar, um aviso traz a ação "Ver consultas afetadas".
- Também na edição:
  - controle de versão (E-05) e aviso quando o cadastro muda em outra aba (M6), como em pacientes;
  - "Salvar" fica desabilitado enquanto não houver alterações.

### Detalhe (`/medicos/:id`)

- Cabeçalho com CRM, departamento e situação, e com as ações Editar, Ver agenda, Agendar e Inativar/Reativar.
- Grade semanal com os turnos separados pela pausa. No celular, ela vira uma lista.
- Indicadores do mês: consultas, taxa de faltas (`faltou ÷ (concluída + faltou)`) e cancelamentos.
- "Agenda de hoje", com as consultas e os horários livres, e "Próximos 7 dias", com a quantidade por dia.

### Inativar (P8)

- O diálogo bloqueante lista ao vivo as consultas futuras agendadas. Cada uma tem as opções "Reagendar" (tela da Fase 12) e "Cancelar". O cancelamento acontece na própria lista, pedindo o motivo, sem abrir um segundo diálogo.
- O botão "Inativar" só habilita quando a lista zera. A lista se atualiza sozinha quando o repositório avisa de uma mudança.
- Sem consultas pendentes, o diálogo pede um motivo opcional. Reativar pede uma confirmação.

## Ajustes em código existente

- **Botão de perigo:** criada a variante `perigo` do `Button`, com o novo token `--color-on-danger`. O estilo "perigo" do diálogo de confirmação não estava sendo aplicado, porque as classes conflitavam com as do botão primário. Agora os botões de excluir, inativar e cancelar aparecem em vermelho, com contraste AA nos dois temas.
- **Formato do CRM:** `formatarCrm` passou a gerar `123456/SP`, como pede a especificação.
- **`DataTable`:** nova opção `forcarCartoes`, que mostra os cartões em qualquer largura.
- **Utilitários:** `utils/agenda.horariosPorDia`, usado na prévia, e `utils/indicadores.calcularIndicadores`.
- **Serviço:** `medicoComCrm`, para o link de cadastro existente.
- **Testes:** `asyncUtilTimeout` passou para 4 s em `setupTests.ts`, porque as telas carregadas sob demanda às vezes passavam de 1 s na primeira importação.

## Números

| Indicador | Fase 10 | Fase 11 |
|---|---|---|
| Testes | 313 | 328 (33 arquivos) |
| Cobertura de linhas (geral) | 96,1% | 95,2% |
| `services/`, `utils/` e `components/ui/` (linhas) | 98,1% · 98,5% · 94,9% | 98,3% · 98,5% · 94,9% |
| Pacote inicial (`index.js`) | 55 kB | 56 kB |

`npm run lint` e `npm run build` terminam sem avisos.

## Verificação

- **Fluxo no navegador:**
  1. cadastrou uma médica;
  2. editou a disponibilidade dela;
  3. abriu a inativação do Dr. Paulo: o botão "Inativar" estava desabilitado e a lista mostrava 4 consultas;
  4. cancelou as 4 dentro do próprio diálogo, e o botão "Inativar" habilitou;
  5. inativou e depois reativou.

  Nenhum erro no console, e o axe não apontou problemas com o diálogo aberto.
- **Larguras e temas:** as 4 telas foram verificadas em 375, 768 e 1280px, nos temas claro e escuro. Não há rolagem horizontal e o axe não encontrou nenhuma violação. A grade semanal tinha uma rolagem sem acesso pelo teclado no celular; virou lista.
- **11.6.1:** o teste cadastra uma médica e confere `horariosLivres`: 16 horários, 12:00 marcado como pausa e nenhum horário no sábado.

Capturas em `docs/capturas/fase11-*.png`.

## Observação

"Ver agenda", "Agendar", "Reagendar" e "Ver consultas afetadas" levam a telas da Fase 12.
