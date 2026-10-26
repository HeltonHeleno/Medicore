# 🏥 MediCore — Plano de Implementação do Painel Hospitalar

> **Projeto:** MediCore · Operações Hospitalares
> **Escopo:** Painel (dashboard) administrativo com dados mockados, interface 100% em português do Brasil
> **Stack:** React + TypeScript + Vite · Tailwind CSS v4 · Recharts · lucide-react · React Router · Vitest
> **Estimativa total:** 5 a 7 dias úteis (1 desenvolvedor)

---

## 📋 Sumário

1. [Como usar este documento](#-como-usar-este-documento)
2. [Painel de progresso](#-painel-de-progresso)
3. [Referência de design](#-referência-de-design)
4. [Estrutura de pastas](#-estrutura-de-pastas)
5. [Fase 1 — Configuração do projeto](#fase-1--configuração-do-projeto)
6. [Fase 2 — Tipos, dados mockados e i18n](#fase-2--tipos-dados-mockados-e-i18n)
7. [Fase 3 — Layout e navegação](#fase-3--layout-e-navegação)
8. [Fase 4 — Componentes de UI base](#fase-4--componentes-de-ui-base)
9. [Fase 5 — Cards do painel](#fase-5--cards-do-painel)
10. [Fase 6 — Montagem da grade do painel](#fase-6--montagem-da-grade-do-painel)
11. [Fase 7 — Qualidade, testes e entrega](#fase-7--qualidade-testes-e-entrega)
12. [Checklist final de aceite](#-checklist-final-de-aceite)
13. [Backlog futuro](#-backlog-futuro-fora-do-escopo)
14. [Registro de decisões e observações](#-registro-de-decisões-e-observações)

---

## 🧭 Como usar este documento

- Marque cada tarefa trocando `- [ ]` por `- [x]` conforme for concluindo.
- Cada fase tem uma seção **✅ Critérios de conclusão**. Só avance para a fase seguinte quando todos estiverem marcados.
- Atualize o [Painel de progresso](#-painel-de-progresso) ao final de cada fase.
- Registre desvios, bloqueios e decisões em [Registro de decisões](#-registro-de-decisões-e-observações).
- Sugestão de branches: `feat/fase-1-setup`, `feat/fase-2-dados`, etc. Faça um PR por fase.

---

## 📊 Painel de progresso

| Fase | Descrição | Estimativa | Status | Início | Fim |
|:---:|---|:---:|:---:|:---:|:---:|
| 1 | Configuração do projeto | 0,5 dia | ✅ Concluída | 26/10/2026 | 26/10/2026 |
| 2 | Tipos, dados mockados e i18n | 0,5 dia | ⬜ Não iniciada | | |
| 3 | Layout e navegação | 1 dia | ⬜ Não iniciada | | |
| 4 | Componentes de UI base | 0,5 dia | ⬜ Não iniciada | | |
| 5 | Cards do painel | 2 dias | ⬜ Não iniciada | | |
| 6 | Montagem da grade | 0,5 dia | ⬜ Não iniciada | | |
| 7 | Qualidade, testes e entrega | 1 dia | ⬜ Não iniciada | | |

Legenda: ⬜ Não iniciada · 🟨 Em andamento · ✅ Concluída · 🟥 Bloqueada

---

## 🎨 Referência de design

### Paleta de cores

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--color-sidebar` | `#0F3D36` | `#0A2B26` | Fundo da sidebar |
| `--color-primary` | `#16695E` | `#2FA391` | Botões, barras, gráficos, item de destaque |
| `--color-primary-light` | `#CFE3DF` | `#1E4A44` | Item ativo do menu, trilha da rosca, botão suave |
| `--color-bg` | `#E9F0EF` | `#0E1716` | Fundo da página |
| `--color-card` | `#FFFFFF` | `#16211F` | Fundo dos cards |
| `--color-border` | `#E3EAE9` | `#24312F` | Bordas e divisórias |
| `--color-text` | `#1A1F1E` | `#E8EEED` | Texto principal |
| `--color-text-muted` | `#6B7775` | `#94A3A0` | Texto secundário |
| `--color-danger` | `#C8102E` | `#F0566C` | Emergência, prioridade alta, cancelado |
| `--color-danger-bg` | `#FBE9EC` | `#2A1519` | Fundo do card de alertas |
| `--color-warning` | `#8A1538` | `#E58AA3` | Prioridade média (tom vinho) |

### Tipografia e espaçamento

- **Fonte:** Inter, com pesos 400, 500, 600 e 700
- **Tamanhos:** título do card de boas-vindas 28–30px, título de card 16–17px, valor de KPI 28–30px, texto 14px, legenda 12px
- **Raio dos cards:** 12px · **Padding interno:** 20–24px · **Gap da grade:** 20px
- **Sombra:** `0 1px 2px rgba(16, 24, 23, 0.04)`

### Glossário de tradução (EN → PT-BR)

| Original | PT-BR |
|---|---|
| Hospital OPS | Operações Hospitalares |
| Dashboard | Painel |
| Patients / Doctors / Appointments | Pacientes / Médicos / Consultas |
| Bed management | Gestão de leitos |
| Emergency / Pharmacy | Emergência / Farmácia |
| Analytics / Settings | Análises / Configurações |
| Search anything... | Pesquisar... |
| Good morning | Bom dia (dinâmico) |
| View Schedule / Review ICU Status | Ver agenda / Revisar status da UTI |
| AI hospital assistant | Assistente hospitalar com IA |
| Today's Insights / View All Insights | Insights de hoje / Ver todos os insights |
| Total patients / Available beds | Total de pacientes / Leitos disponíveis |
| Doctors on duty / Emergency cases | Médicos de plantão / Casos de emergência |
| Department performance | Desempenho por departamento |
| General Medicine / Orthopedics / Pediatrics | Clínica Geral / Ortopedia / Pediatria |
| Patient Admission Trend / This Week | Tendência de internações / Esta semana |
| Bed Occupancy / Occupied / Available | Ocupação de leitos / Ocupados / Disponíveis |
| ICU / General / Private | UTI / Enfermaria / Apartamento |
| Emergency Alerts / View All | Alertas de emergência / Ver todos |
| High / Medium | Alta / Média |
| Today's appointments | Consultas de hoje |
| Time / Patient / Department / Status | Horário / Paciente / Departamento / Status |
| Completed / Upcoming / Cancelled | Concluída / Agendada / Cancelada |
| Activity timeline | Linha do tempo de atividades |
| Need help? / Contact Support | Precisa de ajuda? / Falar com o suporte |
| Administrator | Administrador |

---

## 🗂️ Estrutura de pastas

```
medicore/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── README.md
└── src/
    ├── main.tsx
    ├── App.tsx                         # Definição das rotas
    ├── index.css                       # Tailwind + tokens de tema
    ├── i18n/
    │   └── pt-BR.ts                    # Todos os textos da interface
    ├── types/
    │   └── index.ts                    # Tipos e enums
    ├── data/
    │   └── mock.ts                     # Dados mockados
    ├── services/
    │   └── api.ts                      # Funções async que simulam a API
    ├── hooks/
    │   ├── useTheme.ts
    │   ├── useGreeting.ts
    │   └── useDashboardData.ts
    ├── utils/
    │   ├── format.ts                   # Formatação Intl pt-BR
    │   ├── leitos.ts                   # Cálculos derivados de leitos
    │   └── cn.ts                       # Helper de classes (clsx)
    ├── assets/
    │   └── medico-ilustracao.svg
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.tsx
    │   │   ├── Sidebar.tsx
    │   │   ├── Header.tsx
    │   │   ├── UserMenu.tsx
    │   │   └── MobileDrawer.tsx
    │   ├── ui/
    │   │   ├── Card.tsx
    │   │   ├── Button.tsx
    │   │   ├── ProgressBar.tsx
    │   │   ├── StatusBadge.tsx
    │   │   ├── PriorityBadge.tsx
    │   │   ├── Skeleton.tsx
    │   │   └── EmptyState.tsx
    │   └── dashboard/
    │       ├── WelcomeCard.tsx
    │       ├── AIInsights.tsx
    │       ├── StatCard.tsx
    │       ├── DepartmentPerformance.tsx
    │       ├── AdmissionChart.tsx
    │       ├── OccupancyDonut.tsx
    │       ├── AlertList.tsx
    │       ├── AppointmentsTable.tsx
    │       └── ActivityTimeline.tsx
    ├── pages/
    │   ├── Dashboard.tsx
    │   └── Placeholder.tsx
    └── __tests__/
        ├── format.test.ts
        ├── leitos.test.ts
        ├── greeting.test.ts
        └── components/
```

---

## Fase 1 — Configuração do projeto

**Estimativa:** 0,5 dia · **Branch:** `feat/fase-1-setup`

### 1.1 Criação do projeto

- [x] Criar o projeto com Vite:
  ```bash
  npm create vite@latest medicore -- --template react-ts
  cd medicore
  npm install
  ```
- [x] Instalar as dependências de produção:
  ```bash
  npm install react-router-dom recharts lucide-react clsx
  ```
- [x] Instalar as dependências de desenvolvimento:
  ```bash
  npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom prettier
  ```
- [x] Remover os arquivos de exemplo do Vite (`App.css`, logo, conteúdo do `App.tsx`)
- [ ] Inicializar o Git e fazer o primeiro commit

### 1.2 Tailwind CSS v4

- [x] Adicionar o plugin em `vite.config.ts`:
  ```ts
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import tailwindcss from '@tailwindcss/vite';

  export default defineConfig({
    plugins: [react(), tailwindcss()],
    test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.ts', passWithNoTests: true },
  });
  ```
- [x] Criar `src/setupTests.ts` com `import '@testing-library/jest-dom/vitest';`
- [x] Adicionar `"types": ["vitest/globals"]` ao `tsconfig.app.json`

### 1.3 Tokens de tema (claro e escuro)

- [x] Escrever `src/index.css`:
  ```css
  @import 'tailwindcss';

  /* Modo escuro controlado pelo atributo data-theme no <html> */
  @custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));

  @theme {
    --font-sans: 'Inter', system-ui, sans-serif;
    --color-sidebar: #0f3d36;
    --color-primary: #16695e;
    --color-primary-light: #cfe3df;
    --color-bg: #e9f0ef;
    --color-card: #ffffff;
    --color-border: #e3eae9;
    --color-text: #1a1f1e;
    --color-text-muted: #6b7775;
    --color-danger: #c8102e;
    --color-danger-bg: #fbe9ec;
    --color-warning: #8a1538;
  }

  [data-theme='dark'] {
    --color-sidebar: #0a2b26;
    --color-primary: #2fa391;
    --color-primary-light: #1e4a44;
    --color-bg: #0e1716;
    --color-card: #16211f;
    --color-border: #24312f;
    --color-text: #e8eeed;
    --color-text-muted: #94a3a0;
    --color-danger: #f0566c;
    --color-danger-bg: #2a1519;
    --color-warning: #e58aa3;
  }

  body {
    background: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-sans);
  }
  ```
- [x] Confirmar que as classes `bg-primary`, `text-text-muted`, `bg-card` etc. funcionam

### 1.4 HTML base e fonte

- [x] Em `index.html`:
  - [x] `<html lang="pt-BR">`
  - [x] `<title>MediCore — Painel</title>`
  - [x] Importar a Inter do Google Fonts (pesos 400, 500, 600, 700)
  - [x] Adicionar `<meta name="description" content="Painel de operações hospitalares MediCore">`
- [x] Script inline no `<head>` que aplica o tema salvo antes da renderização, para evitar o "piscar" do tema claro:
  ```html
  <script>
    try {
      const t = localStorage.getItem('medicore-tema');
      if (t) document.documentElement.dataset.theme = t;
    } catch (e) {}
  </script>
  ```

### 1.5 Qualidade de código

- [x] Configurar o Prettier (`.prettierrc`: aspas simples, ponto e vírgula, largura 100)
- [x] Adicionar scripts ao `package.json`: `dev`, `build`, `preview`, `test`, `lint`, `format`
- [x] Criar o helper `src/utils/cn.ts`:
  ```ts
  import clsx, { type ClassValue } from 'clsx';
  export const cn = (...classes: ClassValue[]) => clsx(classes);
  ```

### ✅ Critérios de conclusão — Fase 1

- [x] `npm run dev` abre a aplicação sem erros
- [x] A fonte Inter é carregada
- [x] Alterar manualmente `data-theme="dark"` no DevTools muda as cores
- [x] `npm run test` executa (mesmo sem testes)
- [ ] Commit e PR da fase abertos

---

## Fase 2 — Tipos, dados mockados e i18n

**Estimativa:** 0,5 dia · **Branch:** `feat/fase-2-dados`

### 2.1 Tipos (`src/types/index.ts`)

- [ ] Criar os tipos:
  ```ts
  export type StatusConsulta = 'concluida' | 'agendada' | 'cancelada';
  export type Prioridade = 'alta' | 'media' | 'baixa';
  export type PeriodoInternacao = 'semana' | 'mes' | 'ano';

  export interface Kpis {
    totalPacientes: number;
    variacaoPacientes: number; // em %, ex.: 12
    medicosPlantao: number;
    casosEmergencia: number;
  }

  export interface SetorLeitos {
    id: 'uti' | 'enfermaria' | 'apartamento';
    nome: string;
    ocupados: number;
    total: number;
  }

  export interface Departamento {
    id: string;
    nome: string;
    desempenho: number; // 0–100
  }

  export interface PontoInternacao {
    rotulo: string; // 'Seg', 'Ter'...
    valor: number;
  }

  export interface AlertaEmergencia {
    id: string;
    titulo: string;
    local: string;
    medico: string;
    prioridade: Prioridade;
  }

  export interface Consulta {
    id: string;
    horario: string; // ISO
    paciente: string;
    departamento: string;
    status: StatusConsulta;
  }

  export interface Atividade {
    id: string;
    descricao: string;
    horario: string; // ISO
  }

  export interface Insight {
    id: string;
    texto: string;
  }
  ```

### 2.2 Textos da interface (`src/i18n/pt-BR.ts`)

- [ ] Criar o objeto `t` com **todos** os textos, agrupados por área:
  - [ ] `app`: nome ("MediCore"), subtítulo ("Operações Hospitalares")
  - [ ] `menu`: Painel, Pacientes, Médicos, Consultas, Gestão de leitos, Emergência, Farmácia, Análises, Configurações
  - [ ] `header`: placeholder da busca e aria-labels ("Alternar modo escuro", "Notificações", "Mensagens", "Menu do usuário")
  - [ ] `userMenu`: Meu perfil, Configurações, Sair
  - [ ] `suporte`: "Precisa de ajuda?", "Estamos disponíveis 24h para qualquer urgência.", "Falar com o suporte"
  - [ ] `saudacao`: "Bom dia", "Boa tarde", "Boa noite"
  - [ ] `boasVindas`: título com nome (função), botões "Ver agenda" e "Revisar status da UTI"
  - [ ] `ia`: "Assistente hospitalar com IA", "Insights de hoje", "Ver todos os insights"
  - [ ] `kpis`: títulos e textos de apoio dos 4 cards
  - [ ] `departamentos`: título "Desempenho por departamento"
  - [ ] `internacoes`: "Tendência de internações", períodos ("Esta semana", "Este mês", "Este ano"), tooltip (`(n) => \`${n} internações\``)
  - [ ] `leitos`: "Ocupação de leitos", "ocupados", "Ocupados", "Disponíveis", "leitos"
  - [ ] `alertas`: "Alertas de emergência", "Ver todos"
  - [ ] `consultas`: "Consultas de hoje", "Ver todas", cabeçalhos da tabela
  - [ ] `atividades`: "Linha do tempo de atividades"
  - [ ] `status`: `{ concluida: 'Concluída', agendada: 'Agendada', cancelada: 'Cancelada' }`
  - [ ] `prioridade`: `{ alta: 'Alta', media: 'Média', baixa: 'Baixa' }`
  - [ ] `vazio`: mensagens de estado vazio de cada card ("Nenhuma consulta para hoje", "Nenhum alerta ativo" etc.)
  - [ ] `erro`: "Não foi possível carregar os dados. Tentar novamente"
- [ ] Exportar com `as const` para ter autocomplete e checagem de tipos

### 2.3 Dados mockados (`src/data/mock.ts`)

- [ ] **KPIs:** total 1248, variação +12%, médicos 42, emergências 18
- [ ] **Leitos por setor:**
  - [ ] UTI: 22 ocupados de 30
  - [ ] Enfermaria: 50 ocupados de 70
  - [ ] Apartamento: 14 ocupados de 20
- [ ] **Departamentos:** Cardiologia 88, Emergência 93, Neurologia 80, Clínica Geral 79, Ortopedia 75, Pediatria 65
- [ ] **Internações (semana):** Seg 42, Ter 30, Qua 38, Qui 64, Sex 46, Sáb 70, Dom 60 (curva ondulada parecida com a referência)
- [ ] **Internações (mês e ano):** séries extras para o seletor de período
- [ ] **Insights:**
  - [ ] "A ocupação da UTI pode chegar a 90% até a noite."
  - [ ] "3 medicamentos estão com estoque baixo."
  - [ ] "5 pacientes precisam de retorno hoje."
- [ ] **Alertas:**
  - [ ] Paciente crítico — UTI, Leito 12 · Dr. James Wilson · alta
  - [ ] Acidente — Emergência, Leito 3 · Dr. Michael Brown · media
  - [ ] Infarto — UTI, Leito 7 · Dra. Emily Davis · alta
- [ ] **Consultas (data de hoje):**
  - [ ] 09:00 · John Smith · Cardiologia · concluida
  - [ ] 10:30 · Emily Davis · Neurologia · agendada
  - [ ] 12:00 · Michael Brown · Ortopedia · agendada
  - [ ] 16:00 · Daniel Taylor · Clínica Geral · cancelada
- [ ] **Atividades:**
  - [ ] 10:30 · Novo paciente John Smith internado
  - [ ] 09:45 · Estoque de paracetamol atualizado
  - [ ] 09:30 · Consulta concluída com Emily Davis
  - [ ] 09:00 · Dr. Robert Lee entrou na equipe de Cardiologia
- [ ] (Opcional) Trocar os nomes por nomes brasileiros e registrar a decisão no [Registro](#-registro-de-decisões-e-observações)

### 2.4 Formatação (`src/utils/format.ts`)

- [ ] `formatNumero(n)`: `new Intl.NumberFormat('pt-BR').format(n)` → `1.248`
- [ ] `formatPercentual(n)`: → `72%`
- [ ] `formatHora(iso)`: `Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })` → `16:00`
- [ ] `formatVariacao(n)`: → `12% em relação a ontem`

### 2.5 Cálculos de leitos (`src/utils/leitos.ts`)

- [ ] `totalLeitos(setores)` → 120
- [ ] `leitosOcupados(setores)` → 86
- [ ] `leitosDisponiveis(setores)` → 34
- [ ] `percentualOcupacao(setores)` → 72 (arredondado)

> ⚠️ **Atenção:** a imagem de referência mostra "86" em *Leitos disponíveis*, mas 86 é o número de leitos **ocupados**. O valor correto do KPI é **34**, calculado pelas funções acima.

### 2.6 Serviço simulado (`src/services/api.ts`)

- [ ] Criar o helper `delay(ms)` (padrão 400ms) para simular a latência
- [ ] Funções `async`: `getKpis`, `getLeitos`, `getDepartamentos`, `getInternacoes(periodo)`, `getInsights`, `getAlertas`, `getConsultasHoje`, `getAtividades`
- [ ] Flag `VITE_SIMULAR_ERRO=true` que faz uma função lançar erro, para testar o estado de erro

### 2.7 Hook de dados (`src/hooks/useDashboardData.ts`)

- [ ] Hook genérico `useAsync<T>(fn, deps)` que retorna `{ data, carregando, erro, recarregar }`
- [ ] Hooks específicos por card ou um hook agregador, conforme preferência da equipe

### 2.8 Testes da fase

- [ ] `format.test.ts`: `formatNumero(1248) === '1.248'`, hora em formato 24h
- [ ] `leitos.test.ts`: 120 total, 86 ocupados, 34 disponíveis, 72%

### ✅ Critérios de conclusão — Fase 2

- [ ] Nenhum `any` nos tipos
- [ ] Todos os testes da fase passam
- [ ] Nenhum texto de interface escrito diretamente fora de `pt-BR.ts`
- [ ] Commit e PR da fase abertos

---

## Fase 3 — Layout e navegação

**Estimativa:** 1 dia · **Branch:** `feat/fase-3-layout`

### 3.1 Rotas (`src/App.tsx`)

- [ ] Configurar o `BrowserRouter` com `AppLayout` como layout pai
- [ ] Rotas:
  - [ ] `/` → `Dashboard`
  - [ ] `/pacientes`, `/medicos`, `/consultas`, `/leitos`, `/emergencia`, `/farmacia`, `/analises`, `/configuracoes` → `Placeholder` com o título traduzido
  - [ ] `*` → página "Página não encontrada" com link para o Painel

### 3.2 `AppLayout`

- [ ] Grade: `grid-cols-[205px_1fr]` no desktop, uma coluna abaixo de 1024px
- [ ] Sidebar com `sticky top-0 h-screen`
- [ ] Área de conteúdo com `Header` e `<main>` (padding 24px, conteúdo com `<Outlet />`)
- [ ] Link "Pular para o conteúdo" visível ao receber foco (acessibilidade)

### 3.3 `Sidebar`

- [ ] Fundo `bg-sidebar`, texto branco
- [ ] Logo: "MediCore" (22px, negrito) e "Operações Hospitalares" (13px, opacidade 80%)
- [ ] Lista de navegação com `NavLink` e ícones lucide:

  | Item | Ícone sugerido |
  |---|---|
  | Painel | `Home` |
  | Pacientes | `User` |
  | Médicos | `Stethoscope` |
  | Consultas | `CalendarDays` |
  | Gestão de leitos | `BedDouble` |
  | Emergência | `Siren` |
  | Farmácia | `Pill` |
  | Análises | `BarChart3` |
  | Configurações | `Settings` |

- [ ] Item ativo: fundo `bg-primary-light`, texto escuro, raio 6px
- [ ] Hover nos itens inativos: fundo branco com 8% de opacidade
- [ ] Card "Precisa de ajuda?" fixo no rodapé (borda clara, fundo levemente mais claro que a sidebar) com o botão "Falar com o suporte"
- [ ] Perfil: avatar circular (40px), "Dr. Johnson", "Administrador"
- [ ] `<nav aria-label="Navegação principal">`

### 3.4 `Header`

- [ ] Campo de busca (~270px) com ícone `Search` e placeholder "Pesquisar..."
  - [ ] `role="search"` e `<label>` visualmente oculto
- [ ] Botões de ícone (40×40, fundo branco, raio 8px):
  - [ ] Tema: ícone `Moon` no claro e `Sun` no escuro
  - [ ] Notificações: `Bell` com ponto verde
  - [ ] Mensagens: `MessageSquareText` com ponto azul
- [ ] `UserMenu`: avatar com `ChevronDown` que abre o dropdown (Meu perfil, Configurações, Sair)
  - [ ] Fecha com Esc e com clique fora
  - [ ] `aria-expanded` e `aria-haspopup="menu"`
  - [ ] Foco no primeiro item ao abrir

### 3.5 `useTheme`

- [ ] Lê o tema salvo no `localStorage` (chave `medicore-tema`), dentro de try/catch
- [ ] Na falta de tema salvo, usa `prefers-color-scheme`
- [ ] Aplica `document.documentElement.dataset.theme`
- [ ] Retorna `{ tema, alternarTema }`

### 3.6 Navegação mobile

- [ ] Abaixo de 1024px: a sidebar fica oculta e aparece o botão hambúrguer (`Menu`) no header
- [ ] `MobileDrawer`: painel deslizante da esquerda com overlay escuro
- [ ] Fecha ao clicar num link, no overlay ou com Esc
- [ ] Trava a rolagem do `body` enquanto aberto
- [ ] Foco preso dentro do drawer (focus trap)

### ✅ Critérios de conclusão — Fase 3

- [ ] Todas as rotas abrem e o item ativo é destacado corretamente
- [ ] O modo escuro alterna e persiste após recarregar a página
- [ ] Layout testado em 375px, 768px, 1024px, 1440px e 1920px
- [ ] Navegação completa por teclado (Tab, Shift+Tab, Enter, Esc)
- [ ] Commit e PR da fase abertos

---

## Fase 4 — Componentes de UI base

**Estimativa:** 0,5 dia · **Branch:** `feat/fase-4-ui`

### 4.1 `Card`

- [ ] Props: `titulo?`, `acao?` (`{ rotulo, href }`), `variante?: 'padrao' | 'perigo'`, `className?`, `children`
- [ ] Variante `padrao`: `bg-card`, borda `border-border`, raio 12px, padding 20px
- [ ] Variante `perigo`: `bg-danger-bg`, título em `text-danger`
- [ ] Título como `<h2>` (16–17px, semibold); link de ação à direita (13px)

### 4.2 `Button`

- [ ] Variantes:
  - [ ] `primario`: `bg-primary`, texto branco
  - [ ] `contorno`: borda `border-border`, texto `text-primary`
  - [ ] `suave`: `bg-primary-light`, texto `text-primary`
- [ ] Tamanhos `md` (padding 12×20) e `sm`
- [ ] Estados de hover, foco (`focus-visible:ring-2`) e desabilitado
- [ ] Suporte a ícone à esquerda e à direita

### 4.3 `ProgressBar`

- [ ] Props: `valor` (0–100), `cor?: 'primaria' | 'perigo'`, `rotulo` (para acessibilidade)
- [ ] Altura 6px, trilha `bg-primary-light`, preenchimento animado (`transition-[width]`)
- [ ] `role="progressbar"` com `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`

### 4.4 `StatusBadge`

- [ ] Recebe `status: StatusConsulta`, com rótulo vindo de `t.status`
- [ ] Estilos:
  - [ ] `concluida`: fundo `primary`, texto branco
  - [ ] `agendada`: fundo `primary-light`, texto `primary`
  - [ ] `cancelada`: fundo `danger-bg`, texto `danger`

### 4.5 `PriorityBadge`

- [ ] Recebe `prioridade: Prioridade`, com rótulo vindo de `t.prioridade`
- [ ] Fundo branco, raio 6px, texto `danger` (alta) ou `warning` (média)

### 4.6 `Skeleton` e `EmptyState`

- [ ] `Skeleton`: bloco com `animate-pulse`, largura e altura configuráveis, `aria-hidden`
- [ ] `EmptyState`: ícone, mensagem e ação opcional
- [ ] `ErrorState`: mensagem de erro e botão "Tentar novamente"

### 4.7 Testes da fase

- [ ] `StatusBadge` mostra "Concluída", "Agendada" e "Cancelada"
- [ ] `PriorityBadge` mostra "Alta" e "Média"
- [ ] `ProgressBar` expõe `aria-valuenow` correto

### ✅ Critérios de conclusão — Fase 4

- [ ] Todos os componentes funcionam nos temas claro e escuro
- [ ] Contraste verificado nos badges (mínimo AA)
- [ ] Testes da fase passando
- [ ] Commit e PR da fase abertos

---

## Fase 5 — Cards do painel

**Estimativa:** 2 dias · **Branch:** `feat/fase-5-cards`

> Para **cada** card, implemente os 4 estados: **carregando** (skeleton), **erro**, **vazio** e **com dados**.

### 5.1 `WelcomeCard`

- [ ] Hook `useGreeting()`: 5h–11h59 → "Bom dia", 12h–17h59 → "Boa tarde", 18h–4h59 → "Boa noite"
- [ ] Sobretítulo em caixa alta, verde, 12px, semibold, com espaçamento entre letras
- [ ] Título `<h1>`: "Veja como está o hospital hoje, Dr. Johnson." (28–30px, negrito)
- [ ] Subtítulo montado a partir dos dados: "{n} consultas hoje · UTI tendendo a {x}% até a noite · {m} medicamentos com estoque baixo."
- [ ] Botões "Ver agenda" (primário → `/consultas`) e "Revisar status da UTI" (contorno → `/leitos`)
- [ ] Ilustração SVG à direita (~300px), com `alt=""` decorativo
  - [ ] Criar uma ilustração **original** (médico com jaleco, estetoscópio, prancheta e ícones médicos ao redor) ou usar um placeholder até ter a arte final
  - [ ] Ocultar abaixo de 768px

### 5.2 `AIInsights`

- [ ] Título "Assistente hospitalar com IA"
- [ ] Caixa interna com borda: "Insights de hoje" e lista com marcadores
- [ ] Botão largo `suave` "Ver todos os insights" com `ChevronRight` alinhado à direita
- [ ] Estado vazio: "Nenhum insight disponível no momento."

### 5.3 `StatCard` (×4)

- [ ] Props: `titulo`, `valor`, `detalhe`, `tendencia?: 'alta' | 'baixa'`, `destaque?: 'perigo'`
- [ ] Valor 28–30px, negrito, formatado com `formatNumero`
- [ ] Cards:
  - [ ] Total de pacientes · 1.248 · "↑ 12% em relação a ontem" (`ArrowUp`)
  - [ ] Leitos disponíveis · 34 · "de 120 leitos no total" (valor **calculado**)
  - [ ] Médicos de plantão · 42 · "Escalados para hoje"
  - [ ] Casos de emergência · **18** em `text-danger` · "Alta prioridade — ver alertas" (link para os alertas)

### 5.4 `DepartmentPerformance`

- [ ] Título "Desempenho por departamento"
- [ ] Para cada departamento: nome à esquerda, percentual à direita e `ProgressBar` abaixo
- [ ] Regra de cor: barra `perigo` quando o desempenho é ≥ 90% (constante `LIMITE_ALERTA_DEPARTAMENTO = 90`)
- [ ] Espaçamento vertical uniforme entre itens (~24px)

### 5.5 `OccupancyDonut`

- [ ] Título "Ocupação de leitos"
- [ ] `PieChart` do Recharts:
  - [ ] Dois segmentos (ocupados = `primary`, disponíveis = `primary-light`)
  - [ ] `innerRadius` ~45, `outerRadius` ~60, `startAngle={90}`, `endAngle={-270}`
  - [ ] Texto central: "72%" (22px, negrito) e "ocupados" (10px, cinza)
- [ ] Legenda à direita: quadrado preenchido "Ocupados — 86 leitos" e quadrado vazado "Disponíveis — 34 leitos"
- [ ] Três mini-cards abaixo (fundo `bg`, raio 8px): **22/30** UTI · **50/70** Enfermaria · **14/20** Apartamento
- [ ] `aria-label` no gráfico: "72% dos leitos ocupados: 86 de 120"

### 5.6 `AdmissionChart`

- [ ] Título "Tendência de internações" e `<select>` à direita: Esta semana / Este mês / Este ano
- [ ] Ao trocar o período, buscar a série correspondente (`getInternacoes(periodo)`)
- [ ] `AreaChart` do Recharts:
  - [ ] `<Area type="monotone">` com traço `primary` de 2,5px
  - [ ] Preenchimento com `linearGradient` (opacidade 25% → 0%)
  - [ ] `XAxis` sem linha de eixo, rótulos Seg–Dom em cinza
  - [ ] Sem `YAxis` visível e sem grade (visual limpo, como na referência)
  - [ ] `ResponsiveContainer` com altura ~170px
- [ ] Tooltip personalizado em pt-BR: "Qui · 64 internações"
- [ ] Carregar com `React.lazy` + `Suspense` (junto com `OccupancyDonut`)
- [ ] `aria-label` com resumo: "Internações da semana: mínimo de 30 na terça e máximo de 70 no sábado"

### 5.7 `AlertList`

- [ ] `Card` com variante `perigo`, título "Alertas de emergência" e ação "Ver todos" → `/emergencia`
- [ ] Itens separados por divisória (`border-danger/20`):
  - [ ] Linha 1: título e local ("Paciente crítico — UTI, Leito 12"), 14px, médio
  - [ ] Linha 2: médico responsável em `text-danger`, 12px
  - [ ] `PriorityBadge` alinhado à direita
- [ ] Ordenação: prioridade alta primeiro
- [ ] Estado vazio: "Nenhum alerta ativo."

### 5.8 `AppointmentsTable`

- [ ] Título "Consultas de hoje" e ação "Ver todas" → `/consultas`
- [ ] `<table>` semântica:
  - [ ] `<caption>` visualmente oculto: "Consultas agendadas para hoje"
  - [ ] Cabeçalhos com `scope="col"`, caixa alta, 11px, cinza: HORÁRIO · PACIENTE · DEPARTAMENTO · STATUS
  - [ ] Horário formatado com `formatHora` (24h)
  - [ ] `StatusBadge` na última coluna
- [ ] Ordenação por horário crescente
- [ ] Abaixo de 640px: renderizar como lista de cards (horário e status na primeira linha, paciente e departamento na segunda)
- [ ] Estado vazio: "Nenhuma consulta para hoje."

### 5.9 `ActivityTimeline`

- [ ] Título "Linha do tempo de atividades"
- [ ] Lista `<ol>` com marcador, descrição (14px) e horário abaixo (12px, cinza, `<time dateTime>`)
- [ ] Ordenação do mais recente para o mais antigo
- [ ] Estado vazio: "Nenhuma atividade registrada hoje."

### ✅ Critérios de conclusão — Fase 5

- [ ] Os 9 componentes estão implementados e fiéis à referência
- [ ] Os 4 estados (carregando, erro, vazio, dados) funcionam em todos os cards
- [ ] Nenhum valor derivado escrito diretamente no JSX
- [ ] Gráficos legíveis no modo escuro
- [ ] Commit e PR da fase abertos

---

## Fase 6 — Montagem da grade do painel

**Estimativa:** 0,5 dia · **Branch:** `feat/fase-6-grade`

### 6.1 Grade desktop (≥ 1280px)

- [ ] Estrutura em `Dashboard.tsx`:
  ```
  ┌──────────────────────────────┬──────────────┐
  │ WelcomeCard (col-span-2)     │ AIInsights   │
  ├──────┬──────┬──────┬─────────┼──────────────┤
  │ KPI  │ KPI  │ KPI  │ KPI     │ Desempenho   │
  ├──────┴──────┼──────┴─────────┤ por          │
  │ Internações │ Ocupação       │ departamento │
  │             │ de leitos      │ (row-span-2) │
  ├─────────────┴───┬────────────┴┬─────────────┤
  │ Alertas         │ Consultas   │ Linha do    │
  │                 │ de hoje     │ tempo       │
  └─────────────────┴─────────────┴─────────────┘
  ```
- [ ] Grade externa: `grid-cols-3 gap-5`
- [ ] Bloco central (KPIs e gráficos): `col-span-2` com uma grade interna própria (`grid-cols-4` para os KPIs, `grid-cols-2` para os gráficos, com o gráfico de internações um pouco mais largo: `grid-cols-[1.25fr_1fr]`)
- [ ] `DepartmentPerformance`: `row-span-2` na coluna direita
- [ ] Última linha: 3 colunas iguais
- [ ] `items-stretch` para alinhar as alturas

### 6.2 Tablet (768–1279px)

- [ ] Grade com 2 colunas
- [ ] KPIs em 2×2
- [ ] Boas-vindas ocupa as 2 colunas; Assistente IA e Desempenho lado a lado
- [ ] Alertas e Consultas lado a lado; Linha do tempo ocupa as 2 colunas

### 6.3 Celular (< 768px)

- [ ] Uma coluna, na ordem: Boas-vindas → KPIs (2×2) → Alertas → Consultas → Ocupação → Internações → Desempenho → Assistente IA → Linha do tempo
- [ ] Padding da página reduzido para 16px
- [ ] Sem rolagem horizontal

### 6.4 Comparação visual

- [ ] Tirar captura de tela em 1440px e comparar lado a lado com a imagem de referência
- [ ] Ajustar espaçamentos, tamanhos de fonte e alturas até ficarem próximos
- [ ] Validar o modo escuro em todas as larguras

### ✅ Critérios de conclusão — Fase 6

- [ ] Visual em 1440px próximo da referência
- [ ] Sem rolagem horizontal em 375px
- [ ] Ordem de leitura lógica no mobile
- [ ] Commit e PR da fase abertos

---

## Fase 7 — Qualidade, testes e entrega

**Estimativa:** 1 dia · **Branch:** `feat/fase-7-qualidade`

### 7.1 Acessibilidade

- [ ] Contraste AA verificado (texto cinza sobre branco, badges, texto da sidebar)
- [ ] Foco visível em todos os elementos interativos
- [ ] Hierarquia de títulos correta: um `<h1>` (boas-vindas) e `<h2>` nos cards
- [ ] `aria-label` em todos os botões que só têm ícone
- [ ] Gráficos com descrição textual alternativa
- [ ] Respeitar `prefers-reduced-motion` (desligar animações de barras e gráficos)
- [ ] Teste com leitor de tela (NVDA ou VoiceOver) no fluxo principal
- [ ] Auditoria com a extensão axe DevTools sem erros críticos

### 7.2 Revisão de idioma (PT-BR)

- [ ] Buscar strings em inglês no JSX: `grep -rnE ">[A-Z][a-z]+ [a-z]+" src/components` e revisar os resultados
- [ ] Conferir acentuação (Média, Concluída, Clínica, Análises, Médicos, Configurações)
- [ ] Conferir formatação: milhar com ponto, hora em 24h, percentuais sem espaço
- [ ] Conferir os tratamentos "Dr." e "Dra." nos nomes dos médicos
- [ ] Revisar mensagens de erro e de estado vazio

### 7.3 Testes automatizados

- [ ] **Unitários**
  - [ ] `format.test.ts`
  - [ ] `leitos.test.ts`
  - [ ] `greeting.test.ts` (horários limite: 4:59, 5:00, 11:59, 12:00, 17:59, 18:00)
- [ ] **Componentes**
  - [ ] `StatCard` exibe o valor formatado
  - [ ] `AppointmentsTable` exibe "Nenhuma consulta para hoje." quando a lista está vazia
  - [ ] `AlertList` ordena prioridade alta primeiro
  - [ ] `DepartmentPerformance` aplica a cor de perigo para ≥ 90%
  - [ ] Botão de tema alterna `data-theme`
  - [ ] `UserMenu` abre e fecha com Esc
- [ ] Cobertura mínima de 70% em `utils/` e `components/ui/`

### 7.4 Performance

- [ ] Recharts carregado sob demanda (`React.lazy`)
- [ ] SVG da ilustração otimizado (SVGO)
- [ ] Fonte com `display=swap`
- [ ] Lighthouse (desktop): Performance ≥ 90, Acessibilidade ≥ 90, Boas práticas ≥ 90

### 7.5 Build e deploy

- [ ] `npm run build` sem erros nem avisos de TypeScript
- [ ] `npm run preview` funcionando
- [ ] Deploy na Vercel ou Netlify (configurar o fallback de SPA para as rotas)
- [ ] Testar a URL publicada no celular e no desktop

### 7.6 Documentação

- [ ] `README.md` em PT-BR com:
  - [ ] Descrição do projeto
  - [ ] Pré-requisitos (Node 20+)
  - [ ] Como instalar, rodar, testar e gerar a build
  - [ ] Estrutura de pastas
  - [ ] Como trocar os dados mockados pela API real
  - [ ] Como adicionar novos textos ao `pt-BR.ts`
- [ ] Capturas de tela (claro e escuro) no README

### ✅ Critérios de conclusão — Fase 7

- [ ] Todos os testes passando
- [ ] Metas do Lighthouse atingidas
- [ ] Aplicação publicada e acessível
- [ ] README completo
- [ ] PR final aprovado e mesclado na `main`

---

## 🏁 Checklist final de aceite

### Funcional
- [ ] Todas as seções da referência estão presentes no painel
- [ ] Saudação muda conforme o horário
- [ ] Seletor de período do gráfico troca os dados
- [ ] Links "Ver todos" e botões levam às rotas corretas
- [ ] Modo escuro funciona e persiste

### Dados
- [ ] Leitos disponíveis = 34, ocupação = 72%, ocupados = 86 de 120
- [ ] Valores derivados calculados, não escritos diretamente no JSX
- [ ] Serviço simulado pronto para ser trocado por uma API real

### Idioma
- [ ] 100% da interface em PT-BR
- [ ] Números, horas e percentuais no padrão brasileiro
- [ ] `lang="pt-BR"` no HTML

### Qualidade
- [ ] Responsivo de 375px a 1920px
- [ ] Acessível por teclado e leitor de tela
- [ ] Testes passando e build limpa

---

## 🚀 Backlog futuro (fora do escopo)

- [ ] Integração com API real (REST ou GraphQL) usando React Query
- [ ] Autenticação e perfis de acesso (Administrador, Médico, Enfermagem, Farmácia)
- [ ] Páginas completas: Pacientes, Médicos, Consultas, Gestão de leitos, Emergência, Farmácia, Análises, Configurações
- [ ] Alertas de emergência em tempo real (WebSocket ou SSE) com notificação sonora
- [ ] Busca global funcional (pacientes, médicos, leitos)
- [ ] Central de notificações e mensagens
- [ ] Assistente com IA integrado a dados reais
- [ ] Exportação de relatórios em PDF e Excel
- [ ] Internacionalização completa (estrutura pronta para outros idiomas)
- [ ] Conformidade com a LGPD (registro de acessos, mascaramento de dados sensíveis)
- [ ] PWA com uso offline básico

---

## 📝 Registro de decisões e observações

| Data | Decisão / Observação | Responsável |
|---|---|---|
| | KPI "Leitos disponíveis" corrigido para 34; a referência mostrava 86, que é o número de ocupados | |
| | "General" traduzido como "Enfermaria" e "Private" como "Apartamento" (termos usuais em hospitais brasileiros) | |
| | "Upcoming" traduzido como "Agendada" | |
| | Horários exibidos em formato 24h (16:00 em vez de 04:00 PM) | |
| 26/10/2026 | Fase 1: versões instaladas — React 19, Vite 8, Tailwind 4, Vitest 5, React Router 7, Recharts 3, TypeScript 6. Lint com oxlint (padrão do template Vite) no lugar do ESLint | |
| 26/10/2026 | Fase 1: `setupTests.ts` usa `@testing-library/jest-dom/vitest`; `vitest` configurado com `passWithNoTests`; `App.tsx` provisório para validar tokens e tema | |
| 26/10/2026 | Fase 1: Git e PR pendentes — rodar `git init` e o primeiro commit localmente | |
