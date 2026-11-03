import { useState } from 'react';
import { SETORES_INTERNACAO, nomeSetor } from '../../config/setores';
import { tl } from '../../i18n/pt-BR/leitos';
import { PRECAUCOES } from '../../schemas/internacao';
import { ErroConflito, ErroValidacao } from '../../services/erros';
import { solicitarLeitoEletivo } from '../../services/leitos';
import type { Precaucao, SetorInternacaoId } from '../../types';
import { hojeNoFuso } from '../../utils/datas';
import { ComboboxPaciente, type OpcaoPaciente } from '../pacientes/ComboboxPaciente';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { Campo } from '../ui/form/Campo';
import { Input } from '../ui/form/Input';
import { RadioGroup } from '../ui/form/RadioGroup';
import { Select } from '../ui/form/Select';
import { Textarea } from '../ui/form/Textarea';

export interface InicialEletiva {
  paciente?: OpcaoPaciente | null;
  setorDesejado?: SetorInternacaoId;
  precaucao?: Precaucao;
  motivo?: string;
}

interface Props {
  aberto: boolean;
  inicial?: InicialEletiva;
  aoFechar: () => void;
  aoPedir: (pacienteNome: string, pacienteId: string) => void;
}

/** L9: pedido de leito para internação eletiva (prioridade verde; amarelo com justificativa). */
export function DialogoSolicitacaoEletiva({ aberto, inicial = {}, aoFechar, aoPedir }: Props) {
  const s = tl.solicitacoes;
  const c = tl.internar.campos;
  const [paciente, setPaciente] = useState<OpcaoPaciente | null>(null);
  const [setor, setSetor] = useState<string>('');
  const [precaucao, setPrecaucao] = useState<Precaucao>('padrao');
  const [data, setData] = useState(hojeNoFuso());
  const [motivo, setMotivo] = useState('');
  const [prioridade, setPrioridade] = useState<'verde' | 'amarelo'>('verde');
  const [justificativa, setJustificativa] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const [abertoAntes, setAbertoAntes] = useState(false);
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto);
    if (aberto) {
      setPaciente(inicial.paciente ?? null);
      setSetor(inicial.setorDesejado ?? '');
      setPrecaucao(inicial.precaucao ?? 'padrao');
      setData(hojeNoFuso());
      setMotivo(inicial.motivo ?? '');
      setPrioridade('verde');
      setJustificativa('');
      setErros({});
      setEnviando(false);
    }
  }

  async function confirmar() {
    setEnviando(true);
    setErros({});
    try {
      await solicitarLeitoEletivo({
        pacienteId: paciente?.id ?? '',
        setorDesejado: setor as SetorInternacaoId,
        precaucao,
        dataPrevista: data,
        motivo: motivo.trim(),
        prioridade,
        justificativaPrioridade: prioridade === 'amarelo' ? justificativa.trim() : undefined,
      });
      aoPedir(paciente?.nomeExibicao ?? '', paciente?.id ?? '');
    } catch (e) {
      setEnviando(false);
      if (e instanceof ErroValidacao) setErros(e.campos);
      else if (e instanceof ErroConflito && e.campo) setErros({ [e.campo]: e.message });
      else setErros({ pacienteId: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={s.eletivaTitulo}
      descricao={s.eletivaDescricao}
      tamanho="lg"
      rodape={
        <>
          <Button variante="contorno" onClick={aoFechar}>
            {tl.voltar}
          </Button>
          <Button disabled={enviando} onClick={confirmar}>
            {enviando ? tl.salvando : s.pedir}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void confirmar();
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Campo
          rotulo={c.paciente}
          nome="pacienteId"
          obrigatorio
          erro={erros.pacienteId}
          className="sm:col-span-2"
        >
          <ComboboxPaciente valor={paciente} aoMudar={setPaciente} mostrarSituacao />
        </Campo>
        <Campo rotulo={c.setorDesejado} nome="setorDesejado" obrigatorio erro={erros.setorDesejado}>
          <Select
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            opcoes={SETORES_INTERNACAO.map((x) => ({ valor: x, rotulo: nomeSetor(x) }))}
          />
        </Campo>
        <Campo rotulo={c.precaucao} nome="precaucao" obrigatorio erro={erros.precaucao}>
          <Select
            vazia={false}
            value={precaucao}
            onChange={(e) => setPrecaucao(e.target.value as Precaucao)}
            opcoes={PRECAUCOES.map((x) => ({ valor: x, rotulo: tl.precaucoes[x] }))}
          />
        </Campo>
        <Campo rotulo={s.dataPrevista} nome="dataPrevista" obrigatorio erro={erros.dataPrevista}>
          <Input
            type="date"
            min={hojeNoFuso()}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </Campo>
        <RadioGroup
          legenda={s.prioridade}
          nome="prioridade"
          opcoes={[
            { valor: 'verde', rotulo: s.prioridadeVerde },
            { valor: 'amarelo', rotulo: s.prioridadeAmarelo },
          ]}
          valor={prioridade}
          aoMudar={setPrioridade}
        />
        {prioridade === 'amarelo' && (
          <Campo
            rotulo={s.justificativaPrioridade}
            nome="justificativaPrioridade"
            obrigatorio
            erro={erros.justificativaPrioridade}
            className="sm:col-span-2"
          >
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              maxLength={300}
              rows={2}
            />
          </Campo>
        )}
        <Campo
          rotulo={c.motivo}
          nome="motivo"
          obrigatorio
          erro={erros.motivo}
          className="sm:col-span-2"
        >
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={300}
            rows={2}
          />
        </Campo>
      </form>
    </Modal>
  );
}
