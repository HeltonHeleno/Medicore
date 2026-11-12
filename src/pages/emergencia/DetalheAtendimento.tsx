import { ArrowLeft, BedDouble, Info, UserRoundSearch } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  acoesDoAtendimento,
  type AcaoAtendimento,
} from '../../components/emergencia/acoes-atendimento';
import { BadgeRisco } from '../../components/emergencia/BadgeRisco';
import { ResumoSinais } from '../../components/emergencia/ResumoSinais';
import { CAMPOS_SINAIS } from '../../components/emergencia/sinais';
import { SecaoDispensacoes } from '../../components/farmacia/SecaoDispensacoes';
import { AlertaAlergias } from '../../components/pacientes/AlertaAlergias';
import { tf } from '../../i18n/pt-BR/farmacia';
import { opcaoDoPaciente } from '../../components/pacientes/opcao-paciente';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { DescricaoLista, type ItemDescricao } from '../../components/ui/lista/DescricaoLista';
import { LinhaDoTempo, type ItemLinhaDoTempo } from '../../components/ui/LinhaDoTempo';
import { NaoEncontrado } from '../../components/ui/NaoEncontrado';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { TempoDecorrido } from '../../components/ui/TempoDecorrido';
import { JANELAS_CORRECAO_H } from '../../config/limites';
import { nomeSetor } from '../../config/setores';
import { useAcoesAtendimento } from '../../hooks/useAcoesAtendimento';
import { useColecao } from '../../hooks/useColecao';
import { useAtendimento } from '../../hooks/useDadosOperacoes';
import { useVoltarPara } from '../../hooks/useFiltrosUrl';
import { useRelogio } from '../../hooks/useRelogio';
import { t } from '../../i18n/pt-BR';
import { te } from '../../i18n/pt-BR/emergencia';
import { to } from '../../i18n/pt-BR/operacoes';
import { COLECOES } from '../../services/colecoes-operacoes';
import { ErroNaoEncontrado } from '../../services/erros';
import { obterSolicitacao } from '../../services/leitos';
import type {
  AtendimentoDetalhado,
  CorRisco,
  EventoAtendimento,
  SinaisVitais,
  TipoDesfecho,
} from '../../types';
import { formatarDataHora, horaDoInstante } from '../../utils/datas';
import { formatarPrazo, limiteDaJanela } from '../../utils/tempos';

const dt = te.detalheTela;
const ca = dt.campos;
const ed = dt.eventoDetalhe;
const classeLink =
  'rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

const ROTULO: Record<AcaoAtendimento, string> = {
  triar: te.triar,
  chamar: te.acoes.chamar,
  observacao: te.acoes.observacao,
  retomar: te.acoes.retomar,
  pedirLeito: te.acoes.pedirLeito,
  encerrar: te.acoes.encerrar,
  identificar: te.acoes.identificar,
  sinais: te.acoes.sinais,
  reabrir: te.acoes.reabrir,
};

const cor = (c?: string) => (c ? (te.cores[c as CorRisco] ?? c) : te.semClassificacao);
const ultimoEvento = (a: AtendimentoDetalhado, tipo: EventoAtendimento['tipo']) =>
  [...a.eventos].reverse().find((e) => e.tipo === tipo);

/** Texto do evento na linha do tempo (com o motivo, quando houver). */
function itemDoEvento(ev: EventoAtendimento, a: AtendimentoDetalhado): ItemLinhaDoTempo {
  let detalhe: string | undefined;
  switch (ev.tipo) {
    case 'chegada':
      detalhe = ev.para ? te.emergenciaImediata : te.modosChegada[a.modoChegada];
      break;
    case 'triagem':
      detalhe = ev.de ? ed.dePara(cor(ev.de), cor(ev.para)) : cor(ev.para);
      break;
    case 'chamado':
      detalhe =
        [
          ev.medicoId === a.medicoId ? a.medicoNome : undefined,
          ev.excessoMin ? ed.excesso(ev.excessoMin) : undefined,
        ]
          .filter(Boolean)
          .join(' · ') || undefined;
      break;
    case 'observacao':
      detalhe = ev.para;
      break;
    case 'leito_solicitado':
      detalhe = ev.para ? nomeSetor(ev.para) : undefined;
      break;
    case 'vinculado':
      detalhe = ed.dePara(ev.detalhe ?? '—', ev.para ?? '—');
      break;
    case 'desfecho':
      detalhe = ev.para ? te.desfechos[ev.para as TipoDesfecho] : undefined;
      break;
    case 'reaberto':
      detalhe = ev.detalhe ? ed.motivo(ev.detalhe) : undefined;
      break;
    default:
      detalhe = ev.detalhe;
  }
  return {
    em: ev.em,
    titulo: te.eventos[ev.tipo],
    detalhe,
    autor: ev.autor,
    cor:
      ev.tipo === 'desfecho'
        ? 'bg-on-leito-higienizacao'
        : ev.tipo === 'triagem'
          ? 'bg-warning'
          : 'bg-primary',
  };
}

function dados(a: AtendimentoDetalhado): ItemDescricao[] {
  const chamado = ultimoEvento(a, 'chamado');
  const aguardando = a.status === 'aguardando_atendimento' || a.status === 'aguardando_triagem';
  return [
    { termo: ca.queixa, descricao: a.queixa, largo: true },
    { termo: ca.modo, descricao: te.modosChegada[a.modoChegada] },
    { termo: ca.chegada, descricao: formatarDataHora(a.chegadaEm) },
    {
      termo: ca.classificacao,
      descricao: a.risco ? <BadgeRisco risco={a.risco} /> : te.semClassificacao,
    },
    {
      termo: ca.prazo,
      descricao: a.prazo ? (
        aguardando ? (
          <TempoDecorrido prazo={a.prazo} />
        ) : (
          formatarPrazo(a.prazo)
        )
      ) : undefined,
    },
    ...(chamado
      ? [
          {
            termo: ca.chamado,
            descricao: `${formatarDataHora(chamado.em)}${chamado.excessoMin ? ` ${dt.excesso(chamado.excessoMin)}` : ''}`,
          },
        ]
      : []),
    ...(a.medicoNome && a.medicoId
      ? [
          {
            termo: ca.medico,
            descricao: (
              <Link to={`/medicos/${a.medicoId}`} className={classeLink}>
                {a.medicoNome}
              </Link>
            ),
          },
        ]
      : []),
    { termo: ca.situacao, descricao: te.status[a.status] },
    ...(a.provisorio && !a.pacienteId
      ? [{ termo: ca.identificacao, descricao: a.provisorio.descricao, largo: true }]
      : []),
    ...(a.desfecho
      ? [
          {
            termo: ca.desfecho,
            descricao: dt.desfechoResumo(
              te.dialogos.desfechosRotulo[a.desfecho.tipo as 'alta'] ??
                te.desfechos[a.desfecho.tipo],
              formatarDataHora(a.desfecho.em),
            ),
          },
          ...(a.desfecho.hospitalDestino
            ? [{ termo: ca.hospitalDestino, descricao: a.desfecho.hospitalDestino }]
            : []),
          ...(a.desfecho.observacao
            ? [{ termo: ca.observacao, descricao: a.desfecho.observacao, largo: true }]
            : []),
        ]
      : []),
  ];
}

/** Sinais em ordem: triagens e reavaliações (E10), para a tabela de evolução. */
function registrosDeSinais(a: AtendimentoDetalhado) {
  return [
    ...a.triagens.map((x) => ({ em: x.em, origem: dt.tabela.triagem, sinais: x.sinais })),
    ...a.reavaliacoes.map((x) => ({ em: x.em, origem: dt.tabela.reavaliacao, sinais: x.sinais })),
  ].sort((x, y) => x.em.localeCompare(y.em));
}

const valorSinal = (s: SinaisVitais, c: (typeof CAMPOS_SINAIS)[number]) =>
  s[c] === undefined ? '—' : s[c]!.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** Faixa de situação: leito reservado, aguardando leito ou em observação (18.5.3). */
function FaixaSituacao({ a }: { a: AtendimentoDetalhado }) {
  const solicitacao = useColecao(
    () =>
      a.status === 'aguardando_leito' && a.solicitacaoId
        ? obterSolicitacao(a.solicitacaoId).catch(() => null)
        : Promise.resolve(null),
    [a.status, a.solicitacaoId],
    COLECOES.leitos,
  );
  const classe =
    'flex flex-wrap items-center gap-2 rounded-lg border border-info/40 bg-card px-4 py-3 text-[14px] font-medium';
  if (a.status === 'em_observacao' && a.leitoObservacaoCodigo) {
    const desde = ultimoEvento(a, 'observacao')?.em;
    return (
      <p className={classe}>
        <BedDouble size={17} aria-hidden className="shrink-0 text-info" />
        {dt.emObservacao(a.leitoObservacaoCodigo)}
        {desde && <TempoDecorrido desde={desde} className="text-text-muted" />}
      </p>
    );
  }
  if (a.status !== 'aguardando_leito') return null;
  const s = solicitacao.data;
  const desde = ultimoEvento(a, 'leito_solicitado')?.em;
  return (
    <p className={classe}>
      <BedDouble size={17} aria-hidden className="shrink-0 text-info" />
      {s?.leitoReservadoCodigo ? (
        dt.reservado(s.leitoReservadoCodigo)
      ) : (
        <>
          {dt.aguardandoLeito}
          {desde && <TempoDecorrido desde={desde} className="text-text-muted" />}
        </>
      )}
      <Link to="/leitos" className={`${classeLink} ml-auto text-[13.5px]`}>
        {te.verMapa}
      </Link>
    </p>
  );
}

/** /emergencia/:id — dados, triagens, sinais, linha do tempo e ações (E2–E7, E9, E10). */
export default function DetalheAtendimento() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: a, erro, recarregar } = useAtendimento(id);
  const acoes = useAcoesAtendimento();
  const voltarPara = useVoltarPara('/emergencia');
  useRelogio(); // a janela de 2 h do "Reabrir" se fecha sozinha na tela

  // Volta do cadastro de paciente (E7): abre a confirmação com o novo paciente.
  const novoPacienteId = params.get('pacienteId');
  const tratado = useRef('');
  const { identificarCom } = acoes;
  useEffect(() => {
    if (!a || !novoPacienteId || tratado.current === novoPacienteId) return;
    tratado.current = novoPacienteId;
    setParams({}, { replace: true });
    if (a.pacienteId) return;
    void opcaoDoPaciente(novoPacienteId).then((p) => p && identificarCom(a, p));
  }, [a, novoPacienteId, identificarCom, setParams]);

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.atendimentoNaoEncontrado}
        descricao={dt.naoEncontradoDescricao}
        voltarPara="/emergencia"
        rotuloVoltar={te.voltarFila}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!a) {
    return (
      <div aria-busy="true">
        <SkeletonLinhas linhas={8} />
      </div>
    );
  }

  const disponiveis = acoesDoAtendimento(a);
  const triagens = [...a.triagens].reverse();
  const registros = registrosDeSinais(a);
  const janelaAte =
    a.desfecho && a.desfecho.tipo !== 'internacao' && !a.reabrirAte
      ? limiteDaJanela(a.desfecho.registradoEm, JANELAS_CORRECAO_H.atendimento)
      : undefined;

  return (
    <>
      <Link
        to={voltarPara}
        className="mb-3 inline-flex items-center gap-1.5 rounded text-[13.5px] text-text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <ArrowLeft size={15} aria-hidden />
        {te.voltarFila}
      </Link>
      <CabecalhoPagina
        titulo={dt.titulo(a.numero, a.nomeExibicao)}
        breadcrumbFinal={a.numero}
        aoLadoDoTitulo={
          <span className="flex flex-wrap items-center gap-2">
            {a.risco && <BadgeRisco risco={a.risco} />}
            <span className="rounded border border-border bg-bg px-2 py-1 text-[12px] leading-none font-medium text-text-muted">
              {te.status[a.status]}
            </span>
          </span>
        }
        descricao={[
          a.idade !== undefined && a.pacienteId ? te.anos(a.idade) : undefined,
          a.pacienteId ? undefined : dt.provisorio,
        ]
          .filter(Boolean)
          .join(' · ')}
      />

      <div className="space-y-5">
        {a.pacienteId ? (
          <>
            <AlertaAlergias alergias={a.pacienteAlergias} />
            {!a.pacienteAlergias?.trim() && (
              <p className="flex items-start gap-2 rounded-lg border border-warning/40 px-3 py-2 text-[13.5px] font-medium text-warning">
                <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
                {t.pacientes.alergiasNaoInformadas}
              </p>
            )}
          </>
        ) : (
          a.status !== 'encerrado' && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 px-4 py-3 text-[14px]">
              <UserRoundSearch size={17} aria-hidden className="shrink-0 text-warning" />
              <span className="flex-1">{dt.provisorio}</span>
              <Button
                tamanho="sm"
                variante="contorno"
                onClick={() => acoes.executar('identificar', a)}
              >
                {te.acoes.identificar}
              </Button>
            </p>
          )
        )}
        <FaixaSituacao a={a} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card titulo={dt.cards.dados}>
            <DescricaoLista itens={dados(a)} />
          </Card>
          <Card titulo={dt.cards.acoes}>
            <div className="flex flex-col items-stretch gap-2">
              {disponiveis.length === 0 && (
                <p className="text-[14px] text-text-muted">{te.acoes.nenhuma}</p>
              )}
              {a.reabrirAte && (
                <p className="text-[13.5px] text-text-muted">
                  {dt.reabrirAte(horaDoInstante(a.reabrirAte))}
                </p>
              )}
              {janelaAte && (
                <p role="status" className="text-[13.5px] text-text-muted">
                  {to.janelaExpirada(JANELAS_CORRECAO_H.atendimento, horaDoInstante(janelaAte))}
                </p>
              )}
              {disponiveis.map((x, i) =>
                x === 'triar' ? (
                  <ButtonLink
                    key={x}
                    to={`/emergencia/${a.id}/triagem`}
                    variante={i === 0 ? 'primario' : 'contorno'}
                  >
                    {a.triagens.length > 0 ? te.retriagem : te.triar}
                  </ButtonLink>
                ) : (
                  <Button
                    key={x}
                    variante={i === 0 ? 'primario' : x === 'encerrar' ? 'suave' : 'contorno'}
                    onClick={() => acoes.executar(x, a)}
                  >
                    {ROTULO[x]}
                  </Button>
                ),
              )}
              {/* Dispensar (matriz: todo atendimento aberto); provisório identifica antes (D9). */}
              {a.status !== 'encerrado' &&
                (a.pacienteId ? (
                  <ButtonLink
                    variante="contorno"
                    to={`/farmacia/dispensar?pacienteId=${a.pacienteId}`}
                  >
                    {tf.ligacoes.dispensarMedicamento}
                  </ButtonLink>
                ) : (
                  <>
                    <Button
                      variante="contorno"
                      aria-describedby="dispensar-provisorio"
                      onClick={() => acoes.executar('identificar', a)}
                    >
                      {tf.ligacoes.dispensarMedicamento}
                    </Button>
                    <p id="dispensar-provisorio" className="text-[12.5px] text-text-muted">
                      {tf.dispensarTela.provisorio}
                    </p>
                  </>
                ))}
              {a.desfecho?.internacaoId && (
                <ButtonLink
                  variante="contorno"
                  to={`/leitos/internacoes/${a.desfecho.internacaoId}`}
                >
                  {te.verInternacao}
                </ButtonLink>
              )}
              {a.pacienteId && (
                <ButtonLink variante="suave" to={`/pacientes/${a.pacienteId}`}>
                  {te.verPaciente}
                </ButtonLink>
              )}
            </div>
          </Card>
        </div>

        <Card titulo={dt.cards.triagens}>
          {triagens.length === 0 ? (
            <p className="text-[14px] text-text-muted">{dt.semTriagem}</p>
          ) : (
            <ol className="divide-y divide-border">
              {triagens.map((x, i) => (
                <li key={x.em} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2 text-[14px]">
                    <BadgeRisco risco={x.risco} />
                    <span className="text-text-muted">
                      {te.triagemTela.anteriorResumo(
                        te.cores[x.risco],
                        formatarDataHora(x.em),
                        x.profissional,
                      )}
                    </span>
                  </div>
                  <ResumoSinais sinais={x.sinais} />
                  {i === 0 && a.alertasSinais.length > 0 && (
                    <p className="text-[13px] font-semibold text-warning">
                      {dt.alertasSinais}: {a.alertasSinais.map((s) => s.texto).join(' · ')}
                    </p>
                  )}
                  {x.justificativa && <p className="text-[13px]">{ed.motivo(x.justificativa)}</p>}
                  {x.observacao && <p className="text-[13px] text-text-muted">{x.observacao}</p>}
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card titulo={dt.cards.reavaliacoes}>
          {registros.length === 0 ? (
            <p className="text-[14px] text-text-muted">{dt.semReavaliacoes}</p>
          ) : (
            <div
              role="region"
              aria-label={dt.tabela.legenda}
              tabIndex={0}
              className="relative -mx-1 overflow-x-auto rounded px-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <table className="w-full min-w-[40rem] text-left text-[13.5px] tabular-nums">
                <caption className="sr-only">{dt.tabela.legenda}</caption>
                <thead>
                  <tr className="border-b border-border text-[12.5px] text-text-muted">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      {dt.tabela.quando}
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      {dt.tabela.origem}
                    </th>
                    {CAMPOS_SINAIS.map((c) => (
                      <th key={c} scope="col" className="py-2 pr-3 font-medium">
                        <abbr title={te.sinais[c]} className="no-underline">
                          {dt.rotulosCurtos[c]}
                        </abbr>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => (
                    <tr
                      key={`${r.origem}-${r.em}`}
                      className="border-b border-border last:border-0"
                    >
                      <th scope="row" className="py-2 pr-3 font-medium">
                        {formatarDataHora(r.em)}
                      </th>
                      <td className="py-2 pr-3 text-text-muted">{r.origem}</td>
                      {CAMPOS_SINAIS.map((c) => (
                        <td key={c} className="py-2 pr-3">
                          {valorSinal(r.sinais, c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <SecaoDispensacoes destinoId={a.id} />

        <Card titulo={dt.cards.historico}>
          <LinhaDoTempo itens={a.eventos.map((ev) => itemDoEvento(ev, a))} />
        </Card>
      </div>
      {acoes.dialogos}
    </>
  );
}
