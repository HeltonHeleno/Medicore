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
  return (
    <span
      aria-hidden
      style={estilo}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary-light font-semibold text-primary ring-2 ring-white/70',
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
