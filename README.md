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

## Andamento

O plano completo, com checklists por fase, está em `PLANO_IMPLEMENTACAO_MEDICORE.md`.

- [x] Fase 1 — Configuração do projeto
- [ ] Fase 2 — Tipos, dados mockados e i18n
- [ ] Fase 3 — Layout e navegação
- [ ] Fase 4 — Componentes de UI base
- [ ] Fase 5 — Cards do painel
- [ ] Fase 6 — Montagem da grade
- [ ] Fase 7 — Qualidade, testes e entrega
