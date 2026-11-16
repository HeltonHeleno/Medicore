import { ArrowLeft, SearchX } from 'lucide-react';
import { ButtonLink } from './Button';

interface NaoEncontradoProps {
  titulo: string;
  descricao?: string;
  voltarPara: string;
  rotuloVoltar: string;
}

/** E-08: o registro do endereço não existe (excluído ou link errado). */
export function NaoEncontrado({ titulo, descricao, voltarPara, rotuloVoltar }: NaoEncontradoProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-card p-8 shadow-[var(--shadow-card)]">
      <SearchX size={32} className="text-text-muted" aria-hidden />
      <h1 tabIndex={-1} className="mt-4 text-2xl font-bold outline-none">
        {titulo}
      </h1>
      {descricao && <p className="mt-2 text-text-muted">{descricao}</p>}
      <ButtonLink to={voltarPara} iconeEsquerda={<ArrowLeft size={17} />} className="mt-6">
        {rotuloVoltar}
      </ButtonLink>
    </section>
  );
}
