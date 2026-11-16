# Transações dos módulos operacionais (Fase 26, tarefa 26.0.1)

> **Para quê:** é a lista das transações multi-coleção do inventário (`INVENTARIO.md`) que foram para o servidor na Fase 26, com o nível de isolamento e as travas de cada uma (R-API3). O código está em `apps/api/src/servicos/operacoes/`.

## Como as regras rodam no servidor

As regras de leitos, emergência e farmácia são **o mesmo código** dos serviços do navegador (síncrono). Na API, ele roda sobre uma **unidade de trabalho** (`unidade.ts`):

1. a transação abre e trava a área (abaixo);
2. a operação roda; quando pede um dado que ainda não foi lido, ela para, o dado é lido do banco e ela roda de novo do começo (nada foi gravado ainda);
3. quando termina sem faltar nada, as mudanças são gravadas na mesma transação: inserções na ordem das chaves estrangeiras, depois alterações (só os campos que mudaram), depois remoções.

| Tabela                                                                                                   | Como é lida                                                                    | Por quê                                        |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| Leitos, internações, pedidos de leito, atendimentos, medicamentos, lotes, dispensações, resumos, médicos | inteira, no primeiro uso                                                       | pequenas: a retenção (A15) tira o que é antigo |
| Pacientes                                                                                                | por id (com os pacientes citados nas tabelas já lidas, numa leitura só)        | o cadastro cresce sempre                       |
| Consultas                                                                                                | só as agendadas futuras do paciente (óbito, R-X8)                              | a agenda cresce sempre                         |
| Movimentações                                                                                            | só as do medicamento, as do filtro da tela ou as das dispensações que vão sair | nunca saem (R-F9): a tabela cresce sempre      |

## Isolamento e travas

| Tipo                                                | Isolamento                         | Travas                                                                                                             | Conflito                                                              |
| --------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Leitura (listas, detalhes, indicadores)             | `REPEATABLE READ READ ONLY`        | nenhuma                                                                                                            | —                                                                     |
| Gravação de leitos e emergência (área `internacao`) | `SERIALIZABLE`                     | `LOCK TABLE leitos IN SHARE ROW EXCLUSIVE MODE` antes da primeira leitura; pacientes lidos com `FOR SHARE`         | 40001/40P01: roda de novo, até 3 vezes; depois, E-16 (R-API3)         |
| Gravação da farmácia (área `estoque`)               | `SERIALIZABLE`                     | `LOCK TABLE lotes IN SHARE ROW EXCLUSIVE MODE`; lotes lidos com `FOR UPDATE` (FEFO, A9); pacientes com `FOR SHARE` | idem                                                                  |
| Retenção e rotina do dia (A15)                      | `SERIALIZABLE`                     | as duas áreas (leitos, depois lotes)                                                                               | idem; se falhar, o dia é devolvido e a rotina tenta na próxima volta  |
| Chegada na emergência (A8)                          | `SERIALIZABLE` (área `internacao`) | idem; `UNIQUE (dia, numero)` como última garantia                                                                  | número repetido (23505 em `atendimentos_numero_no_dia`): roda de novo |

**Por que `LOCK TABLE` e não `pg_advisory_xact_lock`:** no `SERIALIZABLE`, o retrato da transação é tirado no primeiro `SELECT`. A trava consultiva é pedida por um `SELECT`, então o retrato sairia **antes** de esperar a outra transação, e a operação leria dados velhos (os testes de concorrência pegaram isso: chegadas simultâneas repetiam o número). O `LOCK TABLE` não tira retrato, e o modo `SHARE ROW EXCLUSIVE` não bloqueia leituras.

**Entre módulos:** a inativação do paciente (cadastro, Fase 25) trava o paciente com `FOR UPDATE` antes de ler as pendências; a internação lê o paciente com `FOR SHARE`. Uma espera a outra, e a que vem depois vê a primeira (teste "R-X2 entre módulos").

## Transações de gravação

| Serviço    | Operações (todas numa transação)                                                                                                                                                                                                                                | Tabelas gravadas                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Leitos     | `internar`, `transferir`, `darAlta` (com óbito, R-X7), `desfazerAlta`, `concluirHigienizacao` (lote), `reverterHigienizacao`, `bloquear`, `desbloquear`, `editarInternacao`, `solicitarLeitoEletivo`, `reservarLeito`, `cancelarReserva`, `cancelarSolicitacao` | leitos, internações, pedidos de leito, atendimentos, pacientes e consultas (óbito), atividades               |
| Emergência | `registrarChegada`, `triar`, `reavaliar`, `chamar`, `colocarEmObservacao`, `retomarAtendimento`, `solicitarLeito`, `encerrar` (com óbito), `reabrir`, `vincularPaciente`                                                                                        | atendimentos, leitos, pedidos de leito, pacientes e consultas (óbito), atividades                            |
| Farmácia   | `criarMedicamento`, `editarMedicamento`, `inativarMedicamento`, `reativarMedicamento`, `registrarEntrada`, `ajustar`, `descartarVencidos`, `bloquearLote`, `desbloquearLote`, `dispensar`, `devolver`, `estornar`                                               | medicamentos, lotes, movimentações (só inserção, R-F9), dispensações, atividades                             |
| Rotinas    | retenção e rotina do dia (`executarRetencao`)                                                                                                                                                                                                                   | internações, atendimentos, pedidos de leito, dispensações (remoção ou versão arquivada), resumos, atividades |

A atividade do Painel (R-X6) é gravada na mesma transação de cada operação: se a operação falha, a atividade não fica.
