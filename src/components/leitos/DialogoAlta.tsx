import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { tl } from '../../i18n/pt-BR/leitos';
import { TIPOS_ALTA } from '../../schemas/internacao';
import { ErroValidacao } from '../../services/erros';
import { darAlta, type ResultadoAlta } from '../../services/leitos';
import type { InternacaoDetalhada, TipoAlta } from '../../types';
import { deCampoDataHora, paraCampoDataHora } from '../../utils/datas';
import { agora } from '../../utils/relogio';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { Campo } from '../ui/form/Campo';
import { Input } from '../ui/form/Input';
import { RadioGroup } from '../ui/form/RadioGroup';
import { Textarea } from '../ui/form/Textarea';

interface DialogoAltaProps {
  internacao: InternacaoDetalhada | null;
  aoFechar: () => void;
  aoRegistrar: (resultado: ResultadoAlta, tipo: TipoAlta) => void;
  aoErro: (erro: unknown) => void;
}

/**
 * L3: tipo, data e hora (padrão agora), hospital de destino (transferência) e observação.
 * Óbito tem um segundo passo, no mesmo diálogo, com o aviso da R-X7.
 */
export function DialogoAlta({ internacao, aoFechar, aoRegistrar, aoErro }: DialogoAltaProps) {
  const d = tl.dialogos;
  const [tipo, setTipo] = useState<TipoAlta>('melhorada');
  const [em, setEm] = useState(() => paraCampoDataHora(agora()));
  const [hospital, setHospital] = useState('');
  const [observacao, setObservacao] = useState('');
  const [confirmandoObito, setConfirmandoObito] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const [idAntes, setIdAntes] = useState(internacao?.id);
  if (internacao?.id !== idAntes) {
    setIdAntes(internacao?.id);
    setTipo('melhorada');
    setEm(paraCampoDataHora(agora()));
    setHospital('');
    setObservacao('');
    setConfirmandoObito(false);
    setErros({});
    setEnviando(false);
  }

  async function gravar() {
    if (!internacao) return;
    setEnviando(true);
    setErros({});
    try {
      const r = await darAlta(
        internacao.id,
        {
          tipo,
          em: deCampoDataHora(em),
          hospitalDestino: tipo === 'transferencia' ? hospital.trim() : undefined,
          observacao: observacao.trim() || undefined,
        },
        internacao.versao,
      );
      aoRegistrar(r, tipo);
    } catch (e) {
      setEnviando(false);
      setConfirmandoObito(false);
      if (e instanceof ErroValidacao) setErros(e.campos);
      else aoErro(e);
    }
  }

  const avancar = () => (tipo === 'obito' ? setConfirmandoObito(true) : void gravar());

  return (
    <Modal
      aberto={internacao !== null}
      aoFechar={aoFechar}
      titulo={
        internacao
          ? confirmandoObito
            ? d.obitoTitulo(internacao.pacienteNome)
            : d.altaTitulo(internacao.pacienteNome)
          : ''
      }
      descricao={
        internacao && !confirmandoObito
          ? d.altaResumo(internacao.leitoCodigo, tl.avisos.permanencia(internacao.permanenciaDias))
          : undefined
      }
      papel={confirmandoObito ? 'alertdialog' : 'dialog'}
      rodape={
        confirmandoObito ? (
          <>
            <Button variante="contorno" onClick={() => setConfirmandoObito(false)}>
              {tl.voltar}
            </Button>
            <Button variante="perigo" disabled={enviando} onClick={gravar}>
              {enviando ? tl.salvando : d.registrarObito}
            </Button>
          </>
        ) : (
          <>
            <Button variante="contorno" onClick={aoFechar}>
              {tl.voltar}
            </Button>
            <Button disabled={enviando} onClick={avancar}>
              {enviando ? tl.salvando : d.registrarAlta}
            </Button>
          </>
        )
      }
    >
      {confirmandoObito ? (
        <p className="flex items-start gap-2.5 text-[14px]">
          <AlertTriangle size={18} aria-hidden className="mt-0.5 shrink-0 text-danger" />
          {d.obitoMensagem}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            avancar();
          }}
          className="space-y-4"
        >
          <RadioGroup
            legenda={d.tipoAlta}
            nome="tipo"
            obrigatorio
            opcoes={TIPOS_ALTA.map((x) => ({ valor: x, rotulo: d.tiposAltaRotulo[x] }))}
            valor={tipo}
            aoMudar={setTipo}
            erro={erros.tipo}
          />
          <Campo rotulo={d.dataHora} nome="em" obrigatorio erro={erros.em}>
            <Input type="datetime-local" value={em} onChange={(e) => setEm(e.target.value)} />
          </Campo>
          {tipo === 'transferencia' && (
            <Campo
              rotulo={d.hospitalDestino}
              nome="hospitalDestino"
              obrigatorio
              erro={erros.hospitalDestino}
            >
              <Input
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                maxLength={120}
              />
            </Campo>
          )}
          <Campo rotulo={d.observacao} nome="observacao" erro={erros.observacao}>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </Campo>
        </form>
      )}
    </Modal>
  );
}
