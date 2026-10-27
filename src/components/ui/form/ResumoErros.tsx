import { AlertCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { t } from '../../../i18n/pt-BR';
import { focarCampo, idDoCampo } from './estilos';

export interface ItemErro {
  /** Nome do campo no formulário (ex.: "endereco.cep"). */
  campo: string;
  mensagem: string;
  /** Rótulo legível do campo ("CEP"). Sem ele, mostra só a mensagem. */
  rotulo?: string;
}

/**
 * Lista dos erros depois de tentar salvar, com links que levam a cada campo.
 * `role="alert"`: o leitor de tela anuncia a quantidade assim que aparece.
 */
export function ResumoErros({ erros, tentativa }: { erros: ItemErro[]; tentativa?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  // Reapresenta o resumo a cada nova tentativa de salvar.
  useEffect(() => {
    if (erros.length && tentativa) ref.current?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentativa]);

  if (erros.length === 0) return null;
  return (
    <div
      ref={ref}
      role="alert"
      className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-bg p-4 text-text"
    >
      <p className="flex items-center gap-2 font-semibold text-danger">
        <AlertCircle size={18} aria-hidden />
        {t.erros.resumoValidacao(erros.length)}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-9 text-[14px]">
        {erros.map((e) => (
          <li key={e.campo}>
            <a
              href={`#${idDoCampo(e.campo)}`}
              onClick={(ev) => {
                ev.preventDefault();
                focarCampo(e.campo);
              }}
              className="rounded underline underline-offset-2 hover:text-danger focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {e.rotulo ? `${e.rotulo}: ${e.mensagem}` : e.mensagem}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
