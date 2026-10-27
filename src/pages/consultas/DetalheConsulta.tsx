import { ArrowLeft, CalendarClock } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { AcoesConsulta } from '../../components/consultas/AcoesConsulta';
import { LinhaDoTempoConsulta } from '../../components/consultas/LinhaDoTempoConsulta';
import { AlertaAlergias } from '../../components/pacientes/AlertaAlergias';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { DescricaoLista } from '../../components/ui/lista/DescricaoLista';
import { NaoEncontrado } from '../../components/ui/NaoEncontrado';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAcoesConsulta } from '../../hooks/useAcoesConsulta';
import { useConsulta } from '../../hooks/useDados';
import { useVoltarPara } from '../../hooks/useFiltrosUrl';
import { t } from '../../i18n/pt-BR';
import { ErroNaoEncontrado } from '../../services/erros';
import { dataDoInstante, formatarDataExtenso, horaDoInstante } from '../../utils/datas';

const a = t.agenda;
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const classeLink =
  'rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

/** /consultas/:id — dados, histórico (eventos) e ações conforme o status. */
export default function DetalheConsulta() {
  const { id = '' } = useParams();
  const { data: c, erro, recarregar } = useConsulta(id);
  const acoes = useAcoesConsulta();
  const voltarPara = useVoltarPara(
    c ? `/consultas?data=${dataDoInstante(c.inicio)}` : '/consultas',
  );

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.consultaNaoEncontrada}
        descricao={a.naoEncontradaDescricao}
        voltarPara="/consultas"
        rotuloVoltar={a.voltarAgenda}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!c) return <SkeletonLinhas />;

  const titulo = a.tituloDetalhe(c.pacienteNome);

  return (
    <>
      <Link
        to={voltarPara}
        className="mb-3 inline-flex items-center gap-1.5 rounded text-[13.5px] text-text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <ArrowLeft size={15} aria-hidden />
        {a.voltarAgenda}
      </Link>
      <CabecalhoPagina
        titulo={titulo}
        breadcrumbFinal={titulo}
        aoLadoDoTitulo={<StatusBadge status={c.status} />}
        descricao={`${capitalizar(formatarDataExtenso(dataDoInstante(c.inicio)))} · ${horaDoInstante(c.inicio)}–${horaDoInstante(c.fim)}`}
      />

      <div className="space-y-5">
        {c.atrasada && (
          <p className="flex items-center gap-2 rounded-[var(--radius-card)] border border-danger/30 bg-danger-bg px-4 py-3 text-[14px] font-medium text-danger">
            <CalendarClock size={17} aria-hidden />
            {a.aguardandoRegistro}
          </p>
        )}
        <AlertaAlergias alergias={c.pacienteAlergias} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card titulo={a.cards.dados}>
            <DescricaoLista
              itens={[
                {
                  termo: a.cards.paciente,
                  descricao: (
                    <Link to={`/pacientes/${c.pacienteId}`} className={classeLink}>
                      {c.pacienteNome}
                    </Link>
                  ),
                },
                {
                  termo: a.campoMedico,
                  descricao: (
                    <Link to={`/medicos/${c.medicoId}`} className={classeLink}>
                      {c.medicoNome}
                    </Link>
                  ),
                },
                { termo: a.campoDepartamento, descricao: c.departamentoNome },
                {
                  termo: a.campoData,
                  descricao: capitalizar(formatarDataExtenso(dataDoInstante(c.inicio))),
                },
                {
                  termo: a.campoHorario,
                  descricao: `${horaDoInstante(c.inicio)}–${horaDoInstante(c.fim)} (${a.minutos(c.duracaoMin)})`,
                },
                { termo: a.campoTipo, descricao: a.tipos[c.tipo] },
                { termo: a.campoSituacao, descricao: <StatusBadge status={c.status} /> },
                { termo: a.campoMotivo, descricao: c.motivo, largo: true },
                ...(c.motivoCancelamento
                  ? [
                      {
                        termo: a.campoMotivoCancelamento,
                        descricao: c.motivoCancelamento,
                        largo: true,
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
          <Card titulo={a.cards.acoes}>
            <AcoesConsulta
              consulta={c}
              aoConcluir={() => void acoes.concluir(c)}
              aoFaltar={() => void acoes.faltou(c)}
              aoCancelar={() => acoes.cancelar(c)}
            />
          </Card>
        </div>

        <Card titulo={a.cards.historico}>
          <LinhaDoTempoConsulta eventos={c.eventos} />
        </Card>
      </div>
      {acoes.dialogo}
    </>
  );
}
