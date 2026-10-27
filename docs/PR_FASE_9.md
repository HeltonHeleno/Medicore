# Fase 9: componentes de formulário e listagem

- Branch: `feat/fase-9-formularios`
- Tarefas do plano: 9.1 a 9.12 (`PLANO_EXECUCAO_CADASTROS.md`)

## Resumo

Esta fase entrega os blocos de tela que as Fases 10 a 12 (pacientes, médicos e consultas) vão montar. Todos aparecem na vitrine `/ui`, que só existe em desenvolvimento.

| Grupo | Componentes |
|---|---|
| Campos (`components/ui/form/`) | `Campo` (rótulo, dica, erro e ARIA ligados), `Input`, `Textarea` (com contador), `Select`, `Checkbox`, `RadioGroup` (fieldset + legend), `SecaoFormulario` |
| Máscaras | `InputMascarado`: CPF, telefone e CEP. O formulário recebe só os dígitos, o cursor não pula, e colar funciona com ou sem máscara. Backspace logo depois de um separador apaga o dígito anterior. |
| Busca | `Combobox` no padrão ARIA 1.2: espera 250 ms para buscar, ↑/↓/Home/End navegam, Enter seleciona, Esc fecha ou limpa, `aria-activedescendant` aponta a opção ativa e a contagem de resultados é anunciada |
| Listagem (`components/ui/lista/`) | `CabecalhoPagina` + `Breadcrumb` (lê `handle.breadcrumb`), `BarraFiltros` (espera 300 ms; "Limpar filtros"), `DataTable` (ordenação com `aria-sort`, cartões abaixo de 640px via container query, estados de carregando/vazio/erro, seleção múltipla), `Paginacao`, `MenuAcoes` ("⋯"), `DescricaoLista` |
| Feedback (`components/ui/feedback/`) | `Modal` (foco preso, Esc, devolve o foco), `ConfirmacaoProvider` + `useConfirmar()` (com `perigo` e `exigirTexto`), `ToastProvider` + `useToast()` |
| Formulário de entidade | `useFormularioEntidade`: react-hook-form + zod, `onTouched`, foco no 1º erro, `ResumoErros` com links, erros do serviço no campo certo, bloqueio de saída (`useBlocker` + `beforeunload`) só quando há alterações |
| URL | `useFiltrosUrl` (filtros na query string), `useOrigem` / `useVoltarPara` (o "Voltar" do detalhe volta à lista como estava, M14) |
| Layout | `BannerDemonstracao` (RS-01; some com `VITE_AMBIENTE=producao`) e `useAnunciarRota` (M11: foco no `<h1>` e "Página: …" anunciado a cada troca de página) |

## Ajustes em código existente

- `UserMenu` passou a usar o hook compartilhado `useMenuSuspenso`, o mesmo do `MenuAcoes`.
- Nova cor `--color-border-input` para a borda dos campos, com contraste de pelo menos 3:1 (WCAG 1.4.11) nos dois temas.
- As iniciais do avatar agora usam `text-on-primary-light`. No tema escuro o contraste era 3,3:1 e passou ao nível AA. No tema claro nada muda.
- A vitrine `/ui` é carregada sob demanda e fica fora do build de produção. Sem isso, o pacote inicial passaria de 60 kB para 178 kB; com a mudança, ficou em 72 kB.
- `Button` passou a aceitar `ref`.
- O banner de demonstração fica no topo do conteúdo e desloca o Painel cerca de 32px para baixo.

## Números

| Indicador | Fase 8 | Fase 9 |
|---|---|---|
| Testes | 214 | 286 (29 arquivos) |
| `components/ui/` (linhas) | — | 93,8% (meta: 70%) |
| `services/` · `utils/` (linhas) | 97,9% · 98,4% | 97,9% · 98,5% |
| Pacote inicial (`index.js`) | 60 kB | 72 kB (23 kB gzip) |

`npm run lint` e `npm run build` terminam sem avisos.

## Verificação

- **Vitrine nos tamanhos e temas:** testada em 375, 768 e 1280px, nos temas claro e escuro. Não há rolagem horizontal e o axe não aponta nenhuma violação WCAG A/AA nem de boas práticas.
- **Com componentes abertos:** o axe também foi rodado com o combobox aberto, o menu "⋯", o diálogo que exige digitar texto e os três tipos de toast, no escuro em 375px e no claro em 1280px. Nenhuma violação.
- **Teclado:** coberto pelos testes do Combobox, MenuAcoes, Modal, RadioGroup e Paginacao. No navegador, o menu "⋯" foi conferido abrindo com Enter, e o foco vai para o 1º item.

Capturas: `docs/capturas/fase9-vitrine-claro-1280.png` e `docs/capturas/fase9-vitrine-escuro-375.png`.
