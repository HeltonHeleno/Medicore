import { AlertTriangle, ArrowLeft, RotateCw } from 'lucide-react';
import { useEffect } from 'react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { t } from '../../i18n/pt-BR';
import { Button, ButtonLink } from './Button';

/**
 * Tela de erro inesperado de uma rota (E-09). Mostrada no lugar da página que falhou,
 * mantendo o restante do app funcionando.
 */
export function ErroDeRota() {
  const erro = useRouteError();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(erro);
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
