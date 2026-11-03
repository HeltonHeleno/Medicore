import { AlertTriangle, Clock, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { nomeSetor } from '../../config/setores';
import { useToast } from '../../hooks/useToast';
import { tl } from '../../i18n/pt-BR/leitos';
import { cancelarReserva, cancelarSolicitacao } from '../../services/leitos';
import type { SolicitacaoDetalhada } from '../../types';
import { formatarDataCurta } from '../../utils/datas';
import { BadgeRisco } from '../emergencia/BadgeRisco';
import { useConfirmar } from '../../hooks/useConfirmar';
import { Button, ButtonLink } from '../ui/Button';
import { MenuAcoes, type AcaoMenu } from '../ui/lista/MenuAcoes';
import { SkeletonLinhas } from '../ui/Skeleton';
import { TempoDecorrido } from '../ui/TempoDecorrido';
import { DialogoMotivo } from './DialogoMotivo';
import { DialogoReservar } from './DialogoReservar';
import { DialogoSolicitacaoEletiva } from './DialogoSolicitacaoEletiva';

const s = tl.solicitacoes;

interface PainelSolicitacoesProps {
  solicitacoes: SolicitacaoDetalhada[] | null;
  tratarErro: (e: unknown) => void;
  className?: string;
}

const origemDe = (x: SolicitacaoDetalhada) =>
  x.origem === 'emergencia'
    ? s.emergencia(x.atendimentoNumero ?? '—')
    : s.eletiva(formatarDataCurta(x.dataPrevista ?? ''));

/**
 * L6 e L9: pedidos de leito em aberto (emergência e eletivos), por prioridade e espera.
 * Pedido novo vindo de outra aba é anunciado uma vez (`aria-live="polite"`).
 */
export function PainelSolicitacoes({
  solicitacoes,
  tratarErro,
  className,
}: PainelSolicitacoesProps) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const [reservando, setReservando] = useState<SolicitacaoDetalhada | null>(null);
  const [cancelando, setCancelando] = useState<SolicitacaoDetalhada | null>(null);
  const [nova, setNova] = useState(false);
  const [anuncio, setAnuncio] = useState('');
  const conhecidos = useRef<Set<string> | null>(null);
  const criadosAqui = useRef(new Set<string>());

  // Anuncia pedidos que aparecem depois da primeira carga (vindos de outra aba ou da emergência).
  useEffect(() => {
    if (!solicitacoes) return;
    const ids = new Set(solicitacoes.map((x) => x.id));
    if (conhecidos.current) {
      const novos = solicitacoes.filter(
        (x) => !conhecidos.current!.has(x.id) && !criadosAqui.current.has(x.pacienteId),
      );
      if (novos.length > 0) {
        const n = novos[0];
        setAnuncio(
          s.anuncioNova(
            n.pacienteNome,
            n.setorDesejado ? nomeSetor(n.setorDesejado) : tl.qualquerSetor,
          ),
        );
      }
    }
    conhecidos.current = ids;
  }, [solicitacoes]);

  async function cancelarReservaDe(x: SolicitacaoDetalhada) {
    const ok = await confirmar({
      titulo: s.cancelarReservaTitulo(x.leitoReservadoCodigo ?? ''),
      mensagem: s.cancelarReservaMensagem,
      rotuloConfirmar: s.cancelarReserva,
      perigo: true,
    });
    if (!ok) return;
    try {
      await cancelarReserva(x.id, x.versao);
      toast.sucesso(s.reservaCancelada);
    } catch (e) {
      tratarErro(e);
    }
  }

  return (
    <section aria-labelledby="titulo-solicitacoes" className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-solicitacoes" className="text-[16px] font-semibold">
          {solicitacoes ? s.tituloContagem(solicitacoes.length) : s.titulo}
        </h2>
        <Button
          tamanho="sm"
          variante="contorno"
          iconeEsquerda={<Plus size={15} />}
          onClick={() => setNova(true)}
        >
          {s.nova}
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      {!solicitacoes ? (
        <SkeletonLinhas />
      ) : solicitacoes.length === 0 ? (
        <p className="rounded-lg bg-bg px-4 py-3 text-[14px] text-text-muted">{s.vazio}</p>
      ) : (
        <ul className="space-y-2">
          {solicitacoes.map((x) => {
            const menu: AcaoMenu[] = [
              x.status === 'reservada'
                ? { rotulo: s.trocarLeito, aoClicar: () => setReservando(x) }
                : { rotulo: s.reservar, aoClicar: () => setReservando(x) },
              ...(x.status === 'reservada'
                ? [{ rotulo: s.cancelarReserva, aoClicar: () => void cancelarReservaDe(x) }]
                : []),
              { rotulo: s.cancelarPedido, aoClicar: () => setCancelando(x), perigo: true },
            ];
            return (
              <li
                key={x.id}
                className="rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <BadgeRisco risco={x.prioridade} variante="curto" />
                    <p className="truncate text-[14px] font-semibold">{x.pacienteNome}</p>
                  </div>
                  <MenuAcoes nome={s.acoesDe(x.pacienteNome)} acoes={menu} />
                </div>
                <div className="mt-1 space-y-0.5 text-[12.5px] text-text-muted">
                  <p>{origemDe(x)}</p>
                  <p>
                    {s.destino(
                      x.setorDesejado ? nomeSetor(x.setorDesejado) : tl.qualquerSetor,
                      tl.precaucoes[x.precaucao],
                    )}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2">
                    <span className="font-medium text-text">
                      {x.status === 'reservada' && x.leitoReservadoCodigo
                        ? s.leitoReservado(x.leitoReservadoCodigo)
                        : s.pendente}
                    </span>
                    <TempoDecorrido desde={x.criadoEm} />
                  </p>
                  {x.reservaLonga && (
                    <p className="flex items-center gap-1 font-semibold text-warning">
                      <Clock size={12} aria-hidden />
                      {tl.destaques.reservaLonga}
                    </p>
                  )}
                  {x.esperaLonga && (
                    <p className="flex items-center gap-1 font-semibold text-danger">
                      <AlertTriangle size={12} aria-hidden />
                      {s.esperaLonga}
                    </p>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {x.status !== 'reservada' && (
                    <Button tamanho="sm" variante="contorno" onClick={() => setReservando(x)}>
                      {s.reservar}
                    </Button>
                  )}
                  <ButtonLink tamanho="sm" to={`/leitos/internar?solicitacaoId=${x.id}`}>
                    {s.internar}
                  </ButtonLink>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DialogoReservar
        solicitacao={reservando}
        aoFechar={() => setReservando(null)}
        aoReservar={(codigo) => {
          setReservando(null);
          toast.sucesso(s.reservado(codigo));
        }}
        aoErro={(e) => {
          setReservando(null);
          tratarErro(e);
        }}
      />
      <DialogoMotivo
        aberto={cancelando !== null}
        titulo={cancelando ? s.cancelarTitulo(cancelando.pacienteNome) : ''}
        descricao={s.cancelarDescricao}
        rotulo={s.motivoCancelamento}
        rotuloConfirmar={s.cancelarPedido}
        perigo
        aoFechar={() => setCancelando(null)}
        aoConfirmar={async (motivo) => {
          await cancelarSolicitacao(cancelando!.id, motivo, cancelando!.versao);
          setCancelando(null);
          toast.sucesso(s.pedidoCancelado);
        }}
      />
      <DialogoSolicitacaoEletiva
        aberto={nova}
        aoFechar={() => setNova(false)}
        aoPedir={(nome, pacienteId) => {
          criadosAqui.current.add(pacienteId);
          setNova(false);
          toast.sucesso(s.pedido(nome));
        }}
      />
    </section>
  );
}
