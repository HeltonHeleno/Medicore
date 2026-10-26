import { ArrowLeft, Construction } from 'lucide-react';
import { ButtonLink } from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { t } from '../i18n/pt-BR';

/** Página provisória para os itens do menu que ainda não foram implementados. */
export default function Placeholder({ titulo }: { titulo: string }) {
  useDocumentTitle(titulo);
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-card p-8 shadow-[var(--shadow-card)]">
      <Construction size={32} className="text-primary" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">{titulo}</h1>
      <p className="mt-2 text-text-muted">{t.paginas.emConstrucao}</p>
      <p className="text-text-muted">{t.paginas.emConstrucaoDetalhe}</p>
      <ButtonLink to="/" iconeEsquerda={<ArrowLeft size={17} />} className="mt-6">
        {t.paginas.voltarPainel}
      </ButtonLink>
    </section>
  );
}
