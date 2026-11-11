import { PackagePlus, Pill } from 'lucide-react';
import { Link } from 'react-router-dom';
import { tf } from '../../i18n/pt-BR/farmacia';
import { nomeMedicamento, quantidadeComUnidade } from '../../services/farmacia';
import type { EstoqueMedicamento } from '../../types';
import { formatarData } from '../../utils/datas';
import { textoValidade } from '../../utils/tempos';
import { ButtonLink } from '../ui/Button';
import { DataTable, type Coluna, type OrdenacaoTabela } from '../ui/lista/DataTable';
import { BadgeEstoque } from './BadgeEstoque';

const e = tf.estoqueTela;
const col = e.colunas;
const classeLink =
  'rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

interface TabelaEstoqueProps {
  linhas: EstoqueMedicamento[] | null;
  carregando?: boolean;
  erro?: Error | null;
  aoTentarNovamente?: () => void;
  ordenacao: OrdenacaoTabela;
  aoOrdenar: (coluna: string) => void;
  mensagemVazia: string;
  acaoVazia?: { rotulo: string; aoClicar: () => void };
  /** Estado para o `<Link state>` (o "Voltar" do detalhe volta para a lista filtrada). */
  origem: { de: string };
}

/**
 * Estoque (19.2.2): medicamento (nome, concentração, forma, lista de controlado), disponível
 * com a unidade, mínimo, situação (texto + ícone) e próximo vencimento.
 */
export function TabelaEstoque({
  linhas,
  carregando,
  erro,
  aoTentarNovamente,
  ordenacao,
  aoOrdenar,
  mensagemVazia,
  acaoVazia,
  origem,
}: TabelaEstoqueProps) {
  const colunas: Coluna<EstoqueMedicamento>[] = [
    {
      id: 'nome',
      titulo: col.medicamento,
      ordenavel: true,
      celula: ({ medicamento: m }) => (
        <span className="flex flex-col">
          <Link to={`/farmacia/medicamentos/${m.id}`} state={origem} className={classeLink}>
            {nomeMedicamento(m)}
          </Link>
          <span className="text-[12.5px] text-text-muted">
            {[
              tf.formas[m.forma],
              m.controlado ? tf.controlado(m.controlado.lista) : '',
              m.ativo ? '' : e.inativo,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
      ),
    },
    {
      id: 'disponivel',
      titulo: col.disponivel,
      ordenavel: true,
      celula: (x) => (
        <span className="flex flex-col tabular-nums">
          {quantidadeComUnidade(x.medicamento, x.disponivel)}
          {(x.vencido > 0 || x.bloqueado > 0) && (
            <span className="text-[12px] text-text-muted">
              {e.alemDisso(x.vencido, x.bloqueado)}
            </span>
          )}
        </span>
      ),
    },
    {
      id: 'minimo',
      titulo: col.minimo,
      celula: (x) => <span className="tabular-nums">{x.medicamento.estoqueMinimo}</span>,
    },
    {
      id: 'situacao',
      titulo: col.situacao,
      celula: (x) => (
        <span className="flex flex-wrap gap-1">
          <BadgeEstoque situacao={x.situacao} />
          {x.vencendo && <BadgeEstoque situacao="vencendo" />}
          {x.vencido > 0 && <BadgeEstoque situacao="vencido" />}
        </span>
      ),
    },
    {
      id: 'vencimento',
      titulo: col.vencimento,
      ordenavel: true,
      celula: (x) =>
        x.proximoVencimento ? (
          <span className="flex flex-col whitespace-nowrap">
            {formatarData(x.proximoVencimento)}
            <span className="text-[12px] text-text-muted">
              {textoValidade(x.proximoVencimento)}
            </span>
          </span>
        ) : (
          '—'
        ),
    },
  ];
  return (
    <DataTable
      legenda={e.legenda}
      colunas={colunas}
      linhas={linhas}
      chave={(x) => x.medicamento.id}
      nomeDaLinha={(x) => nomeMedicamento(x.medicamento)}
      carregando={carregando}
      erro={erro}
      aoTentarNovamente={aoTentarNovamente}
      ordenacao={ordenacao}
      aoOrdenar={aoOrdenar}
      mensagemVazia={mensagemVazia}
      acaoVazia={acaoVazia}
      destacar={(x) => x.medicamento.ativo && x.situacao !== 'ok'}
      acoes={(x) =>
        x.medicamento.ativo ? (
          <span className="flex gap-1.5">
            <ButtonLink
              tamanho="sm"
              variante="contorno"
              to={`/farmacia/entrada?medicamentoId=${x.medicamento.id}`}
              aria-label={e.entradaDe(nomeMedicamento(x.medicamento))}
              iconeEsquerda={<PackagePlus size={15} />}
            >
              {tf.entradaLote}
            </ButtonLink>
            {x.disponivel > 0 && (
              <ButtonLink
                tamanho="sm"
                variante="suave"
                to={`/farmacia/dispensar?medicamentoId=${x.medicamento.id}`}
                aria-label={e.dispensarDe(nomeMedicamento(x.medicamento))}
                iconeEsquerda={<Pill size={15} />}
              >
                {tf.dispensar}
              </ButtonLink>
            )}
          </span>
        ) : null
      }
    />
  );
}
