import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormPaciente } from '../../components/pacientes/FormPaciente';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { SEXOS } from '../../schemas/paciente';
import { criarPaciente } from '../../services/pacientes';

/** Só aceita caminhos internos (evita redirecionar para outro site). */
const caminhoInterno = (valor: string | null) =>
  valor && valor.startsWith('/') && !valor.startsWith('//') ? valor : null;

/**
 * /pacientes/novo — P1. Com `?voltarPara=/consultas/nova`, depois de salvar volta
 * para o agendamento com o novo paciente selecionado (`?pacienteId=`).
 * `?sexo=` pré-preenche o sexo (identificação de um atendimento provisório, E7).
 */
export default function NovoPaciente() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const voltarPara = caminhoInterno(params.get('voltarPara'));
  const sexo = SEXOS.find((x) => x === params.get('sexo'));

  return (
    <>
      <CabecalhoPagina titulo={t.pacientes.novo} />
      <FormPaciente
        sexoInicial={sexo}
        aoEnviar={async (dados) => {
          const paciente = await criarPaciente(dados);
          toast.sucesso(t.pacientes.cadastrado);
          if (voltarPara) {
            const sep = voltarPara.includes('?') ? '&' : '?';
            navigate(`${voltarPara}${sep}pacienteId=${paciente.id}`);
          } else {
            navigate(`/pacientes/${paciente.id}`);
          }
        }}
        aoCancelar={() => navigate(voltarPara ?? '/pacientes')}
      />
    </>
  );
}
