import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { classesBotao, type PropsVisuais } from './buttonStyles';

function Conteudo({
  iconeEsquerda,
  iconeDireita,
  children,
}: PropsVisuais & { children: ReactNode }) {
  return (
    <>
      {iconeEsquerda && (
        <span aria-hidden className="inline-flex shrink-0">
          {iconeEsquerda}
        </span>
      )}
      <span>{children}</span>
      {iconeDireita && (
        <span aria-hidden className="inline-flex shrink-0">
          {iconeDireita}
        </span>
      )}
    </>
  );
}

type ButtonProps = PropsVisuais &
  ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> };

export function Button({
  variante,
  tamanho,
  largo,
  iconeEsquerda,
  iconeDireita,
  className,
  children,
  type = 'button',
  ...resto
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(classesBotao({ variante, tamanho, largo }), className)}
      {...resto}
    >
      <Conteudo iconeEsquerda={iconeEsquerda} iconeDireita={iconeDireita}>
        {children}
      </Conteudo>
    </button>
  );
}

type ButtonLinkProps = PropsVisuais & LinkProps;

/** Link de navegação com aparência de botão (ex.: "Ver agenda"). */
export function ButtonLink({
  variante,
  tamanho,
  largo,
  iconeEsquerda,
  iconeDireita,
  className,
  children,
  ...resto
}: ButtonLinkProps) {
  return (
    <Link className={cn(classesBotao({ variante, tamanho, largo }), className)} {...resto}>
      <Conteudo iconeEsquerda={iconeEsquerda} iconeDireita={iconeDireita}>
        {children}
      </Conteudo>
    </Link>
  );
}
