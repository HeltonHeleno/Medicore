import { useNavigate } from 'react-router-dom';
import { FormMedico } from '../../components/medicos/FormMedico';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { criarMedico } from '../../services/medicos';

/** /medicos/novo — P6. */
export default function NovoMedico() {
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <>
      <CabecalhoPagina titulo={t.medicos.novo} />
      <FormMedico
        aoEnviar={async (dados) => {
          const medico = await criarMedico(dados);
          toast.sucesso(t.medicos.cadastrado);
          navigate(`/medicos/${medico.id}`);
        }}
        aoCancelar={() => navigate('/medicos')}
      />
    </>
  );
}
