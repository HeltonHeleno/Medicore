import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '../../../i18n/pt-BR';
import type { Ordem } from '../../../types';
import { cn } from '../../../utils/cn';
import { EmptyState, ErrorState } from '../EmptyState';
import { Skeleton } from '../Skeleton';

export interface Coluna<T> {
  id: string;
  titulo: string;
  celula: (linha: T) => ReactNode;
  ordenavel?: boolean;
  /** Alinhamento e largura da coluna na tabela. */
  className?: string;
  /** Na versão em cartões: esconde a coluna (ex.: ações vão para o canto). */
  ocultarNoCartao?: boolean;
}

export interface OrdenacaoTabela {
  coluna: string;
  ordem: Ordem;
}

interface SelecaoTabela {
  selecionados: ReadonlySet<string>;
  aoMudar: (selecionados: Set<string>) => void;
  /** Linhas que não podem ser selecionadas (ex.: consultas já registradas). */
  podeSelecionar?: (chave: string) => boolean;
}

interface DataTableProps<T> {
  /** Título da tabela para leitores de tela (`<caption>`). */
  legenda: string;
  colunas: Coluna<T>[];
  linhas: T[] | null;
  chave: (linha: T) => string;
  /** Nome legível da linha (rótulo da caixa de seleção). */
  nomeDaLinha: (linha: T) => string;
  carregando?: boolean;
  erro?: Error | null;
  aoTentarNovamente?: () => void;
  mensagemVazia?: string;
  /** Ação do estado vazio (ex.: "Limpar filtros"). */
  acaoVazia?: { rotulo: string; aoClicar: () => void };
  ordenacao?: OrdenacaoTabela;
  aoOrdenar?: (coluna: string) => void;
  selecao?: SelecaoTabela;
  /** Ações da linha (ex.: `MenuAcoes`): última coluna na tabela, canto do cartão no celular. */
  acoes?: (linha: T) => ReactNode;
  /** Destaque visual de uma linha (ex.: consulta atrasada). */
  destacar?: (linha: T) => boolean;
}

function CaixaTodos({
  marcado,
  parcial,
  aoMudar,
}: {
  marcado: boolean;
  parcial: boolean;
  aoMudar: (v: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = parcial;
  }, [parcial]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={t.lista.selecionarTodos}
      checked={marcado}
      onChange={(e) => aoMudar(e.target.checked)}
      className="size-[18px] cursor-pointer accent-primary"
    />
  );
}

/**
 * Tabela de listagem:
 * - colunas declarativas, ordenação com `aria-sort`;
 * - abaixo de 640px de largura do contêiner, vira lista de cartões (container query);
 * - estados carregando, vazio e erro;
 * - seleção múltipla opcional (registro em lote, P13).
 */
export function DataTable<T>({
  legenda,
  colunas,
  linhas,
  chave,
  nomeDaLinha,
  carregando,
  erro,
  aoTentarNovamente,
  mensagemVazia = t.lista.nenhumRegistro,
  acaoVazia,
  ordenacao,
  aoOrdenar,
  selecao,
  acoes,
  destacar,
}: DataTableProps<T>) {
  if (erro) return <ErrorState aoTentarNovamente={aoTentarNovamente} />;

  if (carregando && !linhas) {
    return (
      <div role="status" aria-busy="true" className="space-y-3 py-2">
        <span className="sr-only">{t.lista.carregando}</span>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} altura={40} />
        ))}
      </div>
    );
  }

  if (!linhas || linhas.length === 0) {
    return <EmptyState mensagem={mensagemVazia} acao={acaoVazia} />;
  }

  const selecionaveis = selecao
    ? linhas.map(chave).filter((k) => selecao.podeSelecionar?.(k) ?? true)
    : [];
  const marcadosNaPagina = selecionaveis.filter((k) => selecao?.selecionados.has(k));
  const alternar = (k: string, marcar: boolean) => {
    if (!selecao) return;
    const proximo = new Set(selecao.selecionados);
    if (marcar) proximo.add(k);
    else proximo.delete(k);
    selecao.aoMudar(proximo);
  };
  const alternarTodos = (marcar: boolean) => {
    if (!selecao) return;
    const proximo = new Set(selecao.selecionados);
    for (const k of selecionaveis) {
      if (marcar) proximo.add(k);
      else proximo.delete(k);
    }
    selecao.aoMudar(proximo);
  };
  const caixaDaLinha = (linha: T) => {
    const k = chave(linha);
    const pode = selecao?.podeSelecionar?.(k) ?? true;
    return (
      <input
        type="checkbox"
        aria-label={t.lista.selecionarLinha(nomeDaLinha(linha))}
        checked={selecao?.selecionados.has(k) ?? false}
        disabled={!pode}
        onChange={(e) => alternar(k, e.target.checked)}
        className="size-[18px] cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
      />
    );
  };

  const [principal, ...demais] = colunas;

  return (
    <div className="@container" aria-busy={carregando || undefined}>
      {/* Tabela: contêiner com 640px ou mais */}
      <div className="hidden overflow-x-auto @min-[640px]:block">
        <table className="w-full border-collapse text-left text-[14px]">
          <caption className="sr-only">{legenda}</caption>
          <thead>
            <tr className="border-b border-border text-[12px] tracking-wide text-text-muted uppercase">
              {selecao && (
                <th scope="col" className="w-10 py-3 pr-2">
                  <CaixaTodos
                    marcado={
                      selecionaveis.length > 0 && marcadosNaPagina.length === selecionaveis.length
                    }
                    parcial={
                      marcadosNaPagina.length > 0 && marcadosNaPagina.length < selecionaveis.length
                    }
                    aoMudar={alternarTodos}
                  />
                </th>
              )}
              {colunas.map((c) => {
                const ativa = ordenacao?.coluna === c.id;
                const Icone = !ativa
                  ? ArrowUpDown
                  : ordenacao.ordem === 'asc'
                    ? ArrowUp
                    : ArrowDown;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={
                      ativa ? (ordenacao.ordem === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn('py-3 pr-4 font-medium', c.className)}
                  >
                    {c.ordenavel && aoOrdenar ? (
                      <button
                        type="button"
                        onClick={() => aoOrdenar(c.id)}
                        className="inline-flex items-center gap-1 rounded uppercase hover:text-text focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        {c.titulo}
                        <Icone size={14} aria-hidden className={cn(!ativa && 'opacity-50')} />
                      </button>
                    ) : (
                      c.titulo
                    )}
                  </th>
                );
              })}
              {acoes && (
                <th scope="col" className="w-12 py-3">
                  <span className="sr-only">{t.lista.acoes}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr
                key={chave(linha)}
                className={cn(
                  'border-b border-border last:border-0',
                  destacar?.(linha) && 'bg-danger-bg/60',
                )}
              >
                {selecao && <td className="py-3 pr-2">{caixaDaLinha(linha)}</td>}
                {colunas.map((c, i) =>
                  i === 0 ? (
                    <th key={c.id} scope="row" className={cn('py-3 pr-4 font-medium', c.className)}>
                      {c.celula(linha)}
                    </th>
                  ) : (
                    <td key={c.id} className={cn('py-3 pr-4', c.className)}>
                      {c.celula(linha)}
                    </td>
                  ),
                )}
                {acoes && <td className="py-1.5 text-right">{acoes(linha)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cartões: contêiner estreito (celular) */}
      <ul className="space-y-3 @min-[640px]:hidden" aria-label={legenda}>
        {linhas.map((linha) => (
          <li
            key={chave(linha)}
            className={cn(
              'rounded-lg border border-border p-4',
              destacar?.(linha) && 'border-danger/30 bg-danger-bg/60',
            )}
          >
            <div className="flex items-start gap-3">
              {selecao && <div className="pt-0.5">{caixaDaLinha(linha)}</div>}
              <div className="min-w-0 flex-1 font-semibold">{principal.celula(linha)}</div>
              {acoes?.(linha)}
            </div>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13.5px]">
              {demais
                .filter((c) => !c.ocultarNoCartao)
                .map((c) => (
                  <div key={c.id} className="contents">
                    <dt className="text-text-muted">{c.titulo}</dt>
                    <dd className="min-w-0">{c.celula(linha)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
