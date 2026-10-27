import { CalendarClock, X } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useColecao } from '../../hooks/useColecao';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { repoConsultas } from '../../services/colecoes';
import { cancelarConsulta, listarConsultas } from '../../services/consultas';
import { ErroValidacao } from '../../services/erros';
import { inativarMedico } from '../../services/medicos';
import type { ConsultaDetalhada } from '../../types';
import { formatarDataHora } from '../../utils/datas';
import { agora } from '../../utils/relogio';
import { Button } from '../ui/Button';
import { Modal } from '../ui/feedback/Modal';
import { classesControle } from '../ui/form/estilos';

const m = t.medicos;
const COLECOES = [repoConsultas.nome];

interface Props {
  medico: { id: string; nomeExibicao: string } | null;
  aoFechar: (inativou: boolean) => void;
}

/** Cancelamento em linha, sem abrir um segundo diálogo por cima. */
function LinhaConsulta({ consulta }: { consulta: ConsultaDetalhada }) {
  const toast = useToast();
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const idMotivo = useId();

  async function confirmar() {
    setEnviando(true);
    setErro(null);
    try {
      await cancelarConsulta(consulta.id, motivo, consulta.versao);
      toast.sucesso(m.consultaCancelada);
    } catch (e) {
      setErro(
        e instanceof ErroValidacao
          ? (e.campos.motivo ?? e.message)
          : e instanceof Error
            ? e.message
            : '',
      );
      setEnviando(false);
    }
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium tabular-nums">{formatarDataHora(consulta.inicio)}</p>
          <p className="text-[13px] text-text-muted">{consulta.pacienteNome}</p>
        </div>
        {!cancelando && (
          <div className="flex gap-2">
            <Link
              to={`/consultas/${consulta.id}/editar`}
              className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-on-primary-light hover:bg-primary-light/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {m.reagendar}
            </Link>
            <button
              type="button"
              onClick={() => setCancelando(true)}
              className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-danger hover:bg-danger-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {m.cancelarConsulta}
            </button>
          </div>
        )}
      </div>
      {cancelando && (
        <div className="mt-2 space-y-2">
          <label htmlFor={idMotivo} className="text-[13px] font-medium">
            {m.motivoCancelamento}
          </label>
          <textarea
            id={idMotivo}
            autoFocus
            rows={2}
            maxLength={300}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? `${idMotivo}-erro` : undefined}
            className={classesControle}
          />
          {erro && (
            <p id={`${idMotivo}-erro`} className="text-[12.5px] font-medium text-danger">
              {erro}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              tamanho="sm"
              variante="contorno"
              iconeEsquerda={<X size={14} />}
              onClick={() => setCancelando(false)}
            >
              {m.voltar}
            </Button>
            <Button tamanho="sm" disabled={enviando} onClick={confirmar} variante="perigo">
              {m.confirmarCancelamento}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * P8 / R-M2: enquanto houver consultas futuras agendadas, o botão "Inativar" fica
 * desabilitado. A lista se atualiza sozinha quando uma consulta é cancelada ou
 * reagendada (inclusive em outra aba).
 */
export function DialogoInativarMedico({ medico, aoFechar }: Props) {
  const toast = useToast();
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const idMotivo = useId();
  const id = medico?.id ?? '';

  const futuras = useColecao(
    () =>
      id
        ? listarConsultas({ medicoId: id, status: 'agendada' }).then((l) =>
            l.filter((c) => new Date(c.inicio).getTime() >= agora().getTime()),
          )
        : Promise.resolve([]),
    [id],
    COLECOES,
  );

  // Outro médico: começa do zero (ajuste durante a renderização, sem efeito).
  const [idAnterior, setIdAnterior] = useState(id);
  if (id !== idAnterior) {
    setIdAnterior(id);
    setMotivo('');
    setEnviando(false);
  }

  const pendentes = futuras.data ?? [];
  const carregando = futuras.data === null;
  const liberado = !carregando && pendentes.length === 0;

  async function inativar() {
    if (!medico) return;
    setEnviando(true);
    try {
      await inativarMedico(medico.id, motivo.trim() || undefined);
      toast.sucesso(m.inativado);
      aoFechar(true);
    } catch (e) {
      toast.erro(e instanceof Error ? e.message : t.erros.inesperadoTitulo);
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto={medico !== null}
      aoFechar={() => aoFechar(false)}
      titulo={medico ? m.inativarTitulo(medico.nomeExibicao) : ''}
      descricao={
        carregando
          ? undefined
          : liberado
            ? m.inativarLiberado
            : m.inativarBloqueado(pendentes.length)
      }
      papel="alertdialog"
      tamanho="md"
      rodape={
        <>
          <Button variante="contorno" onClick={() => aoFechar(false)}>
            {t.confirmacao.cancelar}
          </Button>
          <Button disabled={!liberado || enviando} onClick={inativar} variante="perigo">
            {m.acoes.inativar}
          </Button>
        </>
      }
    >
      {pendentes.length > 0 && (
        <section aria-label={m.consultasPendentes}>
          <h3 className="flex items-center gap-2 text-[13.5px] font-semibold">
            <CalendarClock size={16} aria-hidden />
            {m.consultasPendentes} ({pendentes.length})
          </h3>
          <ul className="divide-y divide-border">
            {pendentes.map((c) => (
              <LinhaConsulta key={c.id} consulta={c} />
            ))}
          </ul>
        </section>
      )}
      {liberado && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idMotivo} className="text-[13.5px] font-medium">
            {m.motivoInativacao}
          </label>
          <textarea
            id={idMotivo}
            rows={2}
            maxLength={200}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={classesControle}
          />
        </div>
      )}
    </Modal>
  );
}
