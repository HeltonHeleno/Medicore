import { AlertTriangle, Info } from 'lucide-react';
import { useId, useState } from 'react';
import { EVASAO_MIN } from '../../config/limites';
import { te } from '../../i18n/pt-BR/emergencia';
import { ErroValidacao } from '../../services/erros';
import {
  desfechosPermitidos,
  encerrar,
  type ResultadoEncerramento,
} from '../../services/emergencia';
import type { AtendimentoDetalhado, TipoDesfecho } from '../../types';
import { deCampoDataHora, paraCampoDataHora } from '../../utils/datas';
import { agora } from '../../utils/relogio';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { Campo } from '../ui/form/Campo';
import { Input } from '../ui/form/Input';
import { Textarea } from '../ui/form/Textarea';
import { evasaoLiberada } from './acoes-atendimento';

const d = te.dialogos;
type Direto = Exclude<TipoDesfecho, 'internacao'>;
const ORDEM: Direto[] = ['alta', 'transferencia', 'obito', 'evasao'];

interface DialogoDesfechoProps {
  atendimento: AtendimentoDetalhado | null;
  aoFechar: () => void;
  aoEncerrar: (r: ResultadoEncerramento, tipo: Direto) => void;
  aoErro: (erro: unknown) => void;
}

/**
 * E5: só os desfechos permitidos no status; a evasão aparece desabilitada, com o motivo,
 * antes de 30 min da chegada. Óbito e evasão têm um segundo passo no mesmo diálogo (R-X7).
 * Em "aguardando leito", avisa que o pedido é cancelado e a reserva liberada (R-E15).
 */
export function DialogoDesfecho({
  atendimento,
  aoFechar,
  aoEncerrar,
  aoErro,
}: DialogoDesfechoProps) {
  const [tipo, setTipo] = useState<Direto | ''>('');
  const [em, setEm] = useState(() => paraCampoDataHora(agora()));
  const [hospital, setHospital] = useState('');
  const [observacao, setObservacao] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const idLegenda = useId();

  const [idAntes, setIdAntes] = useState(atendimento?.id);
  if (atendimento?.id !== idAntes) {
    setIdAntes(atendimento?.id);
    const permitidos = atendimento ? desfechosPermitidos(atendimento.status) : [];
    setTipo(permitidos.includes('alta') ? 'alta' : '');
    setEm(paraCampoDataHora(agora()));
    setHospital('');
    setObservacao('');
    setConfirmando(false);
    setErros({});
    setEnviando(false);
  }

  const permitidos = atendimento ? desfechosPermitidos(atendimento.status) : [];
  const evasaoOk = atendimento ? evasaoLiberada(atendimento.chegadaEm) : false;

  async function gravar() {
    if (!atendimento || !tipo) return;
    setEnviando(true);
    setErros({});
    try {
      const r = await encerrar(
        atendimento.id,
        {
          tipo,
          em: deCampoDataHora(em),
          hospitalDestino: tipo === 'transferencia' ? hospital.trim() : undefined,
          observacao: observacao.trim() || undefined,
        },
        atendimento.versao,
      );
      aoEncerrar(r, tipo);
    } catch (e) {
      setEnviando(false);
      setConfirmando(false);
      if (e instanceof ErroValidacao) setErros(e.campos);
      else aoErro(e);
    }
  }

  function avancar() {
    if (!tipo) {
      setErros({ tipo: d.desfecho });
      return;
    }
    if (tipo === 'obito' || tipo === 'evasao') setConfirmando(true);
    else void gravar();
  }

  const titulo = !atendimento
    ? ''
    : confirmando && tipo === 'obito'
      ? d.obitoTitulo(atendimento.nomeExibicao)
      : confirmando && tipo === 'evasao'
        ? d.evasaoTitulo(atendimento.numero)
        : d.desfechoTitulo(atendimento.numero);

  return (
    <Modal
      aberto={atendimento !== null}
      aoFechar={aoFechar}
      titulo={titulo}
      descricao={!confirmando ? atendimento?.nomeExibicao : undefined}
      papel={confirmando ? 'alertdialog' : 'dialog'}
      rodape={
        confirmando ? (
          <>
            <Button variante="contorno" onClick={() => setConfirmando(false)}>
              {te.voltar}
            </Button>
            <Button variante="perigo" disabled={enviando} onClick={gravar}>
              {enviando ? te.salvando : tipo === 'obito' ? d.registrarObito : d.registrarEvasao}
            </Button>
          </>
        ) : (
          <>
            <Button variante="contorno" onClick={aoFechar}>
              {te.voltar}
            </Button>
            <Button disabled={enviando || permitidos.length === 0} onClick={avancar}>
              {enviando ? te.salvando : d.encerrar}
            </Button>
          </>
        )
      }
    >
      {confirmando ? (
        <p className="flex items-start gap-2.5 text-[14px]">
          <AlertTriangle size={18} aria-hidden className="mt-0.5 shrink-0 text-danger" />
          {tipo === 'obito' ? d.obitoMensagem : d.evasaoMensagem}
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            avancar();
          }}
          className="space-y-4"
        >
          {atendimento?.status === 'aguardando_leito' && (
            <p className="flex items-start gap-2 rounded-lg border border-warning/40 px-3 py-2 text-[13.5px]">
              <Info size={16} aria-hidden className="mt-0.5 shrink-0 text-warning" />
              {d.cancelaPedido}
            </p>
          )}
          <fieldset
            id="campo-tipo"
            tabIndex={-1}
            aria-labelledby={idLegenda}
            aria-invalid={erros.tipo ? true : undefined}
            className="min-w-0 outline-none"
          >
            <legend id={idLegenda} className="mb-2 text-[13.5px] font-medium">
              {d.desfecho}
            </legend>
            <div className="flex flex-col gap-2">
              {ORDEM.filter((x) => permitidos.includes(x)).map((x) => {
                const bloqueada = x === 'evasao' && !evasaoOk;
                const idOpcao = `desfecho-${x}`;
                return (
                  <div key={x} className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      id={idOpcao}
                      name="tipo"
                      value={x}
                      checked={tipo === x}
                      disabled={bloqueada}
                      aria-describedby={bloqueada ? `${idOpcao}-dica` : undefined}
                      onChange={() => setTipo(x)}
                      className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
                    />
                    <label
                      htmlFor={idOpcao}
                      className={
                        bloqueada ? 'text-[14px] text-text-muted' : 'cursor-pointer text-[14px]'
                      }
                    >
                      {d.desfechosRotulo[x]}
                      {bloqueada && (
                        <span id={`${idOpcao}-dica`} className="block text-[12.5px]">
                          {d.evasaoIndisponivel(EVASAO_MIN)}
                        </span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
            {erros.tipo && (
              <p className="mt-1.5 text-[12.5px] font-medium text-danger">{erros.tipo}</p>
            )}
          </fieldset>
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
