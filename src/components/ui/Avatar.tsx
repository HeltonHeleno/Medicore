import { cn } from '../../utils/cn';

interface AvatarProps {
  nome: string;
  url?: string;
  tamanho?: number;
  className?: string;
}

function iniciais(nome: string) {
  const partes = nome
    .replace(/^(Dra?\.)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  return partes
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/** Avatar circular: foto quando houver, senão as iniciais do nome. Decorativo para leitores de tela. */
export function Avatar({ nome, url, tamanho = 40, className }: AvatarProps) {
  const estilo = { width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.38) };
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={estilo}
        className={cn('shrink-0 rounded-full object-cover', className)}
      />
    );
  }
  // Iniciais desenhadas pelo CSS (`data-iniciais`): são decorativas e não entram no nome
  // acessível do botão que contém o avatar (WCAG 2.5.3, "rótulo no nome").
  return (
    <span
      aria-hidden
      style={estilo}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary-light font-semibold text-on-primary-light ring-2 ring-white/70 before:content-[attr(data-iniciais)]',
        className,
      )}
      data-iniciais={iniciais(nome)}
    />
  );
}
