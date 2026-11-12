# Verificação manual (Fases 14 e 21)

Alguns itens precisam de uma pessoa e não podem ser automatizados:

- **14.3.3 e 21.2.6:** teste com o leitor de tela NVDA (P1, P9, Painel, L1, E2 e F3);
- **14.4.3 e 21.3.4:** revisão das mensagens de erro (E-01 a E-18) por alguém que não seja
  desenvolvedor;
- **21.3.4:** revisão dos termos dos módulos por alguém da área (enfermagem, farmácia);
- **17.13.3, 18.10.3, 19.12.3 e 20.12.2:** testes com duas abas.

Os roteiros levam cerca de 1 hora no total. Anote os problemas em "Registro" e no Diário de
`PLANO_EXECUCAO_OPERACOES.md`.

## Preparação

1. Rode `npm run dev` e abra `http://localhost:5173/ui`.
2. Use **"Restaurar dados de exemplo"**, para começar com dados conhecidos.
3. Instale o NVDA (gratuito, nvaccess.org) e abra-o.
4. Use o Chrome ou o Firefox, com o zoom em 100%.

**Atalhos do NVDA usados nos roteiros:**

| Atalho            | O que faz                                                |
| ----------------- | -------------------------------------------------------- |
| `H`               | Próximo título                                           |
| `F`               | Próximo campo de formulário                              |
| `B`               | Próximo botão                                            |
| `Tab`             | Próximo item focável                                     |
| `Insert + Espaço` | Alterna entre o modo de navegação e o modo de formulário |
| `Insert + F7`     | Lista de links e títulos                                 |

## Roteiro 1 — P1: cadastrar paciente

| #   | Ação                                              | O que deve ser anunciado                                                                                                       | OK? |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --- |
| 1   | Abrir **Pacientes** pelo menu                     | "Página: Pacientes" e o título "Pacientes"                                                                                     |     |
| 2   | Ativar **Novo paciente**                          | "Página: Novo paciente". O foco vai para "Nome completo, obrigatório, editar"                                                  |     |
| 3   | Ativar **Salvar** sem preencher                   | Um alerta com "N campos precisam de correção" e a lista dos campos. O foco volta para "Nome completo", com "Campo obrigatório" |     |
| 4   | Digitar um CPF inválido e sair do campo           | "Informe um CPF válido" é lido como descrição do campo                                                                         |     |
| 5   | Digitar o CPF de um paciente existente            | "Já existe um paciente com este CPF" e o link "Abrir cadastro existente"                                                       |     |
| 6   | Informar uma data de nascimento de menor de idade | A seção "Responsável legal" aparece e é anunciada                                                                              |     |
| 7   | Digitar um CEP válido                             | O endereço é preenchido. Com a rede desligada, "Não foi possível buscar o CEP…"                                                |     |
| 8   | Marcar o consentimento e salvar                   | O aviso "Paciente cadastrado." é lido, e o detalhe do paciente abre                                                            |     |
| 9   | No detalhe, ativar **Mostrar CPF**                | O botão vira "Ocultar CPF", e o CPF completo é lido                                                                            |     |

## Roteiro 2 — P9: agendar consulta

| #   | Ação                                     | O que deve ser anunciado                                                                                                     | OK? |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --- |
| 1   | Abrir **Consultas → Agendar consulta**   | "Página: Agendar consulta". O foco vai para "Paciente, caixa de combinação"                                                  |     |
| 2   | Digitar "ana"                            | "N resultados". `↓` lê cada paciente, e `Enter` escolhe                                                                      |     |
| 3   | Escolher um paciente com alergia         | O alerta de alergia é lido                                                                                                   |     |
| 4   | Escolher o médico e a data               | "N horários livres"                                                                                                          |     |
| 5   | `Tab` até os horários                    | "Horário, grupo de opções" e o 1º horário. `→` e `←` andam pelos horários; os ocupados dizem o motivo, como "09:00, Ocupado" |     |
| 6   | `Espaço` num horário livre               | "marcado"                                                                                                                    |     |
| 7   | Ativar **Agendar**                       | "Consulta agendada: … às … com …", e o detalhe da consulta abre                                                              |     |
| 8   | No detalhe, ativar **Cancelar consulta** | O diálogo "Cancelar consulta" abre e o foco fica preso nele. `Esc` fecha o diálogo e devolve o foco ao botão                 |     |

## Roteiro 3 — Painel

| #   | Ação                                        | O que deve ser anunciado                                                                           | OK? |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------- | --- |
| 1   | Abrir **Painel** pelo menu                  | "Página: Painel". `H` percorre os títulos dos cards na ordem da tela                               |     |
| 2   | Ler "Indicadores do dia"                    | Cada card lê o título, o número e o detalhe ("Leitos disponíveis, 29, de 119 leitos no total")     |     |
| 3   | Ativar "4 em alta prioridade"               | O foco vai para "Alertas de emergência"                                                            |     |
| 4   | Ler "Ocupação de leitos"                    | "72% dos leitos ocupados: 86 de 119" e cada setor ("UTI: 22 de 30 leitos ocupados")                |     |
| 5   | Ler "Alertas de emergência"                 | Cada alerta é um link com título, local e prioridade; "Ver todos" abre a aba Alertas da emergência |     |
| 6   | Registrar uma chegada vermelha em outra aba | O Painel muda sem recarregar (casos de emergência +1) e **não** faz anúncios repetidos             |     |

## Roteiro 4 — L1: internar paciente

| #   | Ação                                            | O que deve ser anunciado                                                                                                                              | OK? |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 1   | Abrir **Gestão de leitos**                      | "Página: Gestão de leitos". `H` lê os setores; cada leito é um link com o nome completo ("UTI-03, Em higienização, há 40 minutos")                    |     |
| 2   | Ativar **Internar paciente**                    | "Página: Internar paciente"                                                                                                                           |     |
| 3   | Ativar **Internar** sem preencher               | "N campos precisam de correção". O foco vai para "Paciente, caixa de combinação"                                                                      |     |
| 4   | Escolher um paciente com alergia                | Idade, convênio e o alerta de alergia são lidos                                                                                                       |     |
| 5   | `Tab` até os leitos                             | "Leito, grupo de opções". O sugerido vem marcado e diz "Sugerido"; os incompatíveis dizem o motivo ("Perfil do leito diferente da idade do paciente") |     |
| 6   | Escolher um leito incompatível                  | Aparece "Usar mesmo assim" e a justificativa, anunciados                                                                                              |     |
| 7   | Preencher médico e motivo e ativar **Internar** | "… internado(a) no leito …" e o detalhe da internação abre                                                                                            |     |

## Roteiro 5 — E2: triagem

| #   | Ação                                                    | O que deve ser anunciado                                                                                   | OK? |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --- |
| 1   | Na **Emergência**, ativar **Triar** num paciente        | "Página: Triagem". O aviso "não um diagnóstico" é lido                                                     |     |
| 2   | Digitar SpO₂ 89 e sair do campo                         | "Atenção: abaixo de 90%" como descrição do campo (não é erro)                                              |     |
| 3   | `Tab` até a classificação                               | "Classificação de risco, grupo de opções". Cada cor diz o nome e o significado ("Laranja — muito urgente") |     |
| 4   | Escolher **Laranja**                                    | "Prazo para o atendimento médico: até HH:MM"                                                               |     |
| 5   | Ativar **Registrar triagem**                            | "Triagem registrada: laranja (até HH:MM)" e a fila abre                                                    |     |
| 6   | Na fila, com outra aba registrando uma chegada vermelha | "Novo paciente na fila: vermelho, E-…" uma vez só; os tempos que mudam sozinhos **não** são lidos          |     |

## Roteiro 6 — F3: dispensar

| #   | Ação                                                 | O que deve ser anunciado                                                                                  | OK? |
| --- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --- |
| 1   | **Farmácia → Dispensar**                             | "Página: Dispensar"                                                                                       |     |
| 2   | Escolher um paciente internado alérgico à penicilina | O destino ("Internado em …") e "Alergias: Penicilina" são lidos                                           |     |
| 3   | Escolher Amoxicilina e quantidade 14                 | A prévia ("Sairá de: 14 do lote …") e o alerta "Possível alergia: penicilina" (lido uma vez, como alerta) |     |
| 4   | Ativar **Revisar dispensação** sem marcar "Ciente"   | O resumo de erros; o foco vai para o primeiro campo com erro                                              |     |
| 5   | Marcar "Ciente", escrever a justificativa e revisar  | O diálogo "Confirmar dispensação" abre com os itens, os lotes e "Alergia (\"penicilina\") — justificada"  |     |
| 6   | Ativar **Dispensar**                                 | "Dispensação registrada (1 item)" e o detalhe da dispensação abre                                         |     |

## Revisão das mensagens (E-01 a E-18)

Peça a alguém da recepção ou da administração para ler cada mensagem e responder:

1. Entendeu o que aconteceu?
2. Sabe o que fazer a seguir?

| Código | Situação                                           | Mensagem                                                                                           | Entendeu? | Sugestão |
| ------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------- | -------- |
| E-01   | Campo inválido                                     | "Informe um CPF válido" · "Campo obrigatório" · "2 campos precisam de correção"                    |           |          |
| E-02   | CPF, CRM ou e-mail repetido                        | "Já existe um paciente com este CPF" + "Abrir cadastro existente"                                  |           |          |
| E-03   | Paciente ou médico inativado durante o agendamento | "Este médico foi inativado"                                                                        |           |          |
| E-04   | Horário ocupado por outra pessoa                   | "Este horário acabou de ser ocupado"                                                               |           |          |
| E-05   | Alteração em outra aba                             | "Este registro foi alterado em outra aba ou por outra pessoa. Recarregue para ver a versão atual." |           |          |
| E-06   | Armazenamento cheio                                | "Não há espaço para salvar. Exclua dados antigos ou restaure os dados de exemplo."                 |           |          |
| E-07   | Dados ilegíveis                                    | "Alguns dados não puderam ser lidos e foram restaurados."                                          |           |          |
| E-08   | Endereço inexistente                               | "Paciente não encontrado" + "Voltar para a lista de pacientes"                                     |           |          |
| E-09   | Erro inesperado                                    | "Algo deu errado nesta tela. O restante do sistema continua funcionando…"                          |           |          |
| E-10   | CEP sem rede                                       | "Não foi possível buscar o CEP. Preencha o endereço manualmente."                                  |           |          |

| E-11 | Leito ocupado por outra pessoa ao internar | "Este leito acabou de ser ocupado. Os leitos foram atualizados; escolha outro." | | |
| E-12 | Estoque insuficiente ao gravar | "Estoque insuficiente: disponível 4 frascos." | | |
| E-13 | Lote vencido ou repetido | "Lote vencido não pode entrar no estoque." · "Já existe o lote L123 com outra validade." | | |
| E-14 | Paciente já internado ou em atendimento | "Ana Paula Silva está internado(a) no leito ENF-104A." + link | | |
| E-15 | Destino da dispensação encerrado | "O paciente não está mais internado nem em atendimento." | | |
| E-16 | Ação num registro que mudou de situação | "Este registro mudou de situação. A tela foi atualizada." | | |
| E-17 | Inativar com pendências nos módulos | "Não é possível inativar: há 1 pendência nos módulos de leitos e emergência." + lista com links | | |
| E-18 | Prazo de correção vencido | "Não é mais possível desfazer: o prazo de 6 h terminou em 16:40." | | |

Para trocar o texto de uma mensagem, edite `src/i18n/pt-BR.ts` (E-01 a E-10 e pendências) ou
`src/i18n/pt-BR/operacoes.ts` (E-11 a E-18) e rode `npm run test`. Os testes indicam onde o
texto é verificado.

## Revisão dos termos dos módulos (21.3.4)

Peça a alguém da enfermagem e da farmácia para conferir se os termos são os usados no hospital.
Os textos ficam em `src/i18n/pt-BR/leitos.ts`, `emergencia.ts` e `farmacia.ts`.

| Grupo                   | Termos usados                                                                                                                                                                   | De acordo? | Sugestão |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- |
| Situações do leito      | Livre · Ocupado · Reservado · Em higienização · Bloqueado                                                                                                                       |            |          |
| Tipos de higienização   | Higienização terminal (60 min) · Higienização de isolamento (90 min)                                                                                                            |            |          |
| Cores de risco          | Vermelho — emergência · Laranja — muito urgente · Amarelo — urgente · Verde — pouco urgente · Azul — não urgente                                                                |            |          |
| Desfechos da emergência | Alta · Internação · Transferência · Óbito · Evasão                                                                                                                              |            |          |
| Tipos de alta           | Melhorada · A pedido · Transferência para outro hospital · Óbito                                                                                                                |            |          |
| Tipos de movimentação   | Entrada · Dispensação · Devolução · Ajuste positivo · Ajuste negativo · Perda/avaria · Descarte de vencido                                                                      |            |          |
| Avisos de escopo        | "…não um diagnóstico" (triagem) · "Verificação por texto; confira sempre a prescrição" (alergia) · "Conferi a receita/prescrição" (controlado) · "Não é prescrição" (dispensar) |            |          |

## Testes com duas abas

Abra o sistema em duas abas do mesmo navegador, lado a lado.

| Item    | Ação                                                                                       | Resultado esperado                                                       | OK? |
| ------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --- |
| 17.13.3 | Internar no mesmo leito nas duas abas                                                      | A segunda recebe E-11; o leito tem um só paciente                        |     |
| 17.13.3 | Concluir a higienização numa aba enquanto a outra bloqueia o mesmo leito                   | A segunda recebe E-16                                                    |     |
| 18.10.3 | Registrar uma chegada vermelha numa aba                                                    | A fila da outra aba mostra e anuncia ("Novo paciente na fila: vermelho") |     |
| 18.10.3 | Chamar o mesmo atendimento nas duas abas                                                   | A segunda recebe E-16                                                    |     |
| 19.12.3 | Dispensar o último estoque nas duas abas                                                   | A segunda recebe E-12; o estoque nunca fica negativo                     |     |
| 20.12.2 | Internar, dar alta, registrar chegada vermelha e dispensar numa aba, com o Painel na outra | O Painel muda sozinho em cada passo                                      |     |

## Registro

| Data | Quem | Roteiro | Problema encontrado | Correção |
| ---- | ---- | ------- | ------------------- | -------- |
|      |      |         |                     |          |
