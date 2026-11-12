import { ShieldAlert, Trash2 } from 'lucide-react';
import { LIMITE_CONFIRMACAO_QUANTIDADE } from '../../config/limites';
import { useColecao } from '../../hooks/useColecao';
import { tf } from '../../i18n/pt-BR/farmacia';
import { COLECOES } from '../../services/colecoes-operacoes';
import { nomeMedicamento, previaFefo, quantidadeComUnidade } from '../../services/farmacia';
import type { EstoqueMedicamento } from '../../types';
import type { CorrespondenciaAlergia } from '../../utils/alergia';
import { formatarData } from '../../utils/datas';
import { Button } from '../ui/Button';
import { Campo } from '../ui/form/Campo';
import { CampoQuantidade } from '../ui/form/CampoQuantidade';
import { Checkbox } from '../ui/form/Checkbox';
import { Select } from '../ui/form/Select';
import { AlertaAlergia } from './AlertaAlergia';

const d = tf.dispensarTela;

/** Um item como está na tela (19.5.4). */
export interface ValorItem {
  chave: string;
  medicamentoId: string;
  quantidade: number | null;
  cienteAlergia: boolean;
  justificativaAlergia: string;
  conferiReceita: boolean;
  confirmoQuantidade: boolean;
}

interface ItemDispensacaoProps {
  indice: number;
  valor: ValorItem;
  aoMudar: (mudancas: Partial<ValorItem>) => void;
  aoRemover?: () => void;
  /** Medicamentos ativos com o disponível (os sem estoque ficam de fora, menos o escolhido). */
  estoque: readonly EstoqueMedicamento[];
  alergia: CorrespondenciaAlergia | null | undefined;
  erros: Record<string, string>;
}

/**
 * Item da dispensação: medicamento (com o disponível), quantidade, prévia FEFO atualizada
 * a cada mudança (A9) e os alertas do item — alergia (R-F8), controlado (R-F7) e
 * quantidade alta (R-F14).
 */
export function ItemDispensacao({
  indice,
  valor,
  aoMudar,
  aoRemover,
  estoque,
  alergia,
  erros,
}: ItemDispensacaoProps) {
  const prefixo = `itens.${indice}`;
  const atual = estoque.find((x) => x.medicamento.id === valor.medicamentoId);
  const m = atual?.medicamento;
  const opcoes = estoque.filter(
    (x) => x.disponivel > 0 || x.medicamento.id === valor.medicamentoId,
  );
  const qtd = valor.quantidade ?? 0;
  const acima = !!atual && qtd > atual.disponivel;
  const previa = useColecao(
    () => (m && qtd > 0 && !acima ? previaFefo(m.id, qtd) : Promise.resolve(null)),
    [m?.id, qtd, acima],
    COLECOES.farmacia,
  );
  const unidade = m ? tf.unidades[m.unidade](2) : '';
  const erro = (campo: string) => erros[`${prefixo}.${campo}`];

  return (
    <fieldset className="min-w-0 space-y-3 rounded-lg border border-border p-3 sm:p-4">
      <legend className="px-1 text-[14px] font-semibold">{d.item(indice + 1)}</legend>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-start">
        <Campo
          rotulo={d.medicamento}
          nome={`${prefixo}.medicamentoId`}
          obrigatorio
          erro={erro('medicamentoId')}
        >
          <Select
            value={valor.medicamentoId}
            onChange={(e) =>
              aoMudar({
                medicamentoId: e.target.value,
                cienteAlergia: false,
                justificativaAlergia: '',
                conferiReceita: false,
              })
            }
            opcoes={opcoes.map((x) => ({
              valor: x.medicamento.id,
              rotulo: d.opcaoMedicamento(
                nomeMedicamento(x.medicamento),
                quantidadeComUnidade(x.medicamento, x.disponivel),
              ),
            }))}
          />
        </Campo>
        <Campo
          rotulo={unidade ? d.quantidade(unidade) : tf.dialogos.quantidade}
          nome={`${prefixo}.quantidade`}
          obrigatorio
          erro={
            erro('quantidade') ??
            (acima && atual && m
              ? d.acimaDoDisponivel(quantidadeComUnidade(m, atual.disponivel))
              : undefined)
          }
          dica={atual && m ? d.disponivel(quantidadeComUnidade(m, atual.disponivel)) : undefined}
        >
          <CampoQuantidade
            valor={valor.quantidade}
            aoMudar={(quantidade) => aoMudar({ quantidade, confirmoQuantidade: false })}
            unidade={unidade}
            name={`${prefixo}.quantidade`}
          />
        </Campo>
        {aoRemover && (
          <Button
            variante="suave"
            tamanho="sm"
            onClick={aoRemover}
            aria-label={d.remover(indice + 1)}
            className="sm:mt-6"
          >
            <Trash2 size={16} aria-hidden />
          </Button>
        )}
      </div>

      {m && previa.data && previa.data.alocacoes.length > 0 && (
        <p className="text-[13px] text-text-muted">
          <span className="font-medium text-text">{d.prevista}:</span>{' '}
          {previa.data.alocacoes
            .map((a, i) =>
              tf.avisos.prevista(
                a.quantidade,
                previa.data!.lotes[i].numero,
                formatarData(previa.data!.lotes[i].validade),
              ),
            )
            .join(', ')}
        </p>
      )}

      {m && alergia && (
        <AlertaAlergia
          correspondencia={alergia}
          medicamento={nomeMedicamento(m)}
          ciente={valor.cienteAlergia}
          aoMudarCiente={(cienteAlergia) => aoMudar({ cienteAlergia })}
          justificativa={valor.justificativaAlergia}
          aoMudarJustificativa={(justificativaAlergia) => aoMudar({ justificativaAlergia })}
          erroCiente={erro('cienteAlergia')}
          erroJustificativa={erro('justificativaAlergia')}
          prefixo={prefixo}
        />
      )}

      {m?.controlado && (
        <div className="space-y-2 rounded-lg border border-warning/40 p-3">
          <p className="flex items-center gap-2 text-[13.5px] font-medium">
            <ShieldAlert size={16} aria-hidden className="shrink-0 text-warning" />
            {d.controlado} {tf.controlado(m.controlado.lista)}
          </p>
          <Checkbox
            name={`${prefixo}.conferiReceita`}
            rotulo={tf.conferiReceita}
            checked={valor.conferiReceita}
            onChange={(e) => aoMudar({ conferiReceita: e.target.checked })}
            erro={erro('conferiReceita')}
          />
        </div>
      )}

      {qtd > LIMITE_CONFIRMACAO_QUANTIDADE && (
        <div className="space-y-2 rounded-lg border border-warning/40 p-3">
          <p className="text-[13.5px] font-medium">
            {d.quantidadeAlta(LIMITE_CONFIRMACAO_QUANTIDADE)}
          </p>
          <Checkbox
            name={`${prefixo}.confirmoQuantidade`}
            rotulo={d.confirmoQuantidade}
            checked={valor.confirmoQuantidade}
            onChange={(e) => aoMudar({ confirmoQuantidade: e.target.checked })}
            erro={erro('confirmoQuantidade')}
          />
        </div>
      )}
    </fieldset>
  );
}
