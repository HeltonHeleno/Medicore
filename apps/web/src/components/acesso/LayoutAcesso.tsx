import { t } from '@medicore/dominio/i18n/pt-BR';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

/** Fase 28 — Moldura das telas de acesso (fora do layout do sistema). */
export function LayoutAcesso({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    document.title = `${titulo} · ${t.app.nome}`;
  }, [titulo]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
      <main id="conteudo" className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-[24px] font-bold tracking-tight text-sidebar dark:text-text">
            {t.app.nome}
          </p>
          <p className="text-[13px] text-text-muted">{t.app.subtitulo}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-[20px] font-semibold">{titulo}</h1>
          {descricao && <p className="mt-1 text-[14px] text-text-muted">{descricao}</p>}
          <div className="mt-5">{children}</div>
        </div>
      </main>
    </div>
  );
}
