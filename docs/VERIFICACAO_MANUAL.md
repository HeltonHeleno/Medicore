# Verificação manual (Fase 14)

Dois itens da Fase 14 precisam de uma pessoa e não podem ser automatizados:

- **14.3.3:** teste com o leitor de tela NVDA;
- **14.4.3:** revisão das mensagens de erro por alguém que não seja desenvolvedor.

Os roteiros abaixo levam cerca de 30 minutos no total. Anote os problemas em
"Registro" e no Diário de `docs/planos/PLANO_EXECUCAO_CADASTROS.md`.

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

## Revisão das mensagens (E-01 a E-10)

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

Para trocar o texto de uma mensagem, edite `src/i18n/pt-BR.ts` (grupo `erros` ou `validacao`)
e rode `npm run test`. Os testes indicam onde o texto é verificado.

## Registro

| Data | Quem | Roteiro | Problema encontrado | Correção |
| ---- | ---- | ------- | ------------------- | -------- |
|      |      |         |                     |          |
