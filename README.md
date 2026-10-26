# MediCore — Operações Hospitalares

Painel administrativo hospitalar com interface em português do Brasil.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Recharts · lucide-react · React Router · Vitest

## Pré-requisitos

- Node.js 20.19 ou superior (recomendado: 22 LTS)
- npm 10+

## Como rodar

```bash
npm install        # instala as dependências
npm run dev        # servidor de desenvolvimento (http://localhost:5173)
```

## Scripts

| Comando              | O que faz                                            |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | Inicia o servidor de desenvolvimento                 |
| `npm run build`      | Checa os tipos e gera a build de produção em `dist/` |
| `npm run preview`    | Serve a build de produção localmente                 |
| `npm run test`       | Executa os testes uma vez                            |
| `npm run test:watch` | Executa os testes em modo observação                 |
| `npm run lint`       | Analisa o código com oxlint                          |
| `npm run format`     | Formata o código com Prettier                        |

## Tema

As cores ficam em `src/index.css` como tokens do Tailwind (`bg-primary`, `text-text-muted`, `bg-card` etc.).
O modo escuro é ativado com o atributo `data-theme="dark"` no `<html>`, e a escolha fica salva no
`localStorage` com a chave `medicore-tema`.

## Dados e textos

- `src/types/index.ts` — tipos do domínio (consultas, leitos, alertas etc.)
- `src/i18n/pt-BR.ts` — **todos** os textos da interface; adicione novos textos aqui, nunca direto no JSX
- `src/data/mock.ts` — dados mockados
- `src/services/api.ts` — funções assíncronas que simulam a API; para integrar o backend, troque o corpo
  delas por chamadas HTTP mantendo as assinaturas
- `src/hooks/useDashboardData.ts` — um hook por card, com `data`, `carregando`, `erro` e `recarregar`
- `src/utils/format.ts` e `src/utils/leitos.ts` — formatação pt-BR e cálculos derivados

Para testar o estado de erro dos cards, crie um `.env.local` com `VITE_SIMULAR_ERRO=true`
(veja `.env.example`) e reinicie o `npm run dev`.

## Componentes de UI

Os componentes base ficam em `src/components/ui/` (`Card`, `Button`/`ButtonLink`, `ProgressBar`,
`StatusBadge`, `PriorityBadge`, `Skeleton`, `EmptyState`/`ErrorState`, `ConteudoAsync`, `Avatar`).
Com `npm run dev`, a página interna **/ui** mostra todas as variantes.

## Andamento

O plano completo, com checklists por fase, está em `PLANO_IMPLEMENTACAO_MEDICORE.md`.

- [x] Fase 1 — Configuração do projeto
- [x] Fase 2 — Tipos, dados mockados e i18n
- [x] Fase 3 — Layout e navegação
- [x] Fase 4 — Componentes de UI base
- [ ] Fase 5 — Cards do painel
- [ ] Fase 6 — Montagem da grade
- [ ] Fase 7 — Qualidade, testes e entrega
