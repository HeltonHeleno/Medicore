import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { tl } from '../../i18n/pt-BR/leitos';
import type { LeitoDetalhado } from '../../types';
import { cn } from '../../utils/cn';
import { formatarDuracao, minutosDesde } from '../../utils/tempos';
import { TempoDecorrido } from '../ui/TempoDecorrido';
import { MenuAcoes, type AcaoMenu } from '../ui/lista/MenuAcoes';
import { acoesDoLeito, destinoInternar, type AcaoLeito } from './acoes-leito';
import { BadgeLeito } from './BadgeLeito';
import { BORDA_LEITO } from './estilos-leito';

const ROTULO_ACAO: Record<AcaoLeito, string> = {
  internar: tl.cartao.internar,
  concluir: tl.cartao.concluir,
  bloquear: tl.cartao.bloquear,
  desbloquear: tl.cartao.desbloquear,
  transferir: tl.cartao.transferir,
  darAlta: tl.cartao.darAlta,
  cancelarReserva: tl.cartao.cancelarReserva,
};

/** Texto que completa o nome acessível do cartão. */
function detalheLeitor(leito: LeitoDetalhado): string | undefined {
  const o = leito.ocupante;
  if (leito.status === 'ocupado' && o) {
    return [
      tl.cartao.pacienteLeitor(o.nome, o.idade),
      o.diaInternacao ? tl.avisos.diaInternacao(o.diaInternacao) : o.atendimentoNumero,
      o.temAlergia ? tl.cartao.alergiaLeitor : undefined,
      o.previsaoAltaVencida ? tl.avisos.altaPrevistaVencida : undefined,
    ]
      .filter(Boolean)
      .join(', ');
  }
  if (leito.status === 'livre') return undefined;
  const partes = [tl.cartao.ha(formatarDuracao(minutosDesde(leito.desde)))];
  if (leito.status === 'reservado' && leito.reserva) {
    partes.push(tl.cartao.reservadoPara(leito.reserva.pacienteNome));
  }
  if (leito.status === 'bloqueado' && leito.bloqueio) partes.push(leito.bloqueio.motivo);
  if (leito.higienizacaoAtrasada === 'alerta') partes.push(tl.destaques.higienizacaoAlerta);
  else if (leito.higienizacaoAtrasada) partes.push(tl.destaques.higienizacaoDestaque);
  if (leito.reservaLonga) partes.push(tl.destaques.reservaLonga);
  if (leito.liberacaoVencida) partes.push(tl.avisos.liberacaoVencida);
  return partes.join(', ');
}

function Destaque({ children, forte }: { children: ReactNode; forte?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[12px] font-semibold',
        forte ? 'text-danger' : 'text-warning',
      )}
    >
      {forte ? (
        <AlertTriangle size={12} aria-hidden className="shrink-0" />
      ) : (
        <Clock size={12} aria-hidden className="shrink-0" />
      )}
      {children}
    </span>
  );
}

interface CartaoLeitoProps {
  leito: LeitoDetalhado;
  /** Ação escolhida no botão rápido ou no menu. Sem ela, o cartão só mostra o link. */
  aoAcao?: (acao: AcaoLeito, leito: LeitoDetalhado) => void;
  /** Cartão destacado pela busca de paciente no mapa (M24). */
  destacado?: boolean;
  className?: string;
}

/**
 * Cartão do mapa de leitos. O código é um link para o detalhe, com nome acessível completo
 * ("UTI-03, Em higienização, há 40 min"); a ação rápida é um botão separado com nome
 * próprio ("Concluir higienização do leito UTI-03"). Memorizado para o mapa de 130 leitos.
 */
function CartaoLeitoBase({ leito, aoAcao, destacado, className }: CartaoLeitoProps) {
  const o = leito.ocupante;
  const acoes = aoAcao ? acoesDoLeito(leito) : [];
  const rapida = acoes.includes('concluir')
    ? 'concluir'
    : acoes.includes('internar') && leito.status === 'livre'
      ? 'internar'
      : undefined;
  const menu: AcaoMenu[] = [
    { rotulo: tl.cartao.verDetalhe, href: `/leitos/${leito.id}` },
    ...acoes
      .filter((a) => a !== rapida)
      .map((a): AcaoMenu =>
        a === 'internar'
          ? { rotulo: ROTULO_ACAO[a], href: destinoInternar(leito) }
          : { rotulo: ROTULO_ACAO[a], aoClicar: () => aoAcao?.(a, leito) },
      ),
  ];

  return (
    <div
      data-leito={leito.codigo}
      className={cn(
        'flex min-h-[7.5rem] min-w-0 flex-col gap-1.5 rounded-lg border border-l-4 border-border bg-card p-3 shadow-[var(--shadow-card)]',
        BORDA_LEITO[leito.status],
        destacado && 'ring-2 ring-primary ring-offset-2 ring-offset-bg',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/leitos/${leito.id}`}
          aria-label={tl.cartao.nome(leito.codigo, tl.status[leito.status], detalheLeitor(leito))}
          className="rounded text-[15px] font-bold tabular-nums hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          {leito.codigo}
        </Link>
        {menu.length > 1 && <MenuAcoes nome={leito.codigo} acoes={menu} />}
      </div>
      <BadgeLeito status={leito.status} className="w-fit" />

      <div aria-hidden className="min-w-0 space-y-0.5 text-[12.5px]">
        {leito.status === 'ocupado' && o && (
          <>
            <p className="truncate font-medium text-text" title={o.nome}>
              {o.nome}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 text-text-muted">
              {o.diaInternacao ? tl.avisos.diaInternacao(o.diaInternacao) : o.atendimentoNumero}
              {o.temAlergia && (
                <span className="inline-flex items-center gap-0.5 font-semibold text-danger">
                  <AlertTriangle size={12} className="shrink-0" />
                  {tl.cartao.alergia}
                </span>
              )}
              {o.precaucao && o.precaucao !== 'padrao' && (
                <span className="inline-flex items-center gap-0.5">
                  <ShieldAlert size={12} className="shrink-0" />
                  {tl.precaucoes[o.precaucao]}
                </span>
              )}
            </p>
            {o.previsaoAltaVencida && <Destaque>{tl.avisos.altaPrevistaVencida}</Destaque>}
          </>
        )}
        {leito.status !== 'ocupado' && leito.status !== 'livre' && (
          <p className="text-text-muted">
            <TempoDecorrido desde={leito.desde} />
          </p>
        )}
        {leito.status === 'reservado' && leito.reserva && (
          <p className="truncate text-text-muted">
            {tl.cartao.reservadoPara(leito.reserva.pacienteNome)}
          </p>
        )}
        {leito.status === 'bloqueado' && leito.bloqueio && (
          <p className="truncate text-text-muted">{leito.bloqueio.motivo}</p>
        )}
        {leito.higienizacaoAtrasada && (
          <Destaque forte={leito.higienizacaoAtrasada === 'alerta'}>
            {leito.higienizacaoAtrasada === 'alerta'
              ? tl.destaques.higienizacaoAlerta
              : tl.destaques.higienizacaoDestaque}
          </Destaque>
        )}
        {leito.reservaLonga && <Destaque>{tl.destaques.reservaLonga}</Destaque>}
        {leito.liberacaoVencida && <Destaque>{tl.avisos.liberacaoVencida}</Destaque>}
      </div>

      {rapida && (
        <div className="mt-auto pt-1">
          {rapida === 'concluir' ? (
            <button
              type="button"
              onClick={() => aoAcao?.('concluir', leito)}
              aria-label={tl.cartao.concluirLeitor(leito.codigo)}
              className="rounded-md border border-border-input px-2.5 py-1 text-[12.5px] font-medium hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {tl.cartao.concluir}
            </button>
          ) : (
            <Link
              to={destinoInternar(leito)}
              aria-label={tl.cartao.internarLeitor(leito.codigo)}
              className="inline-block rounded-md border border-border-input px-2.5 py-1 text-[12.5px] font-medium hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {tl.cartao.internar}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export const CartaoLeito = memo(CartaoLeitoBase);
