import { ArrowLeft } from 'lucide-react';
import { ButtonLink } from '../components/ui/Button';
import { t } from '../i18n/pt-BR';

export default function NotFound() {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-card p-8 shadow-[var(--shadow-card)]">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="mt-3 text-2xl font-bold">{t.paginas.naoEncontrada}</h1>
      <ButtonLink to="/" iconeEsquerda={<ArrowLeft size={17} />} className="mt-6">
        {t.paginas.voltarPainel}
      </ButtonLink>
    </section>
  );
}
