import { AlertCircle, Star } from 'lucide-react';
import { useRef, type KeyboardEvent, type Ref } from 'react';
import { SETORES, nomeSetor } from '../../config/setores';
import { t } from '../../i18n/pt-BR';
import { tl } from '../../i18n/pt-BR/leitos';
import type { LeitoAvaliado } from '../../types';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { Campo } from '../ui/form/Campo';
import { Checkbox } from '../ui/form/Checkbox';
import { Textarea } from '../ui/form/Textarea';
import { idDoCampo } from '../ui/form/estilos';
import { ehExcecao } from './acoes-leito';

interface SeletorLeitoProps {
  /** Resultado de A11 (`avaliarLeitos`), com o sugerido marcado. */
  avaliados: readonly LeitoAvaliado[];
  valor: string;
  aoMudar: (leitoId: string) => void;
  /** Mostra os leitos de exceção (perfil ou isolamento) como escolhíveis. */
  permitirExcecao?: boolean;
  usarExcecao?: boolean;
  aoMudarUsarExcecao?: (usar: boolean) => void;
  justificativa?: string;
  aoMudarJustificativa?: (texto: string) => void;
  erroJustificativa?: string;
  erro?: string;
  /** Ação quando nenhum leito serve (ex.: "Pedir leito (eletiva)", L9). */
  semCompativel?: { rotulo: string; aoClicar: () => void };
  rotulo?: string;
  nome?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Escolha de leito como grupo de rádio (padrão do `SeletorHorario`): ↑ ↓ ← → Home End movem
 * o foco, Espaço ou Enter escolhem. Os ocupados não aparecem; os incompatíveis continuam
 * focáveis para o leitor de tela ler o motivo, mas só os de exceção podem ser escolhidos, e
 * só com "Usar mesmo assim" e justificativa.
 */
export function SeletorLeito({
  avaliados,
  valor,
  aoMudar,
  permitirExcecao,
  usarExcecao,
  aoMudarUsarExcecao,
  justificativa = '',
  aoMudarJustificativa,
  erroJustificativa,
  erro,
  semCompativel,
  rotulo = tl.seletor.rotulo,
  nome = 'leitoId',
  ref,
}: SeletorLeitoProps) {
  const grupoRef = useRef<HTMLDivElement | null>(null);
  const id = idDoCampo(nome);
  const s = tl.seletor;

  // Ocupados, em higienização e bloqueados não são opção: ficam de fora da lista.
  const lista = avaliados.filter((a) => !a.motivos.includes('situacao'));
  const escolhivel = (a: LeitoAvaliado) => a.compativel || (Boolean(usarExcecao) && ehExcecao(a));
  const compativeis = lista.filter((a) => a.compativel).length;
  const temExcecao = lista.some(ehExcecao);
  const escolhido = lista.find((a) => a.leito.id === valor);

  // Setor do sugerido primeiro; dentro do setor, a ordem de A11 (sugerido no topo).
  const setorSugerido = lista.find((a) => a.sugerido)?.leito.setorId;
  const grupos = [...SETORES]
    .sort((x, y) => Number(y.id === setorSugerido) - Number(x.id === setorSugerido))
    .map((setor) => ({ setor, itens: lista.filter((a) => a.leito.setorId === setor.id) }))
    .filter((g) => g.itens.length > 0);
  const ordem = grupos.flatMap((g) => g.itens);
  const indiceFocavel = Math.max(
    0,
    ordem.findIndex((a) => a.leito.id === valor) >= 0
      ? ordem.findIndex((a) => a.leito.id === valor)
      : ordem.findIndex(escolhivel),
  );

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    const itens = Array.from(
      grupoRef.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [],
    );
    const atual = itens.indexOf(document.activeElement as HTMLElement);
    if (atual < 0) return;
    const passo: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    let proximo: number | null = null;
    if (e.key in passo) proximo = Math.min(itens.length - 1, Math.max(0, atual + passo[e.key]));
    else if (e.key === 'Home') proximo = 0;
    else if (e.key === 'End') proximo = itens.length - 1;
    if (proximo !== null) {
      e.preventDefault();
      itens[proximo].focus();
    }
  }

  const ligarRef = (el: HTMLDivElement | null) => {
    grupoRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-rotulo`} className="text-[13.5px] font-medium">
          {rotulo}
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
          <span className="sr-only">{` (${t.formulario.obrigatorio})`}</span>
        </p>
        <p className="text-[12.5px] text-text-muted">{s.livres(compativeis)}</p>
      </div>

      {compativeis === 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-bg px-4 py-3 text-[14px]">
          <span>{s.nenhumCompativel}</span>
          {semCompativel && (
            <Button tamanho="sm" variante="contorno" onClick={semCompativel.aoClicar}>
              {semCompativel.rotulo}
            </Button>
          )}
        </div>
      )}

      {permitirExcecao && temExcecao && (
        <Checkbox
          rotulo={s.usarMesmoAssim}
          descricao={s.usarMesmoAssimDica}
          checked={Boolean(usarExcecao)}
          onChange={(e) => aoMudarUsarExcecao?.(e.target.checked)}
        />
      )}

      {ordem.length > 0 && (
        <div
          ref={ligarRef}
          id={id}
          role="radiogroup"
          aria-labelledby={`${id}-rotulo`}
          aria-describedby={erro ? `${id}-erro` : undefined}
          aria-invalid={erro ? true : undefined}
          aria-required
          tabIndex={-1}
          onKeyDown={aoTeclar}
          className="space-y-3 outline-none"
        >
          {grupos.map(({ setor, itens }) => (
            <div key={setor.id}>
              <p aria-hidden className="mb-1.5 text-[12.5px] font-semibold text-text-muted">
                {setor.nome}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {itens.map((a) => {
                  const i = ordem.indexOf(a);
                  const pode = escolhivel(a);
                  const marcado = a.leito.id === valor;
                  const excecao = !a.compativel && pode;
                  const motivos = a.motivos.map((m) => tl.incompatibilidade[m]);
                  return (
                    <div
                      key={a.leito.id}
                      role="radio"
                      aria-checked={marcado}
                      aria-disabled={!pode || undefined}
                      aria-label={s.opcaoLeitor(
                        a.leito.codigo,
                        [
                          nomeSetor(a.leito.setorId),
                          a.sugerido ? s.sugerido : undefined,
                          excecao ? s.excecao : undefined,
                          ...motivos,
                        ].filter((x): x is string => Boolean(x)),
                      )}
                      tabIndex={i === indiceFocavel ? 0 : -1}
                      onClick={() => pode && aoMudar(a.leito.id)}
                      onKeyDown={(e) => {
                        if ((e.key === ' ' || e.key === 'Enter') && pode) {
                          e.preventDefault();
                          aoMudar(a.leito.id);
                        }
                      }}
                      className={cn(
                        'flex min-h-14 cursor-pointer flex-col justify-center rounded-lg border px-2 py-1.5 select-none',
                        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none',
                        marcado
                          ? 'border-primary bg-primary text-on-primary'
                          : pode
                            ? 'border-border-input bg-card hover:bg-primary-light/50'
                            : 'cursor-not-allowed border-dashed border-border bg-bg text-text-muted',
                      )}
                    >
                      <span className="flex items-center gap-1 text-[14px] font-semibold tabular-nums">
                        {a.sugerido && <Star size={13} aria-hidden className="shrink-0" />}
                        {a.leito.codigo}
                      </span>
                      <span aria-hidden className="text-[11px] leading-tight">
                        {a.sugerido ? s.sugerido : excecao ? s.excecao : motivos[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {escolhido && ehExcecao(escolhido) && usarExcecao && (
        <Campo
          rotulo={s.justificativa}
          nome="justificativaExcecao"
          obrigatorio
          dica={s.justificativaDica}
          erro={erroJustificativa}
        >
          <Textarea
            value={justificativa}
            onChange={(e) => aoMudarJustificativa?.(e.target.value)}
            maxLength={300}
            rows={2}
          />
        </Campo>
      )}

      {erro && (
        <p
          id={`${id}-erro`}
          className="flex items-start gap-1 text-[12.5px] font-medium text-danger"
        >
          <AlertCircle size={14} aria-hidden className="mt-px shrink-0" />
          {erro}
        </p>
      )}
    </div>
  );
}
