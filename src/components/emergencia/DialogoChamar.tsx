import { useEffect, useState } from 'react';
import { te } from '../../i18n/pt-BR/emergencia';
import { chamar, medicosParaChamar } from '../../services/emergencia';
import { nomeExibicaoMedico } from '../../services/medicos';
import type { AtendimentoDetalhado, Medico } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { Campo } from '../ui/form/Campo';
import { Select } from '../ui/form/Select';
import { SkeletonLinhas } from '../ui/Skeleton';

const d = te.dialogos;
/** Último médico escolhido **nesta aba** (sessionStorage; falha silenciosa, R-E7). */
const CHAVE = 'medicore:emergencia:ultimoMedico';
const lerUltimo = () => {
  try {
    return sessionStorage.getItem(CHAVE) ?? '';
  } catch {
    return '';
  }
};
const guardarUltimo = (id: string) => {
  try {
    sessionStorage.setItem(CHAVE, id);
  } catch {
    // Armazenamento indisponível: só não lembra a escolha.
  }
};

interface DialogoChamarProps {
  atendimento: AtendimentoDetalhado | null;
  aoFechar: () => void;
  aoChamado: (medicoNome: string) => void;
  aoErro: (erro: unknown) => void;
}

/** E3: escolhe o médico (os da Emergência primeiro; o último escolhido vem marcado). */
export function DialogoChamar({ atendimento, aoFechar, aoChamado, aoErro }: DialogoChamarProps) {
  const [medicos, setMedicos] = useState<Medico[] | null>(null);
  const [medicoId, setMedicoId] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);

  const [idAntes, setIdAntes] = useState(atendimento?.id);
  if (atendimento?.id !== idAntes) {
    setIdAntes(atendimento?.id);
    setErro(undefined);
    setEnviando(false);
    setMedicoId('');
  }

  useEffect(() => {
    if (!atendimento) return;
    let ativo = true;
    void medicosParaChamar().then((lista) => {
      if (!ativo) return;
      setMedicos(lista);
      const ultimo = lerUltimo();
      setMedicoId(lista.some((m) => m.id === ultimo) ? ultimo : (lista[0]?.id ?? ''));
    });
    return () => {
      ativo = false;
    };
  }, [atendimento]);

  async function confirmar() {
    if (!atendimento) return;
    if (!medicoId) {
      setErro(d.medico);
      return;
    }
    setEnviando(true);
    try {
      await chamar(atendimento.id, medicoId, atendimento.versao);
      guardarUltimo(medicoId);
      const m = medicos?.find((x) => x.id === medicoId);
      aoChamado(m ? nomeExibicaoMedico(m) : '');
    } catch (e) {
      setEnviando(false);
      aoErro(e);
    }
  }

  return (
    <Modal
      aberto={atendimento !== null}
      aoFechar={aoFechar}
      titulo={atendimento ? d.chamarTitulo(atendimento.numero) : ''}
      descricao={atendimento?.nomeExibicao}
      tamanho="sm"
      rodape={
        <>
          <Button variante="contorno" onClick={aoFechar}>
            {te.voltar}
          </Button>
          <Button disabled={enviando || !medicos} onClick={confirmar}>
            {enviando ? te.salvando : te.chamar}
          </Button>
        </>
      }
    >
      {medicos ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void confirmar();
          }}
        >
          <Campo rotulo={d.medico} nome="medicoId" obrigatorio dica={d.medicoDica} erro={erro}>
            <Select
              vazia={false}
              value={medicoId}
              onChange={(e) => setMedicoId(e.target.value)}
              opcoes={medicos.map((m) => ({ valor: m.id, rotulo: nomeExibicaoMedico(m) }))}
            />
          </Campo>
        </form>
      ) : (
        <SkeletonLinhas linhas={1} />
      )}
    </Modal>
  );
}
