import { Server, X } from 'lucide-react';
import { useState } from 'react';
import { t } from '@medicore/dominio/i18n/pt-BR';
import { apagarDadosAntigos, CHAVE_AVISO_SERVIDOR, lerVisto } from './aviso-servidor';

/**
 * Fase 27 (27.2.3, D27) — Modo API: aviso único no primeiro acesso depois da troca. Apaga os dados
 * fictícios que estavam só neste navegador e explica que agora tudo fica no servidor.
 */
export function AvisoServidor() {
  const [visto, setVisto] = useState(lerVisto);
  if (!import.meta.env.VITE_API_URL || visto) return null;
  const fechar = () => {
    apagarDadosAntigos();
    try {
      localStorage.setItem(CHAVE_AVISO_SERVIDOR, 'visto');
    } catch {
      /* sem acesso ao armazenamento */
    }
    setVisto(true);
  };
  return (
    <section
      aria-labelledby="aviso-servidor-titulo"
      className="mb-5 flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-[14px]"
    >
      <Server size={18} aria-hidden className="mt-0.5 shrink-0 text-primary" />
      <div className="flex-1">
        <h2 id="aviso-servidor-titulo" className="font-semibold text-text">
          {t.demo.servidorTitulo}
        </h2>
        <p className="mt-1 text-text-muted">{t.demo.servidorMensagem}</p>
      </div>
      <button
        type="button"
        onClick={fechar}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-on-primary-light hover:bg-primary-light/40 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <X size={14} aria-hidden />
        {t.demo.servidorEntendi}
      </button>
    </section>
  );
}
