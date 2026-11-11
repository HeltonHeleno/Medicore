import { Printer } from 'lucide-react';
import { useId } from 'react';
import { AbasModulo } from '../../components/ui/AbasModulo';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/form/Input';
import { FiltroSelect } from '../../components/ui/lista/BarraFiltros';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { ResumoNumeros } from '../../components/ui/ResumoNumeros';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { useEstoque, useLivroControlados } from '../../hooks/useDadosOperacoes';
import { useFiltrosUrl } from '../../hooks/useFiltrosUrl';
import { useRelogio } from '../../hooks/useRelogio';
import { tf } from '../../i18n/pt-BR/farmacia';
import { nomeMedicamento } from '../../services/farmacia';
import type { TipoMovimentacao } from '../../types';
import { formatarData, formatarDataHora, somarDias } from '../../utils/datas';
import { abasFarmacia } from './abas';

const ct = tf.controladosTela;
const PADROES = { medicamento: '', de: '', ate: '' };
const POSITIVOS: readonly TipoMovimentacao[] = ['entrada', 'devolucao', 'ajuste_positivo'];

function CampoData({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-[150px] flex-col gap-1">
      <label htmlFor={id} className="text-[12.5px] text-text-muted">
        {rotulo}
      </label>
      <Input id={id} type="date" value={valor} onChange={(e) => aoMudar(e.target.value)} />
    </div>
  );
}

/** /farmacia/controlados — livro de controlados (M28): saldos do período e movimentações. */
export default function Controlados() {
  const { hoje } = useRelogio();
  const { filtros, definir } = useFiltrosUrl(PADROES);
  const de = filtros.de || somarDias(hoje, -30);
  const ate = filtros.ate || hoje;
  const controlados = useEstoque({ soControlados: true, status: 'todos', porPagina: 500 });
  const lista = controlados.data?.itens ?? [];
  const medicamentoId = lista.some((x) => x.medicamento.id === filtros.medicamento)
    ? filtros.medicamento
    : (lista[0]?.medicamento.id ?? '');
  const livro = useLivroControlados(medicamentoId, de, ate);
  const l = livro.data;
  const invalido = de > ate;

  return (
    <>
      <CabecalhoPagina
        titulo={tf.livroControlados}
        descricao={ct.descricao}
        acoes={
          <Button
            variante="contorno"
            iconeEsquerda={<Printer size={17} />}
            onClick={() => window.print()}
            className="print:hidden"
          >
            {ct.imprimir}
          </Button>
        }
      />
      <div className="print:hidden">
        <AbasModulo rotulo={tf.abasRotulo} abas={abasFarmacia} className="mb-5" />
      </div>
      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
          <FiltroSelect
            rotulo={ct.medicamento}
            valor={medicamentoId}
            aoMudar={(medicamento) => definir({ medicamento })}
            opcoes={lista.map((x) => ({
              valor: x.medicamento.id,
              rotulo: `${nomeMedicamento(x.medicamento)} (${x.medicamento.controlado?.lista ?? ''})`,
            }))}
          />
          <CampoData rotulo={ct.de} valor={de} aoMudar={(x) => definir({ de: x })} />
          <CampoData rotulo={ct.ate} valor={ate} aoMudar={(x) => definir({ ate: x })} />
        </div>
        {invalido ? (
          <p role="alert" className="text-[14px] font-medium text-danger">
            {ct.periodoInvalido}
          </p>
        ) : !medicamentoId && controlados.data ? (
          <p className="text-[14px] text-text-muted">{ct.escolha}</p>
        ) : !l ? (
          <div aria-busy="true">
            <SkeletonLinhas linhas={4} />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[14px]">
              <span className="font-semibold">
                {nomeMedicamento(l.medicamento)}
                {l.medicamento.controlado && ` · ${tf.controlado(l.medicamento.controlado.lista)}`}
              </span>{' '}
              · {ct.periodo(formatarData(l.de), formatarData(l.ate))}
            </p>
            <ResumoNumeros
              rotulo={ct.legenda}
              itens={[
                { rotulo: ct.saldoInicial, valor: l.saldoInicial },
                { rotulo: ct.entradas, valor: l.entradas },
                { rotulo: ct.saidas, valor: l.saidas },
                { rotulo: ct.saldoFinal, valor: l.saldoFinal },
              ]}
            />
            {l.movimentacoes.length === 0 ? (
              <p className="text-[14px] text-text-muted">{ct.vazio}</p>
            ) : (
              <div
                role="region"
                aria-label={ct.legenda}
                tabIndex={0}
                className="relative -mx-1 overflow-x-auto rounded px-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <table className="w-full min-w-[36rem] text-left text-[14px]">
                  <caption className="sr-only">{ct.legenda}</caption>
                  <thead>
                    <tr className="border-b border-border text-[12.5px] text-text-muted">
                      <th scope="col" className="py-2 pr-3 font-medium">
                        {tf.movimentacoesTela.colunas.em}
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        {tf.movimentacoesTela.colunas.tipo}
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        {tf.movimentacoesTela.colunas.quantidade}
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        {tf.movimentacoesTela.colunas.saldo}
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        {tf.movimentacoesTela.colunas.motivo}
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        {tf.movimentacoesTela.colunas.autor}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {l.movimentacoes.map((x) => (
                      <tr key={x.id} className="border-b border-border last:border-0">
                        <th scope="row" className="py-2 pr-3 font-medium whitespace-nowrap">
                          {formatarDataHora(x.em)}
                        </th>
                        <td className="py-2 pr-3">{tf.movimentacoes[x.tipo]}</td>
                        <td className="py-2 pr-3 tabular-nums">
                          {POSITIVOS.includes(x.tipo) ? '+' : '−'}
                          {x.quantidade}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{x.saldoLoteApos}</td>
                        <td className="py-2 pr-3">
                          {[x.motivo, x.termo ? tf.dispensacaoTela.termo(x.termo) : '']
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </td>
                        <td className="py-2">{x.autor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
