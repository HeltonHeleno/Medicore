# MediCore — Operações Hospitalares

Painel administrativo hospitalar com interface 100% em português do Brasil: indicadores do dia,
ocupação de leitos, tendência de internações, desempenho por departamento, alertas de emergência,
consultas e linha do tempo de atividades. Funciona em desktop, tablet e celular, nos temas claro e
escuro.

![Painel no tema claro](docs/capturas/painel-claro.png)

<details>
<summary>Tema escuro e celular</summary>

![Painel no tema escuro](docs/capturas/painel-escuro.png)

<img src="docs/capturas/painel-celular.png" alt="Painel no celular" width="320" />

</details>

**Stack:** React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · Recharts 3 · lucide-react ·
React Router 7 · Vitest 5 + Testing Library

## Pré-requisitos

- Node.js 20.19 ou superior (recomendado: 22 LTS)
- npm 10+

## Como rodar

```bash
npm install        # instala as dependências
npm run dev        # servidor de desenvolvimento (http://localhost:5173)
```

## Scripts

| Comando                 | O que faz                                                         |
| ----------------------- | ----------------------------------------------------------------- |
| `npm run dev`           | Inicia o servidor de desenvolvimento                              |
| `npm run build`         | Checa os tipos e gera a build de produção em `dist/`              |
| `npm run preview`       | Serve a build de produção localmente (http://localhost:4173)      |
| `npm run test`          | Executa os testes uma vez                                         |
| `npm run test:watch`    | Executa os testes em modo observação                              |
| `npm run test:coverage` | Testes com relatório de cobertura (HTML em `coverage/index.html`) |
| `npm run lint`          | Analisa o código com oxlint                                       |
| `npm run format`        | Formata o código com Prettier                                     |

## Estrutura de pastas

```
src/
├── main.tsx, App.tsx, routes.tsx   # entrada, roteador e rotas
├── index.css                       # Tailwind + tokens de cor (claro/escuro)
├── i18n/pt-BR.ts                   # TODOS os textos da interface
├── types/                          # tipos do domínio
├── data/mock.ts                    # dados mockados
├── services/api.ts                 # API simulada (troque aqui pela real)
├── config/                         # menu/rotas e limites (ex.: alerta ≥ 90%)
├── hooks/                          # dados (useAsync), tema, saudação, título da aba, cores
├── utils/                          # formatação pt-BR e cálculos de leitos
├── components/
│   ├── layout/                     # AppLayout, Sidebar, Header, UserMenu, MobileDrawer
│   ├── ui/                         # Card, Button, ProgressBar, badges, estados…
│   └── dashboard/                  # os 9 cards do painel + ilustração
├── pages/                          # Dashboard, Placeholder, NotFound, UiShowcase (/ui)
└── __tests__/                      # testes (Vitest + Testing Library)
```

## Como trocar os dados mockados pela API real

Todos os cards buscam dados por `src/services/api.ts`. Cada função é assíncrona e devolve um tipo
de `src/types`. Para integrar o backend, **troque o corpo das funções mantendo as assinaturas** —
nenhum componente precisa mudar. Exemplo:

```ts
export async function getKpis(): Promise<Kpis> {
  const resposta = await fetch(`${import.meta.env.VITE_API_URL}/kpis`);
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return resposta.json();
}
```

Os valores derivados (leitos disponíveis, % de ocupação) são calculados no front por
`src/utils/leitos.ts`; a API só precisa enviar ocupados e total por setor.

Para testar o estado de erro dos cards, crie um `.env.local` com `VITE_SIMULAR_ERRO=true`
(veja `.env.example`) e reinicie o `npm run dev`.

## Como adicionar ou alterar textos

Nenhum texto visível fica escrito direto no JSX. Para adicionar um texto:

1. Inclua a chave em `src/i18n/pt-BR.ts`, no grupo da área correspondente:
   ```ts
   alertas: {
     titulo: 'Alertas de emergência',
     novoTexto: 'Meu novo texto',
   },
   ```
2. Use no componente: `{t.alertas.novoTexto}`.

Textos que dependem de números são funções, para tratar singular e plural:
`t.leitos.leitos(1)` → "1 leito", `t.leitos.leitos(34)` → "34 leitos".

Números, horas e percentuais usam sempre `src/utils/format.ts` (padrão pt-BR: `1.248`, `16:00`,
`72%`).

## Tema e cores

As cores ficam em `src/index.css` como tokens do Tailwind (`bg-primary`, `text-text-muted`,
`bg-card`…), com valores próprios para o tema escuro. O modo escuro é ativado pelo atributo
`data-theme="dark"` no `<html>`; a escolha fica salva no `localStorage` (chave `medicore-tema`).
Sem escolha salva, o painel segue o tema do sistema operacional.

Texto sobre os fundos verdes usa `text-on-primary` / `text-on-primary-light`, que garantem
contraste AA nos dois temas.

## Componentes de UI

Os componentes base ficam em `src/components/ui/`. Com `npm run dev`, a página interna **/ui**
mostra todas as variantes. `ConteudoAsync` resolve os quatro estados de um card (carregando, erro,
vazio e com dados):

```tsx
<Card titulo={t.alertas.titulo}>
  <ConteudoAsync estado={useAlertas()} vazio={t.vazio.alertas}>
    {(alertas) => <Lista itens={alertas} />}
  </ConteudoAsync>
</Card>
```

## Layout responsivo

A posição de cada card por largura de tela está no objeto `posicao` de `src/pages/Dashboard.tsx`:
3 colunas a partir de 1280px, 2 colunas entre 768 e 1279px e 1 coluna abaixo de 768px.

## Qualidade

- **Testes:** 84 testes; cobertura geral de ~95% (mínimo de 70% exigido em `utils/` e
  `components/ui/`, verificado por `npm run test:coverage`).
- **Acessibilidade:** sem violações WCAG A/AA no axe-core (claro e escuro, 375–1920px);
  navegação completa por teclado; gráficos com descrição em texto e tabela para leitores de tela;
  respeita "reduzir movimento".
- **Lighthouse (desktop):** Performance 99 · Acessibilidade 100 · Boas práticas 100 · SEO 100.
- **Performance:** fonte Inter servida localmente; Recharts carregado sob demanda em um pacote
  próprio (`graficos-*.js`), fora do carregamento inicial.

## Deploy

O projeto já vem configurado para os dois serviços (as rotas do React Router funcionam ao
recarregar a página):

- **Vercel:** `vercel.json` — importe o repositório em vercel.com ou rode `npx vercel`.
- **Netlify:** `netlify.toml` — importe o repositório em app.netlify.com ou rode
  `npx netlify deploy --prod`.

A página interna `/ui` existe apenas em desenvolvimento e não vai para a build de produção.

## Andamento

O plano completo, com checklists por fase, está em `PLANO_IMPLEMENTACAO_MEDICORE.md`.

- [x] Fase 1 — Configuração do projeto
- [x] Fase 2 — Tipos, dados mockados e i18n
- [x] Fase 3 — Layout e navegação
- [x] Fase 4 — Componentes de UI base
- [x] Fase 5 — Cards do painel
- [x] Fase 6 — Montagem da grade
- [x] Fase 7 — Qualidade, testes e entrega
