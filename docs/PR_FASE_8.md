# Fase 8 — Fundação de dados e roteamento

Branch: `feat/fase-8-dados` · Plano: `PLANO_EXECUCAO_CADASTROS.md`, tarefas 8.1 a 8.17

## Resumo

- **Roteamento (8.1):** usa `createBrowserRouter` com `handle.titulo`. O título da aba vem da rota. Se uma página falhar, o erro aparece dentro do layout (`ErroDeRota`).
- **Dependências (8.2):** react-hook-form 7.91, zod 4.6 e @hookform/resolvers 6. É preciso rodar `npm install`.
- **Datas e fuso (8.3):** tudo é calculado no fuso `America/Sao_Paulo`, e a suíte roda em `TZ=UTC` para comprovar isso. O relógio fica centralizado em `agora()`.
- **Tipos, esquemas e erros (8.4–8.6):** paciente, médico, consulta e atividade, com todas as mensagens em PT-BR.
- **Repositório (8.7–8.8):** usa o `localStorage`, com:
  - transação (tudo ou nada);
  - tratamento da cota cheia;
  - backup quando os dados estão corrompidos;
  - sincronização entre abas;
  - migrações de versão dos dados.
- **Algoritmos (8.9):**
  - grade de horários, sobreposição, consultas afetadas, próximo dia livre e transições de status;
  - busca sem acentos, ordenação em pt-BR e paginação.
- **Serviços (8.10–8.13):** pacientes, médicos, consultas e atividades. Todas as regras R-xx são validadas no serviço e gravadas numa única transação.
- **Dados de exemplo (8.14):** 8 médicos, 30 pacientes e cerca de 40 consultas, gerados com semente fixa e relativos à data de hoje. Todos são fictícios.
- **Painel (8.15):** os nomes passaram a ser brasileiros (D6) e o avatar mostra "RA". O layout continua idêntico.
- **Hooks (8.16):** `useColecao` e os hooks por entidade recarregam sozinhos quando os dados mudam, inclusive por mudanças feitas em outra aba.

## Números

| Indicador | Antes | Depois |
|---|---|---|
| Testes | 84 | 214 (24 arquivos) |
| Cobertura geral (linhas) | — | 96,7% |
| `services/` (instruções · ramos · linhas) | — | 95,0% · 87,0% · 97,9% (meta 85%) |
| `utils/` (instruções · ramos · linhas) | — | 97,4% · 95,5% · 98,4% (meta 90%) |

`npm run lint` e `npm run build` terminam sem avisos.

## Matriz de regras (M13): onde cada regra é testada

| Regra | Positivo | Negativo | Arquivo |
|---|---|---|---|
| R-G1 concorrência | edita com a versão atual | versão antiga → `ErroConcorrencia` (paciente, médico, consulta) | pacientes/medicos/consultas.service |
| R-G2 normalização | nome, CPF e telefone limpos; e-mail em minúsculas | — | pacientes/medicos.service, schemas |
| R-G3 inativos fora das listas | reativar devolve à lista | inativo some da lista padrão | pacientes/medicos.service |
| R-P1 CPF único | editar o próprio CPF | CPF duplicado ao criar e ao editar | pacientes.service |
| R-P2 inativar cancela futuras | consulta passada continua concluída | futura vira cancelada com motivo | pacientes.service |
| R-P3 exclusão | sem consultas → exclui | com consulta → `tem_historico` | pacientes.service |
| R-P4 CPF mascarado | `***.982.247-**` | CPF curto → máscara cheia | mascaras, pacientes.service |
| R-P5 menor com responsável | dados de exemplo com responsável | menor sem responsável | schemas, pacientes.service, seeds |
| R-P6 nome social | aparece na lista e na busca | — | pacientes.service |
| R-M1 CRM e e-mail únicos | mesmo número em outra UF | CRM ou e-mail repetido | medicos.service |
| R-M2 inativar médico | após cancelar as futuras | bloqueado, com a lista das consultas | medicos.service |
| R-M3 consultas afetadas | as consultas não mudam | contagem das afetadas | medicos.service, agenda |
| R-M4 pausa | horários fora da pausa | pausa fora do expediente; consulta que cruza a pausa | schemas, agenda, consultas.service |
| R-C1 passado | dentro da tolerância de 5 min | 6 min depois → `horario_passado` | agenda, consultas.service |
| R-C2 expediente | dentro do expediente | após o fim; termina depois do fim; sábado | agenda, consultas.service |
| R-C3 conflito do médico | horários que só se tocam | sobreposição | agenda, consultas.service |
| R-C4 conflito do paciente | — | com outro médico | agenda, consultas.service |
| R-C5 horários livres | a própria consulta aparece livre ao reagendar | ocupado e pausa marcados | consultas.service |
| R-C6 reagendar | evento `de/para`; ignora a própria consulta | consulta não agendada | consultas.service |
| R-C7 atrasada | filtro `pendentes` | não atrasa antes do fim | agenda, consultas.service, seeds |
| R-C8 180 dias | 07/05/2027 | 10/05/2027 | consultas.service |
| R-C9 duração | 30 min | 0, 7 e 125 | schemas, consultas.service |
| R-S1–R-S3 transições | cancelar a qualquer momento; concluir ou falta após o início | concluir antes do início; status finais não mudam; lote desfaz tudo | agenda, consultas.service |

## Para revisar

- [ ] Rodar `npm install` (novas dependências)
- [ ] Teste manual com duas abas (8.17.3): o evento `storage` já é coberto por teste automatizado (`repositorio.test.ts`). A conferência visual fica para a Fase 10, quando a lista de pacientes passar a usar `useColecao`.
- [ ] O Painel continua igual à referência, exceto pelos nomes.
