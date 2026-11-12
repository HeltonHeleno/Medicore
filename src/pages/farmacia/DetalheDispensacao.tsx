import { ArrowLeft, Printer } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DialogoMotivo } from '../../components/leitos/DialogoMotivo';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import { Campo } from '../../components/ui/form/Campo';
import { CampoQuantidade } from '../../components/ui/form/CampoQuantidade';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { DescricaoLista } from '../../components/ui/lista/DescricaoLista';
import { NaoEncontrado } from '../../components/ui/NaoEncontrado';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { JANELAS_CORRECAO_H } from '../../config/limites';
import { useDispensacao } from '../../hooks/useDadosOperacoes';
import { useVoltarPara } from '../../hooks/useFiltrosUrl';
import { useRelogio } from '../../hooks/useRelogio';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { tf } from '../../i18n/pt-BR/farmacia';
import { to } from '../../i18n/pt-BR/operacoes';
import { ErroConcorrencia, ErroConflito, ErroNaoEncontrado } from '../../services/erros';
import {
  devolver,
  estornar,
  nomeMedicamento,
  quantidadeComUnidade,
  type DispensacaoDetalhada,
} from '../../services/farmacia';
import { formatarData, formatarDataHora, horaDoInstante } from '../../utils/datas';
import { cn } from '../../utils/cn';
import { limiteDaJanela } from '../../utils/tempos';

const dd = tf.dispensacaoTela;
const ca = dd.campos;
const classeLink =
  'rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

type Item = DispensacaoDetalhada['itensDetalhados'][number];

/** /farmacia/dispensacoes/:id — itens e lotes, alertas, devolução (F4), estorno (F8) e comprovante. */
export default function DetalheDispensacao() {
  const { id = '' } = useParams();
  const { data: x, erro, recarregar } = useDispensacao(id);
  const voltarPara = useVoltarPara('/farmacia/movimentacoes');
  const toast = useToast();
  useRelogio(); // a janela de 24 h do estorno se fecha sozinha na tela
  const [devolvendo, setDevolvendo] = useState<{ item: Item; indice: number } | null>(null);
  const [quantidade, setQuantidade] = useState<number | null>(null);
  const [estornando, setEstornando] = useState(false);

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.dispensacaoNaoEncontrada}
        descricao={dd.naoEncontradaDescricao}
        voltarPara="/farmacia"
        rotuloVoltar={tf.voltar}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!x) {
    return (
      <div aria-busy="true">
        <SkeletonLinhas linhas={8} />
      </div>
    );
  }

  const estornada = x.status === 'estornada';
  const comDevolucao = x.itens.some((i) => i.devolvido > 0);
  const janelaAte =
    !estornada && !x.estornarAte && !comDevolucao && !x.arquivado
      ? limiteDaJanela(x.em, JANELAS_CORRECAO_H.dispensacao)
      : undefined;
  const destino =
    x.destino.tipo === 'internacao'
      ? `/leitos/internacoes/${x.destino.id}`
      : `/emergencia/${x.destino.id}`;

  const tratarErro = (e: unknown) => {
    if (e instanceof ErroConcorrencia) toast.aviso(tf.dialogos.mudouSituacao);
    else if (e instanceof ErroConflito && e.codigo !== 'estoque_insuficiente')
      toast.aviso(e.message);
    else toast.erro(e instanceof Error ? e.message : t.erros.inesperadoTitulo);
  };

  return (
    <>
      <Link
        to={voltarPara}
        className="mb-3 inline-flex items-center gap-1.5 rounded text-[13.5px] text-text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none print:hidden"
      >
        <ArrowLeft size={15} aria-hidden />
        {tf.voltar}
      </Link>
      <p className="hidden text-[13px] font-semibold tracking-wide uppercase print:block">
        {dd.comprovante}
      </p>
      <CabecalhoPagina
        titulo={dd.titulo(x.pacienteNome)}
        breadcrumbFinal={formatarDataHora(x.em)}
        aoLadoDoTitulo={
          <span
            className={cn(
              'rounded border px-2 py-1 text-[12px] leading-none font-semibold',
              estornada
                ? 'border-danger/40 bg-danger-bg text-danger'
                : 'border-transparent bg-primary-light text-on-primary-light',
            )}
          >
            {estornada ? dd.estornada : dd.realizada}
          </span>
        }
        acoes={
          <Button
            variante="contorno"
            iconeEsquerda={<Printer size={17} />}
            onClick={() => window.print()}
            className="print:hidden"
          >
            {dd.imprimir}
          </Button>
        }
      />

      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] print:block">
          <Card titulo={dd.cards.dados}>
            <DescricaoLista
              itens={[
                {
                  termo: ca.paciente,
                  descricao: (
                    <Link to={`/pacientes/${x.pacienteId}`} className={classeLink}>
                      {x.pacienteNome}
                    </Link>
                  ),
                },
                {
                  termo: ca.destino,
                  descricao: (
                    <Link to={destino} className={classeLink}>
                      {x.destino.tipo === 'internacao'
                        ? dd.destinoInternacao
                        : dd.destinoEmergencia}
                    </Link>
                  ),
                },
                {
                  termo: ca.medico,
                  descricao: (
                    <Link to={`/medicos/${x.medicoSolicitanteId}`} className={classeLink}>
                      {x.medicoNome}
                    </Link>
                  ),
                },
                { termo: ca.em, descricao: formatarDataHora(x.em) },
                { termo: ca.autor, descricao: x.autor },
                ...(x.estorno
                  ? [
                      {
                        termo: ca.estorno,
                        descricao: dd.estornoResumo(
                          formatarDataHora(x.estorno.em),
                          x.estorno.motivo,
                          x.estorno.autor,
                        ),
                        largo: true,
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
          <Card titulo={dd.cards.acoes} className="h-fit print:hidden">
            <div className="flex flex-col items-stretch gap-2">
              {x.estornarAte && (
                <>
                  <p className="text-[13.5px] text-text-muted">
                    {dd.estornarAte(horaDoInstante(x.estornarAte))}
                  </p>
                  <Button variante="contorno" onClick={() => setEstornando(true)}>
                    {dd.estornar}
                  </Button>
                </>
              )}
              {!estornada && comDevolucao && (
                <p className="text-[13.5px] text-text-muted">{dd.estornoComDevolucao}</p>
              )}
              {janelaAte && (
                <p role="status" className="text-[13.5px] text-text-muted">
                  {to.janelaExpirada(JANELAS_CORRECAO_H.dispensacao, horaDoInstante(janelaAte))}
                </p>
              )}
              <Button
                variante="suave"
                iconeEsquerda={<Printer size={17} />}
                onClick={() => window.print()}
              >
                {dd.imprimir}
              </Button>
            </div>
          </Card>
        </div>

        <Card titulo={dd.cards.itens}>
          <ul className="divide-y divide-border">
            {x.itensDetalhados.map((item, i) => {
              const m = item.medicamento;
              const saldo = item.quantidade - item.devolvido;
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-1 text-[14px]">
                    <p className={cn('font-semibold', estornada && 'line-through')}>
                      {nomeMedicamento(m)} · {quantidadeComUnidade(m, item.quantidade)}
                    </p>
                    <p className="text-[13px] text-text-muted">
                      {dd.lotes(
                        item.lotes
                          .map((l) =>
                            dd.loteItem(l.quantidade, l.lote.numero, formatarData(l.lote.validade)),
                          )
                          .join(', '),
                      )}
                    </p>
                    {item.devolvido > 0 && !estornada && (
                      <p className="text-[13px]">
                        {dd.devolvido(quantidadeComUnidade(m, item.devolvido))}
                      </p>
                    )}
                  </div>
                  {!estornada && !x.arquivado && saldo > 0 && (
                    <Button
                      tamanho="sm"
                      variante="contorno"
                      aria-label={dd.devolverLeitor(nomeMedicamento(m))}
                      className="print:hidden"
                      onClick={() => {
                        setQuantidade(null);
                        setDevolvendo({ item, indice: i });
                      }}
                    >
                      {dd.devolver}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card titulo={dd.cards.alertas}>
          {x.alertasConfirmados.length === 0 ? (
            <p className="text-[14px] text-text-muted">{dd.semAlertas}</p>
          ) : (
            <ul className="space-y-2 text-[14px]">
              {x.alertasConfirmados.map((a) => {
                const m = x.itensDetalhados.find(
                  (i) => i.medicamento.id === a.medicamentoId,
                )?.medicamento;
                return (
                  <li key={`${a.tipo}-${a.medicamentoId}`}>
                    <span className="font-semibold">{dd.alerta[a.tipo]}</span>
                    {m && <> · {nomeMedicamento(m)}</>}
                    {a.termo && <span className="text-text-muted"> · {dd.termo(a.termo)}</span>}
                    {a.justificativa && (
                      <span className="block text-[13px] text-text-muted">
                        {dd.justificativa(a.justificativa)} · {x.autor}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <DialogoMotivo
        aberto={devolvendo !== null}
        titulo={devolvendo ? dd.devolverTitulo(nomeMedicamento(devolvendo.item.medicamento)) : ''}
        descricao={
          devolvendo
            ? dd.saldoDevolver(
                quantidadeComUnidade(
                  devolvendo.item.medicamento,
                  devolvendo.item.quantidade - devolvendo.item.devolvido,
                ),
              )
            : undefined
        }
        rotulo={tf.dialogos.motivo}
        sugestoes={tf.motivosDevolucao}
        rotuloConfirmar={dd.devolver}
        aoFechar={() => setDevolvendo(null)}
        aoConfirmar={async (motivo) => {
          const { item, indice } = devolvendo!;
          const saldo = item.quantidade - item.devolvido;
          const qtd = quantidade ?? 0;
          if (qtd < 1 || qtd > saldo) throw new Error(tf.regras.devolucaoAcimaDoSaldo(saldo));
          try {
            await devolver(x.id, indice, { quantidade: qtd, motivo }, x.versao);
          } catch (e) {
            if (e instanceof ErroConflito && e.codigo === 'estoque_insuficiente') throw e;
            if (e instanceof ErroConcorrencia || e instanceof ErroConflito) {
              setDevolvendo(null);
              tratarErro(e);
              return;
            }
            throw e;
          }
          setDevolvendo(null);
          toast.sucesso(tf.avisos.devolucaoRegistrada(quantidadeComUnidade(item.medicamento, qtd)));
        }}
      >
        {devolvendo && (
          <Campo rotulo={tf.dialogos.quantidade} nome="quantidadeDevolver" obrigatorio>
            <CampoQuantidade
              valor={quantidade}
              aoMudar={setQuantidade}
              max={devolvendo.item.quantidade - devolvendo.item.devolvido}
              unidade={tf.unidades[devolvendo.item.medicamento.unidade](2)}
            />
          </Campo>
        )}
      </DialogoMotivo>

      <DialogoMotivo
        aberto={estornando}
        titulo={dd.estornarTitulo}
        descricao={
          x.estornarAte
            ? `${dd.estornarDescricao} ${dd.estornarAte(horaDoInstante(x.estornarAte))}`
            : dd.estornarDescricao
        }
        rotulo={tf.dialogos.motivo}
        sugestoes={tf.motivosEstorno}
        rotuloConfirmar={dd.estornar}
        perigo
        aoFechar={() => setEstornando(false)}
        aoConfirmar={async (motivo) => {
          try {
            await estornar(x.id, motivo, x.versao);
          } catch (e) {
            if (e instanceof ErroConcorrencia || e instanceof ErroConflito) {
              setEstornando(false);
              tratarErro(e);
              return;
            }
            throw e;
          }
          setEstornando(false);
          toast.sucesso(dd.estornada2);
        }}
      />
    </>
  );
}
