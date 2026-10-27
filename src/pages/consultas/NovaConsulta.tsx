import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormConsulta } from '../../components/consultas/FormConsulta';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { agendarConsulta } from '../../services/consultas';
import { dataDoInstante, formatarDataCurta, horaDoInstante } from '../../utils/datas';

/** /consultas/nova — P9, com pré-preenchimento por `?pacienteId=`, `?medicoId=`, `?data=`. */
export default function NovaConsulta() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const inicial = {
    pacienteId: params.get('pacienteId') ?? undefined,
    medicoId: params.get('medicoId') ?? undefined,
    data: params.get('data') ?? undefined,
  };

  return (
    <>
      <CabecalhoPagina titulo={t.agenda.nova} />
      <FormConsulta
        // Novos parâmetros na URL (ex.: volta do cadastro de paciente) recomeçam o formulário.
        key={params.toString()}
        inicial={inicial}
        aoSalvar={async (dados) => {
          const c = await agendarConsulta(dados);
          toast.sucesso(
            t.agenda.agendada(
              formatarDataCurta(dataDoInstante(c.inicio)),
              horaDoInstante(c.inicio),
              c.medicoNome,
            ),
          );
          navigate(`/consultas/${c.id}`);
        }}
        aoCancelar={() => navigate(-1)}
      />
    </>
  );
}
