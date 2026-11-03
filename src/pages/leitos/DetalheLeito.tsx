import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { acoesDoLeito, destinoInternar, type AcaoLeito } from '../../components/leitos/acoes-leito';
import { BadgeLeito } from '../../components/leitos/BadgeLeito';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { DescricaoLista, type ItemDescricao } from '../../components/ui/lista/DescricaoLista';
import { NaoEncontrado } from '../../components/ui/NaoEncontrado';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { TempoDecorrido } from '../../components/ui/TempoDecorrido';
import { useAcoesLeito } from '../../hooks/useAcoesLeito';
import { useHistoricoLeito, useLeito } from '../../hooks/useDadosOperacoes';
import { t } from '../../i18n/pt-BR';
import { tl } from '../../i18n/pt-BR/leitos';
import { ErroNaoEncontrado } from '../../services/erros';
import type { LeitoDetalhado } from '../../types';
import { formatarData, formatarDataHora } from '../../utils/datas';

const lt = tl.leito;
const classeLink =
  'rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

const ROTULO: Record<AcaoLeito, string> = {
  internar: tl.cartao.internar,
  concluir: tl.mapa.concluir,
  bloquear: tl.cartao.bloquear,
  desbloquear: tl.cartao.desbloquear,
  transferir: tl.cartao.transferir,
  darAlta: tl.cartao.darAlta,
  cancelarReserva: tl.cartao.cancelarReserva,
};

function situacao(l: LeitoDetalhado): ItemDescricao[] {
  const o = l.ocupante;
  return [
    { termo: tl.situacao, descricao: <BadgeLeito status={l.status} /> },
    { termo: lt.desde, descricao: <TempoDecorrido desde={l.desde} /> },
    ...(l.status === 'ocupado' && o
      ? [
          {
            termo: lt.ocupante,
            descricao: o.internacaoId ? (
              <Link to={`/leitos/internacoes/${o.internacaoId}`} className={classeLink}>
                {o.nome}
              </Link>
            ) : o.atendimentoId ? (
              <Link to={`/emergencia/${o.atendimentoId}`} className={classeLink}>
                {o.nome} — {lt.atendimento(o.atendimentoNumero ?? '')}
              </Link>
            ) : (
              o.nome
            ),
          },
        ]
      : []),
    ...(l.status === 'reservado' && l.reserva
      ? [{ termo: lt.reservadoPara, descricao: l.reserva.pacienteNome }]
      : []),
    ...(l.status === 'higienizacao' && l.higienizacao
      ? [{ termo: lt.tipoHigienizacao, descricao: tl.higienizacao[l.higienizacao.tipo] }]
      : []),
    ...(l.status === 'bloqueado' && l.bloqueio
      ? [
          { termo: lt.motivoBloqueio, descricao: l.bloqueio.motivo },
          {
            termo: lt.previsaoLiberacao,
            descricao: l.bloqueio.previsaoLiberacao ? (
              <>
                {formatarData(l.bloqueio.previsaoLiberacao)}
                {l.liberacaoVencida && (
                  <span className="ml-2 font-semibold text-danger">
                    {tl.avisos.liberacaoVencida}
                  </span>
                )}
              </>
            ) : undefined,
          },
        ]
      : []),
  ];
}

/** /leitos/:leitoId — situação, ocupante, histórico de 30 dias e ações (L5). */
export default function DetalheLeito() {
  const { leitoId = '' } = useParams();
  const { data: l, erro, recarregar } = useLeito(leitoId);
  const historico = useHistoricoLeito(leitoId);
  const acoes = useAcoesLeito();

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.leitoNaoEncontrado}
        descricao={lt.naoEncontradoDescricao}
        voltarPara="/leitos"
        rotuloVoltar={tl.voltarMapa}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!l) {
    return (
      <div aria-busy="true">
        <SkeletonLinhas linhas={6} />
      </div>
    );
  }

  const titulo = lt.titulo(l.codigo);
  const disponiveis = acoesDoLeito(l);

  return (
    <>
      <Link
        to="/leitos"
        className="mb-3 inline-flex items-center gap-1.5 rounded text-[13.5px] text-text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <ArrowLeft size={15} aria-hidden />
        {tl.voltarMapa}
      </Link>
      <CabecalhoPagina
        titulo={titulo}
        breadcrumbFinal={l.codigo}
        aoLadoDoTitulo={<BadgeLeito status={l.status} />}
        descricao={l.setorNome}
      />
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <Card titulo={lt.cards.situacao}>
              <DescricaoLista itens={situacao(l)} />
            </Card>
            <Card titulo={lt.cards.dados}>
              <DescricaoLista
                itens={[
                  { termo: tl.setor, descricao: l.setorNome },
                  ...(l.quarto ? [{ termo: tl.quarto(''), descricao: l.quarto }] : []),
                  { termo: tl.perfil, descricao: tl.perfis[l.perfil] },
                  { termo: tl.isolamento, descricao: l.isolamento ? tl.sim : tl.nao },
                ]}
              />
            </Card>
          </div>
          <Card titulo={lt.cards.acoes}>
            {disponiveis.length === 0 ? (
              <p className="text-[14px] text-text-muted">{lt.semAcoes}</p>
            ) : (
              <div className="flex flex-col items-stretch gap-2">
                {disponiveis.map((a, i) =>
                  a === 'internar' ? (
                    <ButtonLink
                      key={a}
                      to={destinoInternar(l)}
                      variante={i === 0 ? 'primario' : 'contorno'}
                    >
                      {ROTULO[a]}
                    </ButtonLink>
                  ) : (
                    <Button
                      key={a}
                      variante={i === 0 ? 'primario' : 'contorno'}
                      onClick={() => acoes.executar(a, l)}
                    >
                      {ROTULO[a]}
                    </Button>
                  ),
                )}
              </div>
            )}
          </Card>
        </div>

        <Card titulo={lt.cards.historico}>
          {!historico.data ? (
            <SkeletonLinhas linhas={2} />
          ) : historico.data.length === 0 ? (
            <p className="text-[14px] text-text-muted">{lt.semHistorico}</p>
          ) : (
            <ul className="divide-y divide-border">
              {historico.data.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px]"
                >
                  <Link to={`/leitos/internacoes/${i.id}`} className={classeLink}>
                    {i.pacienteNome}
                  </Link>
                  <span className="text-text-muted tabular-nums">
                    {lt.periodo(
                      formatarDataHora(i.inicio),
                      i.alta ? formatarDataHora(i.alta.em) : undefined,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {acoes.dialogos}
    </>
  );
}
