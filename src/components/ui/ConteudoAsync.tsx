import type { ReactNode } from 'react';
import type { EstadoAsync } from '../../hooks/useAsync';
import { EmptyState, ErrorState } from './EmptyState';
import { SkeletonLinhas } from './Skeleton';

interface ConteudoAsyncProps<T> {
  estado: EstadoAsync<T>;
  /** Mensagem quando os dados chegam vazios (lista sem itens). */
  vazio?: string;
  /** Esqueleto personalizado; o padrão são 4 linhas. */
  carregando?: ReactNode;
  /** Regra própria de "vazio"; por padrão, um array sem itens. */
  estaVazio?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}

const arrayVazio = (data: unknown) => Array.isArray(data) && data.length === 0;

/**
 * Resolve os 4 estados de um card: carregando, erro, vazio e com dados.
 * Uso: <ConteudoAsync estado={useAlertas()} vazio={t.vazio.alertas}>{(alertas) => ...}</ConteudoAsync>
 */
export function ConteudoAsync<T>({
  estado,
  vazio,
  carregando,
  estaVazio = arrayVazio,
  children,
}: ConteudoAsyncProps<T>) {
  const { data, carregando: estaCarregando, erro, recarregar } = estado;

  if (estaCarregando) {
    return <div aria-busy="true">{carregando ?? <SkeletonLinhas />}</div>;
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (data === null || estaVazio(data)) return vazio ? <EmptyState mensagem={vazio} /> : null;
  return <>{children(data)}</>;
}
