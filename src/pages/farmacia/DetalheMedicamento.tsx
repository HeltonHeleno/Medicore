import { AlertTriangle, ArrowLeft, Ban, LockOpen, MinusCircle, Scale } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeEstoque } from '../../components/farmacia/BadgeEstoque';
import { DialogoAjusteLote } from '../../components/farmacia/DialogoAjusteLote';
import { DialogoMotivo } from '../../components/leitos/DialogoMotivo';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import { Campo } from '../../components/ui/form/Campo';
import { Input } from '../../components/ui/form/Input';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { DescricaoLista, type ItemDescricao } from '../../components/ui/lista/DescricaoLista';
import { MenuAcoes, type AcaoMenu } from '../../components/ui/lista/MenuAcoes';
import { NaoEncontrado } from '../../components/ui/NaoEncontrado';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { useConfirmar, usePerguntar } from '../../hooks/useConfirmar';
import { useMedicamento, useMovimentacoes } from '../../hooks/useDadosOperacoes';
import { useVoltarPara } from '../../hooks/useFiltrosUrl';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { tf } from '../../i18n/pt-BR/farmacia';
import { ErroConcorrencia, ErroConflito, ErroNaoEncontrado } from '../../services/erros';
import {
  bloquearLote,
  desbloquearLote,
  inativarMedicamento,
  nomeMedicamento,
  quantidadeComUnidade,
  reativarMedicamento,
  type DetalheMedicamento as Detalhe,
} from '../../services/farmacia';
import type { LoteDetalhado, Medicamento } from '../../types';
import { formatarData, formatarDataHora } from '../../utils/datas';
import { textoValidade } from '../../utils/tempos';

const dt = tf.detalheTela;
const ca = dt.campos;
const d = tf.dialogos;

function dados(m: Medicamento): ItemDescricao[] {
  const c = tf.formMedicamento.campos;
  return [
    { termo: c.nome, descricao: m.nome },
    { termo: c.nomeComercial, descricao: m.nomeComercial },
    { termo: c.principioAtivo, descricao: m.principioAtivo },
    { termo: c.classe, descricao: m.classe },
    { termo: c.concentracao, descricao: m.concentracao },
    { termo: c.forma, descricao: tf.formas[m.forma] },
    { termo: c.unidade, descricao: tf.unidades[m.unidade](2) },
    { termo: c.unidadesPorEmbalagem, descricao: m.unidadesPorEmbalagem?.toString() },
    {
      termo: c.controlado,
      descricao: m.controlado ? tf.controlado(m.controlado.lista) : tf.nao,
    },
    ...(m.ativo
      ? []
      : [
          {
            termo: ca.inativadoEm,
            descricao: m.inativadoEm ? formatarDataHora(m.inativadoEm) : undefined,
          },
          { termo: ca.motivoInativacao, descricao: m.motivoInativacao },
        ]),
  ];
}

function estoque(x: Detalhe['estoque']): ItemDescricao[] {
  const m = x.medicamento;
  return [
    {
      termo: ca.disponivel,
      descricao: <span className="tabular-nums">{quantidadeComUnidade(m, x.disponivel)}</span>,
    },
    { termo: ca.minimo, descricao: quantidadeComUnidade(m, m.estoqueMinimo) },
    {
      termo: ca.situacao,
      descricao: (
        <span className="flex flex-wrap gap-1">
          <BadgeEstoque situacao={x.situacao} />
          {x.vencendo && <BadgeEstoque situacao="vencendo" />}
        </span>
      ),
    },
    {
      termo: ca.proximo,
      descricao: x.proximoVencimento ? formatarData(x.proximoVencimento) : undefined,
    },
    ...(x.vencido > 0
      ? [{ termo: ca.vencido, descricao: quantidadeComUnidade(m, x.vencido) }]
      : []),
    ...(x.bloqueado > 0
      ? [{ termo: ca.bloqueado, descricao: quantidadeComUnidade(m, x.bloqueado) }]
      : []),
  ];
}

const situacaoLote = (l: LoteDetalhado) =>
  l.bloqueio ? 'bloqueado' : l.vencido ? 'vencido' : l.vencendo ? 'vencendo' : 'ok';

/** /farmacia/medicamentos/:id — dados, lotes (F5, F9), movimentações e inativação (F7). */
export default function DetalheMedicamento() {
  const { id = '' } = useParams();
  const { data, erro, recarregar } = useMedicamento(id);
  const movs = useMovimentacoes({ medicamentoId: id, porPagina: 8 });
  const voltarPara = useVoltarPara('/farmacia');
  const toast = useToast();
  const confirmar = useConfirmar();
  const perguntar = usePerguntar();
  const [ajuste, setAjuste] = useState<{ lote: LoteDetalhado; modo: 'ajuste' | 'perda' } | null>(
    null,
  );
  const [bloqueando, setBloqueando] = useState<LoteDetalhado | null>(null);
  const [referencia, setReferencia] = useState('');
  const [pendencias, setPendencias] = useState<string[] | null>(null);

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.medicamentoNaoEncontrado}
        descricao={dt.naoEncontradoDescricao}
        voltarPara="/farmacia"
        rotuloVoltar={tf.voltar}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!data) {
    return (
      <div aria-busy="true">
        <SkeletonLinhas linhas={8} />
      </div>
    );
  }
  const m = data.estoque.medicamento;
  const nome = nomeMedicamento(m);

  const tratarErro = (e: unknown) => {
    if (e instanceof ErroConcorrencia) toast.aviso(d.mudouSituacao);
    else if (e instanceof ErroConflito && e.codigo === 'transicao_invalida') toast.aviso(e.message);
    else toast.erro(e instanceof Error ? e.message : t.erros.inesperadoTitulo);
  };

  async function inativar() {
    const r = await perguntar({
      titulo: dt.inativarTitulo(nome),
      mensagem: dt.inativarMensagem,
      rotuloConfirmar: dt.acoes.inativar,
      perigo: true,
      campoTexto: { rotulo: dt.motivoInativar, maximo: 200 },
    });
    if (!r.confirmado) return;
    try {
      await inativarMedicamento(m.id, m.versao, r.texto);
      setPendencias(null);
      toast.sucesso(dt.inativado);
    } catch (e) {
      // E-17: lotes com saldo (inclusive vencidos e bloqueados).
      if (e instanceof ErroConflito && e.codigo === 'pendencias_modulos') {
        const itens = (e.detalhes?.itens as { descricao: string }[] | undefined) ?? [];
        setPendencias([e.message, ...itens.map((x) => x.descricao)]);
      } else tratarErro(e);
    }
  }

  async function reativar() {
    try {
      await reativarMedicamento(m.id, m.versao);
      toast.sucesso(dt.reativado);
    } catch (e) {
      tratarErro(e);
    }
  }

  async function desbloquear(l: LoteDetalhado) {
    const ok = await confirmar({
      titulo: d.desbloquearTitulo(l.numero),
      mensagem: d.desbloquearMensagem,
      rotuloConfirmar: d.desbloquear,
    });
    if (!ok) return;
    try {
      await desbloquearLote(l.id, l.versao);
      toast.sucesso(d.desbloqueado(l.numero));
    } catch (e) {
      tratarErro(e);
    }
  }

  const acoesLote = (l: LoteDetalhado): AcaoMenu[] => [
    {
      rotulo: dt.acoes.ajuste,
      icone: Scale,
      aoClicar: () => setAjuste({ lote: l, modo: 'ajuste' }),
    },
    ...(l.quantidadeAtual > 0
      ? [
          {
            rotulo: dt.acoes.perda,
            icone: MinusCircle,
            aoClicar: () => setAjuste({ lote: l, modo: 'perda' }),
          },
        ]
      : []),
    l.bloqueio
      ? { rotulo: dt.acoes.desbloquear, icone: LockOpen, aoClicar: () => void desbloquear(l) }
      : {
          rotulo: dt.acoes.bloquear,
          icone: Ban,
          perigo: true,
          aoClicar: () => {
            setReferencia('');
            setBloqueando(l);
          },
        },
  ];

  return (
    <>
      <Link
        to={voltarPara}
        className="mb-3 inline-flex items-center gap-1.5 rounded text-[13.5px] text-text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <ArrowLeft size={15} aria-hidden />
        {tf.voltar}
      </Link>
      <CabecalhoPagina
        titulo={nome}
        breadcrumbFinal={nome}
        aoLadoDoTitulo={
          <span className="flex flex-wrap items-center gap-2">
            <BadgeEstoque situacao={data.estoque.situacao} />
            {!m.ativo && (
              <span className="rounded border border-border bg-bg px-2 py-1 text-[12px] leading-none font-medium text-text-muted">
                {tf.estoqueTela.inativo}
              </span>
            )}
          </span>
        }
        descricao={[tf.formas[m.forma], m.controlado ? tf.controlado(m.controlado.lista) : '']
          .filter(Boolean)
          .join(' · ')}
      />

      <div className="space-y-5">
        {!m.ativo && (
          <p className="rounded-lg border border-border bg-bg px-4 py-3 text-[14px]">
            {dt.inativoAviso}
          </p>
        )}
        {pendencias && (
          <div
            role="alert"
            className="space-y-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-[14px] text-danger"
          >
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={17} aria-hidden className="shrink-0" />
              {dt.pendenciasTitulo}
            </p>
            <p>{pendencias[0]}</p>
            <p className="text-text">{dt.pendenciasAcao}</p>
            <ul className="list-disc pl-6 text-text">
              {pendencias.slice(1).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <Link
              to="/farmacia/vencimentos"
              className="inline-block rounded font-semibold underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {dt.irVencimentos}
            </Link>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <Card titulo={dt.cards.estoque}>
              <DescricaoLista itens={estoque(data.estoque)} />
            </Card>
            <Card titulo={dt.cards.dados}>
              <DescricaoLista itens={dados(m)} />
            </Card>
          </div>
          <Card titulo={dt.cards.acoes} className="h-fit">
            <div className="flex flex-col items-stretch gap-2">
              {m.ativo && (
                <>
                  <ButtonLink to={`/farmacia/entrada?medicamentoId=${m.id}`}>
                    {dt.acoes.entrada}
                  </ButtonLink>
                  {data.estoque.disponivel > 0 && (
                    <ButtonLink
                      variante="contorno"
                      to={`/farmacia/dispensar?medicamentoId=${m.id}`}
                    >
                      {dt.acoes.dispensar}
                    </ButtonLink>
                  )}
                </>
              )}
              <ButtonLink variante="contorno" to={`/farmacia/medicamentos/${m.id}/editar`}>
                {dt.acoes.editar}
              </ButtonLink>
              {m.ativo ? (
                <Button variante="suave" onClick={inativar}>
                  {dt.acoes.inativar}
                </Button>
              ) : (
                <Button variante="contorno" onClick={reativar}>
                  {dt.acoes.reativar}
                </Button>
              )}
            </div>
          </Card>
        </div>

        <Card titulo={dt.cards.lotes}>
          {data.lotes.length === 0 ? (
            <p className="text-[14px] text-text-muted">{dt.lotes.semLotes}</p>
          ) : (
            <div
              role="region"
              aria-label={dt.lotes.legenda}
              tabIndex={0}
              className="relative -mx-1 overflow-x-auto rounded px-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <table className="w-full min-w-[36rem] text-left text-[14px]">
                <caption className="sr-only">{dt.lotes.legenda}</caption>
                <thead>
                  <tr className="border-b border-border text-[12.5px] text-text-muted">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      {dt.lotes.numero}
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      {dt.lotes.validade}
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      {dt.lotes.saldo}
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      {dt.lotes.situacao}
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      {dt.lotes.fabricante}
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      <span className="sr-only">{dt.cards.acoes}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.lotes.map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-0">
                      <th scope="row" className="py-2.5 pr-3 font-mono font-medium">
                        {l.numero}
                      </th>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {formatarData(l.validade)}
                        <span className="block text-[12px] text-text-muted">
                          {textoValidade(l.validade)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {quantidadeComUnidade(m, l.quantidadeAtual)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <BadgeEstoque situacao={situacaoLote(l)} />
                        {l.bloqueio && (
                          <span className="mt-1 block text-[12px] text-text-muted">
                            {dt.lotes.bloqueadoPor(l.bloqueio.motivo)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">{l.fabricante ?? '—'}</td>
                      <td className="py-2.5 text-right">
                        <MenuAcoes nome={dt.lotes.nomeLote(l.numero)} acoes={acoesLote(l)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          titulo={dt.cards.movimentacoes}
          acao={{ rotulo: tf.verTodas, href: `/farmacia/movimentacoes?medicamento=${m.id}` }}
        >
          {!movs.data ? (
            <SkeletonLinhas linhas={3} />
          ) : movs.data.itens.length === 0 ? (
            <p className="text-[14px] text-text-muted">{dt.semMovimentacoes}</p>
          ) : (
            <ul className="divide-y divide-border">
              {movs.data.itens.map((x) => (
                <li
                  key={x.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-[14px]"
                >
                  <span>
                    <span className="font-medium">{tf.movimentacoes[x.tipo]}</span>{' '}
                    <span className="tabular-nums">{quantidadeComUnidade(m, x.quantidade)}</span>{' '}
                    <span className="font-mono text-[12.5px] text-text-muted">{x.loteNumero}</span>
                    {x.motivo && <span className="text-text-muted"> · {x.motivo}</span>}
                  </span>
                  <span className="text-[12.5px] text-text-muted tabular-nums">
                    {formatarDataHora(x.em)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <DialogoAjusteLote
        alvo={ajuste}
        medicamento={m}
        aoFechar={() => setAjuste(null)}
        aoRegistrar={(texto) => {
          setAjuste(null);
          toast.sucesso(texto);
        }}
        aoErro={(e) => {
          setAjuste(null);
          tratarErro(e);
        }}
      />
      <DialogoMotivo
        aberto={bloqueando !== null}
        titulo={bloqueando ? d.bloquearTitulo(bloqueando.numero) : ''}
        descricao={d.bloquearDescricao}
        rotulo={d.motivo}
        sugestoes={tf.motivosBloqueioLote}
        rotuloConfirmar={d.bloquear}
        perigo
        aoFechar={() => setBloqueando(null)}
        aoConfirmar={async (motivo) => {
          const l = bloqueando!;
          try {
            await bloquearLote(l.id, { motivo, referencia }, l.versao);
          } catch (e) {
            if (e instanceof ErroConcorrencia || e instanceof ErroConflito) {
              setBloqueando(null);
              tratarErro(e);
              return;
            }
            throw e;
          }
          setBloqueando(null);
          toast.sucesso(d.bloqueado(l.numero));
        }}
      >
        <Campo rotulo={d.referencia} nome="referencia">
          <Input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            maxLength={60}
          />
        </Campo>
      </DialogoMotivo>
    </>
  );
}
