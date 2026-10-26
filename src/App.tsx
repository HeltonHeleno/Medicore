/**
 * Página provisória da Fase 1.
 * Serve para validar a fonte, os tokens de cor e o modo escuro.
 * Será substituída pelas rotas e pelo layout na Fase 3.
 */
const amostras = [
  { nome: 'sidebar', classe: 'bg-sidebar' },
  { nome: 'primary', classe: 'bg-primary' },
  { nome: 'primary-light', classe: 'bg-primary-light' },
  { nome: 'bg', classe: 'bg-bg' },
  { nome: 'card', classe: 'bg-card' },
  { nome: 'danger', classe: 'bg-danger' },
  { nome: 'danger-bg', classe: 'bg-danger-bg' },
  { nome: 'warning', classe: 'bg-warning' },
];

function alternarTema() {
  const raiz = document.documentElement;
  const novo = raiz.dataset.theme === 'dark' ? 'light' : 'dark';
  raiz.dataset.theme = novo;
  try {
    localStorage.setItem('medicore-tema', novo);
  } catch {
    /* armazenamento indisponível: o tema vale só nesta visita */
  }
}

export default function App() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <section className="rounded-[var(--radius-card)] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">
          Fase 1 concluída
        </p>
        <h1 className="mt-1 text-3xl font-bold">MediCore — Operações Hospitalares</h1>
        <p className="mt-2 text-text-muted">
          Projeto configurado com Vite, React, TypeScript e Tailwind CSS. Esta página é provisória e
          serve apenas para conferir a fonte, as cores e o modo escuro.
        </p>

        <button
          type="button"
          onClick={alternarTema}
          className="mt-5 rounded-lg bg-primary px-5 py-3 font-medium text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Alternar modo escuro
        </button>

        <h2 className="mt-8 mb-3 text-base font-semibold">Tokens de cor</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {amostras.map((a) => (
            <li key={a.nome} className="text-xs text-text-muted">
              <span className={`mb-1 block h-12 rounded-lg border border-border ${a.classe}`} />
              {a.nome}
            </li>
          ))}
        </ul>

        <h2 className="mt-8 mb-3 text-base font-semibold">Tipografia (Inter)</h2>
        <p className="font-normal">Regular 400 — Pacientes, Médicos, Consultas</p>
        <p className="font-medium">Médio 500 — Gestão de leitos</p>
        <p className="font-semibold">Seminegrito 600 — Desempenho por departamento</p>
        <p className="font-bold">Negrito 700 — 1.248 pacientes</p>
      </section>
    </main>
  );
}
