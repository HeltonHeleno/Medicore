import { ArrowLeft, Info } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { SecaoDispensacoes } from '../../components/farmacia/SecaoDispensacoes';
import { AlertaAlergias } from '../../components/pacientes/AlertaAlergias';
import { tf } from '../../i18n/pt-BR/farmacia';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { DescricaoLista, type ItemDescricao } from '../../components/ui/lista/DescricaoLista';
import { LinhaDoTempo, type ItemLinhaDoTempo } from '../../components/ui/LinhaDoTempo';
import { NaoEncontrado } from '../../components/ui/NaoEncontrado';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { JANELAS_CORRECAO_H } from '../../config/limites';
import { useAcoesLeito } from '../../hooks/useAcoesLeito';
import { useColecao } from '../../hooks/useColecao';
import { useInternacao } from '../../hooks/useDadosOperacoes';
import { useVoltarPara } from '../../hooks/useFiltrosUrl';
import { useRelogio } from '../../hooks/useRelogio';
import { t } from '../../i18n/pt-BR';
import { to } from '../../i18n/pt-BR/operacoes';
import { tl } from '../../i18n/pt-BR/leitos';
import { COLECOES } from '../../services/colecoes-operacoes';
import { ErroNaoEncontrado } from '../../services/erros';
import { consultasDuranteInternacao } from '../../services/leitos';
import type { EventoInternacao, InternacaoDetalhada, Precaucao, TipoAlta } from '../../types';
import { formatarData, formatarDataHora, horaDoInstante } from '../../utils/datas';
import { limiteDaJanela } from '../../utils/tempos';

const dt = tl.detalhe;
const ca = dt.campos;
const ed = dt.eventoDetalhe;
const classeLink =
  'rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

/** Texto do evento na linha do tempo (com o motivo e a justificativa, quando houver). */
function itemDoEvento(ev: EventoInternacao): ItemLinhaDoTempo {
  const precaucao = (p?: string) => (p ? (tl.precaucoes[p as Precaucao] ?? p) : '—');
  const data = (d?: string) => (d ? formatarData(d) : '—');
  let detalhe: string | undefined;
  switch (ev.tipo) {
    case 'internada':
      detalhe = ev.para ? ed.leito(ev.para) : undefined;
      break;
    case 'transferida':
      detalhe = ed.deParaLeito(ev.de ?? '—', ev.para ?? '—');
      break;
    case 'responsavel_alterado':
    case 'motivo_alterado':
      detalhe = ed.dePara(ev.de ?? '—', ev.para ?? '—');
      break;
    case 'previsao_alterada':
      detalhe = ed.dePara(data(ev.de), data(ev.para));
      break;
    case 'precaucao_alterada':
      detalhe = ed.dePara(precaucao(ev.de), precaucao(ev.para));
      break;
    case 'alta':
      detalhe = ev.para ? (tl.dialogos.tiposAltaRotulo[ev.para as TipoAlta] ?? ev.para) : undefined;
      break;
    case 'alta_desfeita':
      break;
  }
  return {
    em: ev.em,
    titulo: tl.eventos[ev.tipo],
    detalhe:
      [
        detalhe,
        ev.motivo && ed.motivo(ev.motivo),
        ev.justificativa && ed.justificativa(ev.justificativa),
      ]
        .filter(Boolean)
        .join(' · ') || undefined,
    autor: ev.autor,
    cor:
      ev.tipo === 'alta'
        ? 'bg-on-leito-higienizacao'
        : ev.tipo === 'transferida'
          ? 'bg-info'
          : 'bg-primary',
  };
}

function dados(i: InternacaoDetalhada): ItemDescricao[] {
  return [
    {
      termo: ca.paciente,
      descricao: (
        <Link to={`/pacientes/${i.pacienteId}`} className={classeLink}>
          {i.pacienteNome}
        </Link>
      ),
    },
    { termo: ca.idade, descricao: i.pacienteIdade !== undefined ? dt.anos(i.pacienteIdade) : '—' },
    {
      termo: ca.leito,
      descricao: (
        <Link to={`/leitos/${i.leitoId}`} className={classeLink}>
          {i.leitoCodigo}
        </Link>
      ),
    },
    { termo: ca.setor, descricao: i.setorNome },
    {
      termo: ca.medico,
      descricao: (
        <Link to={`/medicos/${i.medicoResponsavelId}`} className={classeLink}>
          {i.medicoNome}
        </Link>
      ),
    },
    { termo: ca.origem, descricao: tl.origens[i.origem] },
    ...(i.hospitalOrigem ? [{ termo: ca.hospitalOrigem, descricao: i.hospitalOrigem }] : []),
    { termo: ca.precaucao, descricao: tl.precaucoes[i.precaucao] },
    { termo: ca.inicio, descricao: formatarDataHora(i.inicio) },
    {
      termo: ca.previsaoAlta,
      descricao: i.previsaoAlta ? (
        <>
          {formatarData(i.previsaoAlta)}
          {i.previsaoAltaVencida && (
            <span className="ml-2 font-semibold text-danger">{tl.avisos.altaPrevistaVencida}</span>
          )}
          {i.previsaoAltaHoje && (
            <span className="ml-2 font-semibold">{tl.avisos.altaPrevistaHoje}</span>
          )}
        </>
      ) : undefined,
    },
    ...(i.alta
      ? [
          {
            termo: ca.alta,
            descricao: dt.altaResumo(
              tl.dialogos.tiposAltaRotulo[i.alta.tipo],
              formatarDataHora(i.alta.em),
            ),
          },
          ...(i.alta.hospitalDestino
            ? [{ termo: ca.hospitalDestino, descricao: i.alta.hospitalDestino }]
            : []),
          ...(i.alta.observacao
            ? [{ termo: ca.observacao, descricao: i.alta.observacao, largo: true }]
            : []),
        ]
      : []),
    { termo: ca.motivo, descricao: i.motivo, largo: true },
  ];
}

/** /leitos/internacoes/:id — dados, consultas no período (R-X8), histórico e ações (L2, L3, L7, L8). */
export default function DetalheInternacao() {
  const { id = '' } = useParams();
  const { data: i, erro, recarregar } = useInternacao(id);
  const consultas = useColecao(
    () => consultasDuranteInternacao(id),
    [id],
    [...COLECOES.leitos, 'consultas'],
  );
  const acoes = useAcoesLeito();
  const voltarPara = useVoltarPara('/leitos/internacoes');
  useRelogio(); // a janela de 6 h do "Desfazer alta" se fecha sozinha na tela

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.internacaoNaoEncontrada}
        descricao={dt.naoEncontradaDescricao}
        voltarPara="/leitos/internacoes"
        rotuloVoltar={tl.voltarInternacoes}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!i) {
    return (
      <div aria-busy="true">
        <SkeletonLinhas linhas={8} />
      </div>
    );
  }

  const ativa = i.status === 'ativa';
  const titulo = dt.titulo(i.pacienteNome);
  const janelaAte =
    i.alta && !i.desfazerAltaAte
      ? limiteDaJanela(i.alta.registradaEm, JANELAS_CORRECAO_H.alta)
      : undefined;

  return (
    <>
      <Link
        to={voltarPara}
        className="mb-3 inline-flex items-center gap-1.5 rounded text-[13.5px] text-text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <ArrowLeft size={15} aria-hidden />
        {tl.voltarInternacoes}
      </Link>
      <CabecalhoPagina
        titulo={titulo}
        breadcrumbFinal={i.pacienteNome}
        aoLadoDoTitulo={
          <span
            className={
              ativa
                ? 'rounded bg-primary-light px-2 py-1 text-[12px] leading-none font-medium text-on-primary-light'
                : 'rounded border border-border bg-bg px-2 py-1 text-[12px] leading-none font-medium text-text-muted'
            }
          >
            {ativa ? dt.ativa : dt.encerrada}
          </span>
        }
        descricao={dt.resumo(
          i.leitoCodigo,
          i.setorNome,
          ativa
            ? tl.avisos.diaInternacao(i.permanenciaDias)
            : tl.avisos.permanencia(i.permanenciaDias),
        )}
      />

      <div className="space-y-5">
        <AlertaAlergias alergias={i.pacienteAlergias} />
        {!i.pacienteAlergias?.trim() && (
          <p className="flex items-start gap-2 rounded-lg border border-warning/40 px-3 py-2 text-[13.5px] font-medium text-warning">
            <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
            {t.pacientes.alergiasNaoInformadas}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card titulo={dt.cards.dados}>
            <DescricaoLista itens={dados(i)} />
          </Card>
          <Card titulo={dt.cards.acoes}>
            <div className="flex flex-col items-stretch gap-2">
              {ativa ? (
                <>
                  <Button onClick={() => acoes.transferir(i)}>{dt.transferir}</Button>
                  <Button variante="contorno" onClick={() => acoes.darAlta(i)}>
                    {dt.darAlta}
                  </Button>
                  <ButtonLink variante="contorno" to={`/leitos/internacoes/${i.id}/editar`}>
                    {dt.editar}
                  </ButtonLink>
                  <ButtonLink
                    variante="contorno"
                    to={`/farmacia/dispensar?pacienteId=${i.pacienteId}`}
                  >
                    {tf.ligacoes.dispensarMedicamento}
                  </ButtonLink>
                </>
              ) : (
                <>
                  {i.desfazerAltaAte ? (
                    <>
                      <p className="text-[13.5px] text-text-muted">
                        {dt.desfazerAte(horaDoInstante(i.desfazerAltaAte))}
                      </p>
                      <Button variante="contorno" onClick={() => acoes.desfazerAlta(i)}>
                        {dt.desfazerAlta}
                      </Button>
                    </>
                  ) : (
                    janelaAte && (
                      <p role="status" className="text-[13.5px] text-text-muted">
                        {to.janelaExpirada(JANELAS_CORRECAO_H.alta, horaDoInstante(janelaAte))}
                      </p>
                    )
                  )}
                  <ButtonLink to={`/leitos/internar?deInternacao=${i.id}`}>
                    {dt.internarNovamente}
                  </ButtonLink>
                </>
              )}
              <ButtonLink variante="suave" to={`/pacientes/${i.pacienteId}`}>
                {tl.verPaciente}
              </ButtonLink>
            </div>
          </Card>
        </div>

        {ativa && (
          <Card titulo={dt.cards.consultas}>
            {!consultas.data ? (
              <SkeletonLinhas linhas={2} />
            ) : consultas.data.length === 0 ? (
              <p className="text-[14px] text-text-muted">{dt.semConsultas}</p>
            ) : (
              <>
                <p className="mb-2 text-[14px] font-medium">
                  {tl.avisos.consultasDuranteInternacao(consultas.data.length)}
                </p>
                <ul className="space-y-1.5 text-[14px]">
                  {consultas.data.map((c) => (
                    <li key={c.id}>
                      <Link to={`/consultas/${c.id}`} className={classeLink}>
                        {formatarDataHora(c.inicio)}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/consultas?pacienteId=${i.pacienteId}`}
                  className={`${classeLink} mt-3 inline-block text-[13.5px]`}
                >
                  {tl.verNaAgenda}
                </Link>
              </>
            )}
          </Card>
        )}

        <SecaoDispensacoes destinoId={i.id} />

        <Card titulo={dt.cards.historico}>
          <LinhaDoTempo itens={i.eventos.map(itemDoEvento)} />
        </Card>
      </div>
      {acoes.dialogos}
    </>
  );
}
