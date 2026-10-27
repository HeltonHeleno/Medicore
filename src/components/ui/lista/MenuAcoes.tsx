import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { useId, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useMenuSuspenso } from '../../../hooks/useMenuSuspenso';
import { t } from '../../../i18n/pt-BR';
import { cn } from '../../../utils/cn';

export interface AcaoMenu {
  rotulo: string;
  icone?: LucideIcon;
  /** Link (navegação) ou ação (botão). */
  href?: string;
  aoClicar?: () => void;
  perigo?: boolean;
  desabilitado?: boolean;
}

interface MenuAcoesProps {
  /** Nome do registro, para o rótulo acessível ("Mais ações para João Pereira"). */
  nome: string;
  acoes: AcaoMenu[];
}

const LARGURA = 208;
const classeItem =
  'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[14px] hover:bg-bg focus-visible:bg-bg focus-visible:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

/**
 * Botão "⋯" com menu de ações da linha. O menu é desenhado por cima da página
 * (portal + posição fixa), então não é cortado pela rolagem da tabela.
 */
export function MenuAcoes({ nome, acoes }: MenuAcoesProps) {
  const {
    aberto,
    alternar,
    fechar,
    setAberto,
    raizRef,
    botaoRef,
    menuRef,
    aoTeclarNoMenu,
    aoTeclarNoBotao,
  } = useMenuSuspenso();
  const menuId = useId();
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!aberto || !botaoRef.current) return;
    const r = botaoRef.current.getBoundingClientRect();
    const alturaMenu = acoes.length * 38 + 12;
    const cabeAbaixo = r.bottom + alturaMenu + 8 < window.innerHeight;
    setPosicao({
      top: cabeAbaixo ? r.bottom + 4 : Math.max(8, r.top - alturaMenu - 4),
      left: Math.max(8, Math.min(r.right - LARGURA, window.innerWidth - LARGURA - 8)),
    });
    // Rolar ou redimensionar fecha o menu (a posição deixaria de bater com o botão).
    const aoMover = () => setAberto(false);
    window.addEventListener('resize', aoMover);
    window.addEventListener('scroll', aoMover, true);
    return () => {
      window.removeEventListener('resize', aoMover);
      window.removeEventListener('scroll', aoMover, true);
    };
  }, [aberto, acoes.length, botaoRef, setAberto]);

  return (
    <div ref={raizRef} className="inline-flex">
      <button
        ref={botaoRef}
        type="button"
        aria-label={t.lista.maisAcoes(nome)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? menuId : undefined}
        onClick={alternar}
        onKeyDown={aoTeclarNoBotao}
        className="inline-flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-bg hover:text-text focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>

      {aberto &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={t.lista.maisAcoes(nome)}
            onKeyDown={aoTeclarNoMenu}
            style={{ top: posicao.top, left: posicao.left, width: LARGURA }}
            className="fixed z-50 rounded-lg border border-border bg-card p-1.5 text-text shadow-lg"
          >
            {acoes.map(({ rotulo, icone: Icone, href, aoClicar, perigo, desabilitado }) => {
              const conteudo = (
                <>
                  {Icone && <Icone size={16} aria-hidden />}
                  {rotulo}
                </>
              );
              const classes = cn(classeItem, perigo && 'text-danger');
              return href && !desabilitado ? (
                <Link
                  key={rotulo}
                  to={href}
                  role="menuitem"
                  tabIndex={-1}
                  className={classes}
                  onClick={() => fechar(false)}
                >
                  {conteudo}
                </Link>
              ) : (
                <button
                  key={rotulo}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-disabled={desabilitado || undefined}
                  className={classes}
                  onClick={() => {
                    if (desabilitado) return;
                    fechar();
                    aoClicar?.();
                  }}
                >
                  {conteudo}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
