import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FormMedicamento } from '../../components/farmacia/FormMedicamento';
import { valoresDoMedicamento } from '../../components/farmacia/valores-medicamento';
import { ErrorState } from '../../components/ui/EmptyState';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { NaoEncontrado } from '../../components/ui/NaoEncontrado';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { useConfirmar } from '../../hooks/useConfirmar';
import { useMedicamento } from '../../hooks/useDadosOperacoes';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { tf } from '../../i18n/pt-BR/farmacia';
import { ErroConcorrencia, ErroNaoEncontrado } from '../../services/erros';
import {
  editarMedicamento,
  nomeMedicamento,
  obterMedicamento,
  type DetalheMedicamento,
} from '../../services/farmacia';

const f = tf.formMedicamento;

/** /farmacia/medicamentos/:id/editar — F1, com a versão carregada (R-G1, E-05). */
export default function EditarMedicamento() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirmar = useConfirmar();
  const { data, erro, recarregar } = useMedicamento(id);
  const [base, setBase] = useState<DetalheMedicamento | null>(null);
  const [chave, setChave] = useState(0);
  if (data && !base) setBase(data);

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.medicamentoNaoEncontrado}
        descricao={tf.detalheTela.naoEncontradoDescricao}
        voltarPara="/farmacia"
        rotuloVoltar={tf.voltar}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!base) {
    return (
      <div aria-busy="true">
        <SkeletonLinhas linhas={8} />
      </div>
    );
  }
  const m = base.estoque.medicamento;
  const nome = nomeMedicamento(m);

  return (
    <>
      <CabecalhoPagina
        titulo={tf.detalheTela.acoes.editar}
        descricao={f.descricaoEditar(nome)}
        breadcrumbNomes={{ [`/farmacia/medicamentos/${id}`]: nome }}
      />
      <FormMedicamento
        key={chave}
        inicial={valoresDoMedicamento(m)}
        travado={base.temMovimentacao}
        aoEnviar={async (dados) => {
          try {
            await editarMedicamento(id, dados, m.versao);
          } catch (e) {
            if (!(e instanceof ErroConcorrencia)) throw e;
            // E-05: recarregar (perde as alterações) ou continuar editando sobre a versão atual.
            const recarregarAgora = await confirmar({
              titulo: f.concorrenciaTitulo,
              mensagem: t.erros.concorrencia,
              rotuloConfirmar: f.recarregar,
              rotuloCancelar: f.continuar,
            });
            setBase(await obterMedicamento(id));
            if (recarregarAgora) setChave((k) => k + 1);
            return false;
          }
          toast.sucesso(f.salvo);
          navigate(`/farmacia/medicamentos/${id}`);
        }}
        aoCancelar={() => navigate(`/farmacia/medicamentos/${id}`)}
      />
    </>
  );
}
