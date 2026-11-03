import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { te } from '../../i18n/pt-BR/emergencia';
import { ErroConflito, ErroValidacao } from '../../services/erros';
import { vincularPaciente } from '../../services/emergencia';
import type { AtendimentoDetalhado } from '../../types';
import { ComboboxPaciente, type OpcaoPaciente } from '../pacientes/ComboboxPaciente';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { Campo } from '../ui/form/Campo';

const d = te.dialogos;

interface DialogoVincularProps {
  atendimento: AtendimentoDetalhado | null;
  /** Paciente já escolhido (ex.: acabou de ser cadastrado e voltou com `?pacienteId=`). */
  inicial?: OpcaoPaciente | null;
  aoFechar: () => void;
  aoVinculado: (nome: string) => void;
  aoErro: (erro: unknown) => void;
}

/**
 * E7: liga o atendimento provisório a um cadastro, escolhido na busca ou criado na hora
 * (`/pacientes/novo` volta para o atendimento com o sexo da descrição provisória).
 */
export function DialogoVincular({
  atendimento,
  inicial = null,
  aoFechar,
  aoVinculado,
  aoErro,
}: DialogoVincularProps) {
  const [paciente, setPaciente] = useState<OpcaoPaciente | null>(inicial);
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);

  const [idAntes, setIdAntes] = useState(atendimento?.id);
  if (atendimento?.id !== idAntes) {
    setIdAntes(atendimento?.id);
    setPaciente(inicial);
    setErro(undefined);
    setEnviando(false);
  }

  async function confirmar() {
    if (!atendimento) return;
    if (!paciente) {
      setErro(te.regras.semIdentificacao);
      return;
    }
    setEnviando(true);
    setErro(undefined);
    try {
      await vincularPaciente(atendimento.id, paciente.id, atendimento.versao);
      aoVinculado(paciente.nomeExibicao);
    } catch (e) {
      setEnviando(false);
      // E-14 (internado ou com outro atendimento aberto) fica no campo do paciente.
      if (e instanceof ErroConflito && e.codigo.startsWith('paciente_')) setErro(e.message);
      else if (e instanceof ErroValidacao) setErro(Object.values(e.campos)[0] ?? e.message);
      else aoErro(e);
    }
  }

  const voltar = atendimento
    ? `/pacientes/novo?voltarPara=${encodeURIComponent(`/emergencia/${atendimento.id}`)}${
        atendimento.provisorio ? `&sexo=${atendimento.provisorio.sexo}` : ''
      }`
    : '';

  return (
    <Modal
      aberto={atendimento !== null}
      aoFechar={aoFechar}
      titulo={atendimento ? d.vincularTitulo(atendimento.numero) : ''}
      descricao={
        atendimento?.provisorio ? d.vincularDescricao(atendimento.provisorio.descricao) : undefined
      }
      rodape={
        <>
          <Button variante="contorno" onClick={aoFechar}>
            {te.voltar}
          </Button>
          <Button disabled={enviando} onClick={confirmar}>
            {enviando ? te.salvando : d.vincular}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void confirmar();
        }}
        className="space-y-4"
      >
        <Campo rotulo={te.chegadaTela.paciente} nome="pacienteId" obrigatorio erro={erro}>
          <ComboboxPaciente
            name="pacienteId"
            valor={paciente}
            mostrarSituacao
            aoMudar={(p) => {
              setPaciente(p);
              setErro(undefined);
            }}
          />
        </Campo>
        {voltar && (
          <Link
            to={voltar}
            className="inline-flex items-center gap-1.5 rounded text-[13.5px] font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <UserPlus size={16} aria-hidden />
            {d.cadastrarNovo}
          </Link>
        )}
      </form>
    </Modal>
  );
}
