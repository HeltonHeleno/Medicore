import { useNavigate } from 'react-router-dom';
import { FormMedicamento } from '../../components/farmacia/FormMedicamento';
import { valoresDoMedicamento } from '../../components/farmacia/valores-medicamento';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { useToast } from '../../hooks/useToast';
import { tf } from '../../i18n/pt-BR/farmacia';
import { criarMedicamento } from '../../services/farmacia';

/** /farmacia/medicamentos/novo — F1. Depois de salvar, vai para o detalhe (com "Registrar entrada"). */
export default function NovoMedicamento() {
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <>
      <CabecalhoPagina titulo={tf.novoMedicamento} descricao={tf.formMedicamento.descricaoNovo} />
      <FormMedicamento
        inicial={valoresDoMedicamento()}
        aoEnviar={async (dados) => {
          const m = await criarMedicamento(dados);
          toast.sucesso(tf.formMedicamento.cadastrado);
          navigate(`/farmacia/medicamentos/${m.id}`);
        }}
        aoCancelar={() => navigate('/farmacia')}
      />
    </>
  );
}
