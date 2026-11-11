import { LIMITE_CONFIRMACAO_QUANTIDADE } from '../../config/limites';
import { tf } from '../../i18n/pt-BR/farmacia';
import { t } from '../../i18n/pt-BR';
import type { EntradaDispensacao } from '../../schemas/farmacia';
import { quantidadeComUnidade } from '../../services/farmacia';
import type { EstoqueMedicamento } from '../../types';
import type { CorrespondenciaAlergia } from '../../utils/alergia';
import type { ValorItem } from './ItemDispensacao';

const d = tf.dispensarTela;
const v = t.validacao;

interface Entrada {
  pacienteId: string;
  temDestino: boolean;
  medicoId: string;
  itens: readonly ValorItem[];
  estoque: readonly EstoqueMedicamento[];
  alergias: readonly (CorrespondenciaAlergia | null | undefined)[];
}

/**
 * Conferências da tela antes do resumo (F3). O serviço refaz todas na gravação; aqui é
 * para mostrar o erro no campo certo, na ordem do formulário.
 */
export function validarDispensacao(x: Entrada): {
  erros: Record<string, string>;
  entrada: EntradaDispensacao;
} {
  const erros: Record<string, string> = {};
  if (!x.pacienteId) erros.pacienteId = v.selecione;
  else if (!x.temDestino) erros.pacienteId = d.semDestino;
  if (!x.medicoId) erros.medicoSolicitanteId = v.selecione;
  const vistos = new Set<string>();
  const alertas: NonNullable<EntradaDispensacao['alertasConfirmados']> = [];
  x.itens.forEach((item, i) => {
    const p = `itens.${i}`;
    if (!item.medicamentoId) {
      erros[`${p}.medicamentoId`] = v.selecione;
      return;
    }
    if (vistos.has(item.medicamentoId)) erros[`${p}.medicamentoId`] = d.repetido;
    vistos.add(item.medicamentoId);
    const e = x.estoque.find((y) => y.medicamento.id === item.medicamentoId);
    const qtd = item.quantidade ?? 0;
    if (qtd < 1) erros[`${p}.quantidade`] = v.inteiroPositivo;
    else if (e && qtd > e.disponivel)
      erros[`${p}.quantidade`] = d.acimaDoDisponivel(
        quantidadeComUnidade(e.medicamento, e.disponivel),
      );
    const alergia = x.alergias[i];
    if (alergia) {
      if (!item.cienteAlergia) erros[`${p}.cienteAlergia`] = tf.regras.alergiaSemJustificativa;
      else if (item.justificativaAlergia.trim().length < 10)
        erros[`${p}.justificativaAlergia`] = v.justificativaObrigatoria;
      else
        alertas.push({
          tipo: 'alergia',
          medicamentoId: item.medicamentoId,
          termo: alergia.termo,
          justificativa: item.justificativaAlergia.trim(),
        });
    }
    if (e?.medicamento.controlado) {
      if (!item.conferiReceita) erros[`${p}.conferiReceita`] = tf.regras.controladoSemConfirmacao;
      else alertas.push({ tipo: 'controlado', medicamentoId: item.medicamentoId });
    }
    if (qtd > LIMITE_CONFIRMACAO_QUANTIDADE) {
      if (!item.confirmoQuantidade)
        erros[`${p}.confirmoQuantidade`] = tf.regras.quantidadeAltaSemConfirmacao;
      else alertas.push({ tipo: 'quantidade_alta', medicamentoId: item.medicamentoId });
    }
  });
  return {
    erros,
    entrada: {
      pacienteId: x.pacienteId,
      medicoSolicitanteId: x.medicoId,
      itens: x.itens.map((i) => ({
        medicamentoId: i.medicamentoId,
        quantidade: i.quantidade ?? 0,
      })),
      alertasConfirmados: alertas,
    },
  };
}
