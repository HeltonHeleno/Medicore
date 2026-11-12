import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeEstoque } from '../../components/farmacia/BadgeEstoque';
import { DialogoMotivo } from '../../components/leitos/DialogoMotivo';
import { AbasModulo } from '../../components/ui/AbasModulo';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Campo } from '../../components/ui/form/Campo';
import { Input } from '../../components/ui/form/Input';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { DataTable, type Coluna } from '../../components/ui/lista/DataTable';
import { useLotesVencimento } from '../../hooks/useDadosOperacoes';
import { useToast } from '../../hooks/useToast';
import { tf } from '../../i18n/pt-BR/farmacia';
import { ErroValidacao } from '../../services/erros';
import { descartarVencidos, nomeMedicamento, quantidadeComUnidade } from '../../services/farmacia';
import type { LoteDetalhado, Medicamento } from '../../types';
import { formatarData } from '../../utils/datas';
import { textoValidade } from '../../utils/tempos';
import { abasFarmacia } from './abas';

const vt = tf.vencimentosTela;
const col = vt.colunas;
type LinhaLote = LoteDetalhado & { medicamento: Medicamento };
const classeLink =
  'rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none';

const colunas: Coluna<LinhaLote>[] = [
  {
    id: 'medicamento',
    titulo: col.medicamento,
    celula: (l) => (
      <span className="flex flex-col">
        <Link to={`/farmacia/medicamentos/${l.medicamentoId}`} className={classeLink}>
          {nomeMedicamento(l.medicamento)}
        </Link>
        {l.medicamento.controlado && (
          <span className="text-[12.5px] text-text-muted">
            {tf.controlado(l.medicamento.controlado.lista)}
          </span>
        )}
      </span>
    ),
  },
  { id: 'lote', titulo: col.lote, celula: (l) => <span className="font-mono">{l.numero}</span> },
  {
    id: 'validade',
    titulo: col.validade,
    celula: (l) => (
      <span className="flex flex-col whitespace-nowrap">
        {formatarData(l.validade)}
        <span className="text-[12px] text-text-muted">{textoValidade(l.validade)}</span>
      </span>
    ),
  },
  {
    id: 'saldo',
    titulo: col.saldo,
    celula: (l) => (
      <span className="tabular-nums">{quantidadeComUnidade(l.medicamento, l.quantidadeAtual)}</span>
    ),
  },
  {
    id: 'situacao',
    titulo: tf.estoqueTela.colunas.situacao,
    celula: (l) => (
      <span className="flex flex-wrap gap-1">
        <BadgeEstoque situacao={l.vencido ? 'vencido' : 'vencendo'} />
        {l.bloqueio && <BadgeEstoque situacao="bloqueado" />}
      </span>
    ),
  },
];

/** /farmacia/vencimentos — vencendo em 60 dias e vencidos; descarte em lote (F6). */
export default function Vencimentos() {
  const lotes = useLotesVencimento();
  const toast = useToast();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [descartando, setDescartando] = useState(false);
  const [termo, setTermo] = useState('');
  const [erroTermo, setErroTermo] = useState<string | undefined>();
  const [avisoSelecao, setAvisoSelecao] = useState<string | undefined>();

  const vencidos = (lotes.data ?? []).filter((l) => l.vencido);
  const vencendo = (lotes.data ?? []).filter((l) => !l.vencido);
  // Seleção só com os que ainda existem (outra aba pode ter descartado).
  const escolhidos = vencidos.filter((l) => selecionados.has(l.id));
  const comControlado = escolhidos.some((l) => !!l.medicamento.controlado);

  return (
    <>
      <CabecalhoPagina titulo={tf.abas.vencimentos} descricao={vt.descricao} />
      <AbasModulo rotulo={tf.abasRotulo} abas={abasFarmacia} className="mb-5" />
      <div className="space-y-5">
        <Card titulo={vt.vencidos}>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Button
              variante="perigo"
              iconeEsquerda={<Trash2 size={16} />}
              onClick={() => {
                if (escolhidos.length === 0) {
                  setAvisoSelecao(vt.selecione);
                  return;
                }
                setAvisoSelecao(undefined);
                setTermo('');
                setErroTermo(undefined);
                setDescartando(true);
              }}
            >
              {vt.descartar(escolhidos.length)}
            </Button>
            {avisoSelecao && (
              <p role="alert" className="text-[13.5px] font-medium text-danger">
                {avisoSelecao}
              </p>
            )}
          </div>
          <DataTable
            legenda={vt.legendaVencidos}
            colunas={colunas}
            linhas={lotes.data ? vencidos : null}
            chave={(l) => l.id}
            nomeDaLinha={(l) => `${nomeMedicamento(l.medicamento)}, lote ${l.numero}`}
            carregando={lotes.carregando}
            erro={lotes.erro}
            aoTentarNovamente={lotes.recarregar}
            mensagemVazia={vt.nenhumVencido}
            selecao={{ selecionados, aoMudar: setSelecionados }}
          />
        </Card>
        <Card titulo={vt.vencendo}>
          <DataTable
            legenda={vt.legendaVencendo}
            colunas={colunas}
            linhas={lotes.data ? vencendo : null}
            chave={(l) => l.id}
            nomeDaLinha={(l) => `${nomeMedicamento(l.medicamento)}, lote ${l.numero}`}
            carregando={lotes.carregando}
            mensagemVazia={vt.nenhumVencendo}
          />
        </Card>
      </div>

      <DialogoMotivo
        aberto={descartando}
        titulo={vt.descartarTitulo(escolhidos.length)}
        descricao={vt.descartarDescricao}
        rotulo={vt.motivo}
        sugestoes={[vt.motivoPadrao]}
        rotuloConfirmar={vt.descartarBotao}
        perigo
        aoFechar={() => setDescartando(false)}
        aoConfirmar={async (motivo) => {
          if (comControlado && !termo.trim()) {
            setErroTermo(tf.regras.termoObrigatorio);
            // Erro fica no campo do termo; o do motivo continua vazio.
            throw new Error('');
          }
          try {
            const r = await descartarVencidos({
              loteIds: escolhidos.map((l) => l.id),
              motivo,
              termo: termo.trim() || undefined,
            });
            setDescartando(false);
            setSelecionados(new Set());
            toast.sucesso(tf.avisos.lotesDescartados(r.lotes, r.unidades));
          } catch (e) {
            if (e instanceof ErroValidacao && e.campos.termo) {
              setErroTermo(e.campos.termo);
              throw new Error('');
            }
            throw e;
          }
        }}
      >
        {comControlado && (
          <Campo rotulo={vt.termo} nome="termo" obrigatorio dica={vt.termoDica} erro={erroTermo}>
            <Input value={termo} onChange={(e) => setTermo(e.target.value)} maxLength={60} />
          </Campo>
        )}
      </DialogoMotivo>
    </>
  );
}
