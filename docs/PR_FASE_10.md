# Fase 10: Cadastro de Pacientes

- Branch: `feat/fase-10-pacientes`
- Plano: tarefas 10.1 a 10.8 de `PLANO_EXECUCAO_CADASTROS.md`

## Resumo

Os processos P1 a P5 funcionam de ponta a ponta em quatro telas. Cada tela é carregada sob demanda, num arquivo separado no build.

### Lista (`/pacientes`)

- Busca por nome, nome social, CPF ou telefone.
- Filtro de situação, com "Ativos" como padrão.
- Ordenação por nome, idade e próxima consulta.
- Paginação de 10 em 10.
- Tudo isso fica guardado na URL, e o "Voltar" do detalhe retorna à lista como estava.
- Colunas:
  - nome de exibição com avatar e ícone de alergia;
  - CPF mascarado (R-P4);
  - idade;
  - telefone;
  - convênio;
  - próxima consulta;
  - situação;
  - menu "⋯" com Ver, Editar, Agendar consulta e Inativar/Reativar.
- Dois estados vazios: "Nenhum paciente cadastrado" (com o botão Novo paciente) e "Nenhum paciente encontrado para …" (com "Limpar filtros").

### Cadastro (`/pacientes/novo`, P1)

- **Abertura e máscaras:** o foco começa em "Nome completo"; CPF, telefone e CEP são formatados durante a digitação.
- **CPF:** ao sair do campo, o sistema confere se o CPF já está em uso e, se estiver, mostra o link "Abrir cadastro existente".
- **Data de nascimento:** a idade aparece ao lado. Para menores, surge a seção "Responsável legal", que passa a ser obrigatória (R-P5).
- **CEP:** a busca no ViaCEP (A6) preenche só os campos que o usuário não digitou e leva o foco para "Número".
- **Convênio:**
  - os campos de convênio só aparecem quando "Convênio" é escolhido;
  - uma carteirinha vencida gera um aviso, sem bloquear o cadastro.
- **Ao salvar:**
  - se houver erros, aparece um resumo com links para cada campo e o foco vai ao primeiro deles;
  - o botão mostra "Salvando…" durante o envio;
  - no celular, a barra de ações fica fixa no rodapé.
- **Agendamento:** com `?voltarPara=/consultas/nova`, depois de salvar o sistema volta ao agendamento com o paciente já selecionado (`?pacienteId=`).

### Edição (`/pacientes/:id/editar`, P2)

- "Salvar" fica desabilitado enquanto não houver alterações.
- Trocar o CPF pede confirmação.
- Paciente inativo pode ser editado, com um aviso no topo.
- Se o cadastro mudar em outra aba (M6), aparece um aviso com o botão "Recarregar dados".
- Conflito de versão ao salvar (E-05): um diálogo oferece "Recarregar dados" ou "Continuar editando". Na segunda opção, o próximo "Salvar" grava por cima.

### Detalhe (`/pacientes/:id`)

- Cabeçalho com avatar, idade, situação e o nome civil quando há nome social (R-P6).
- Alergias em destaque.
- CPF oculto, com o botão "Mostrar CPF" (R-P4).
- Cards: dados pessoais, contato e endereço, responsável, convênio, informações clínicas e contato de emergência.
- Duas listas de consultas: próximas e histórico (paginado).
- Faixa "Paciente inativo desde …", com o motivo.
- ID inexistente mostra a tela E-08.

### Inativar, reativar e excluir (P3–P5)

- **Inativar:** o diálogo informa quantas consultas futuras serão canceladas e pede um motivo opcional. O aviso final mostra o total cancelado e tem a ação "Ver consultas canceladas".
- **Reativar:** o aviso lembra que as consultas canceladas não voltam.
- **Excluir:** a opção só aparece para quem nunca teve consulta. É preciso digitar o nome do paciente para confirmar, e depois o sistema volta para a lista.

## Ajustes em código existente

- `schemas/paciente.ts`: as regras que cruzam campos (data no futuro, idade, responsável obrigatório, CPF do responsável) passam a rodar mesmo com outros campos inválidos (`when`). Assim, a exigência do responsável aparece já na primeira tentativa de salvar.
- **Confirmação:** o diálogo ganhou `campoTexto` opcional, usado para o motivo da inativação, e o hook `usePerguntar`, que devolve `{ confirmado, texto }`.
- **`useFormularioEntidade`:**
  - `aoEnviar` pode devolver `false` para indicar desistência;
  - nova opção `aoErroServico`.
- `Breadcrumb` aceita `nomes` por caminho, para mostrar o nome do paciente em "Editar".
- `useAnunciarRota` não tira o foco de um campo que a própria página já focou (P1, passo 1).
- **Correção:** o texto oculto do cabeçalho da `DataTable` aumentava a largura da página quando a tabela rolava (768px).
- `hydrateFallbackElement`: indicador de carregamento na primeira abertura de uma tela carregada sob demanda.

## Números

| Indicador | Fase 9 | Fase 10 |
|---|---|---|
| Testes | 286 | 313 (31 arquivos) |
| Cobertura de linhas | — | 96,1% no geral; `components/ui/` 94,9%; `services/` 98,1%; `utils/` 98,5% |
| Pacote inicial (`index.js`) | 72 kB | 55 kB; as telas de pacientes vão em arquivos separados, e o formulário tem 63 kB (21 kB gzip) |

`npm run lint` e `npm run build` terminam sem avisos.

## Verificação

- **Fluxo completo no navegador (10.8.1):**
  1. cadastrar;
  2. ver;
  3. editar (o nome social passa a ser o nome de exibição);
  4. inativar;
  5. reativar;
  6. excluir, com retorno à lista;
  7. abrir o link antigo, que mostra a tela E-08.

  Nenhum erro no console.
- **Larguras e temas:** as 4 telas foram testadas em 375, 768 e 1280px, nos temas claro e escuro. Não há rolagem horizontal, e o axe não aponta violações WCAG A/AA nem de boas práticas.
- **Testes automatizados:**
  - lista: busca, filtro, ordenação, paginação, estados vazios e o "Voltar" que mantém os filtros;
  - cadastro: campos obrigatórios, CPF inválido e duplicado, menor sem responsável, convênio condicional, CEP (sucesso, não encontrado e falha), sucesso com redirecionamento e `voltarPara`;
  - edição: salvar, troca de CPF e conflito com outra aba;
  - detalhe: E-08, CPF oculto, alergias e nome civil;
  - P3 a P5.
- **Serviço de CEP:** testado com `fetch` simulado (sucesso, `{erro:true}`, 400, 500, falha de rede, tempo esgotado, cancelamento e cache).

Capturas em `docs/capturas/`:
- `fase10-lista-claro-1280.png`
- `fase10-detalhe-claro-1280.png`
- `fase10-cadastro-escuro-375.png`

## Observação

Os links "Agendar consulta" e as datas das consultas apontam para `/consultas/...`. Essas telas são da Fase 12; até lá, esses links abrem a página provisória de Consultas ou a tela 404.
