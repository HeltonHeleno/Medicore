import { AlertTriangle, ArrowLeft, RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { t } from '@medicore/dominio/i18n/pt-BR';
import { capturarErro } from '../../monitoramento';
import { Button, ButtonLink } from './Button';

/**
 * Tela de erro inesperado de uma rota (E-09). Mostrada no lugar da página que falhou,
 * mantendo o restante do app funcionando. Com o monitoramento ligado (Fase 23), o erro vai para
 * o Sentry e a tela mostra o código do evento, para o suporte achar o erro.
 */
export function ErroDeRota() {
  const erro = useRouteError();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState<string>();

  useEffect(() => {
    console.error(erro);
    let ativo = true;
    void capturarErro(erro, 'rota').then((id) => {
      if (ativo && id) setCodigo(id.slice(0, 8));
    });
    return () => {
      ativo = false;
    };
  }, [erro]);

  const detalhe = isRouteErrorResponse(erro)
    ? `${erro.status} ${erro.statusText}`
    : erro instanceof Error
      ? erro.message
      : undefined;

  return (
    <section
      role="alert"
      className="rounded-[var(--radius-card)] border border-border bg-card p-8 shadow-[var(--shadow-card)]"
    >
      <AlertTriangle size={32} className="text-danger" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">{t.erros.inesperadoTitulo}</h1>
      <p className="mt-2 text-text-muted">{t.erros.inesperadoDescricao}</p>
      {codigo && (
        <p className="mt-2 text-[13px] text-text-muted">
          {t.erros.codigoDoErro} <code className="font-mono">{codigo}</code>
        </p>
      )}
      {import.meta.env.DEV && detalhe && (
        <pre className="mt-4 overflow-x-auto rounded-md bg-bg p-3 text-[12px] text-text-muted">
          {detalhe}
        </pre>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button iconeEsquerda={<RotateCw size={16} />} onClick={() => navigate(0)}>
          {t.erro.tentarNovamente}
        </Button>
        <ButtonLink to="/" variante="contorno" iconeEsquerda={<ArrowLeft size={16} />}>
          {t.paginas.voltarPainel}
        </ButtonLink>
      </div>
    </section>
  );
}
