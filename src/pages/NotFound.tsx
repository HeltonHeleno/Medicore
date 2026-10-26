import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { t } from '../i18n/pt-BR';

export default function NotFound() {
  useDocumentTitle(t.paginas.naoEncontrada);
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-card p-8 shadow-[var(--shadow-card)]">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="mt-3 text-2xl font-bold">{t.paginas.naoEncontrada}</h1>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 font-medium text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {t.paginas.voltarPainel}
      </Link>
    </section>
  );
}
