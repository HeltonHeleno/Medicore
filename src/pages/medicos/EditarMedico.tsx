import { AlertTriangle, Info, RotateCw } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FormMedico } from '../../components/medicos/FormMedico';
import { valoresDoMedico, type ValoresMedico } from '../../components/medicos/valoresMedico';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/EmptyState';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { NaoEncontrado } from '../../components/ui/NaoEncontrado';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { useConfirmar } from '../../hooks/useConfirmar';
import { useMedico } from '../../hooks/useDados';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { ErroConcorrencia, ErroNaoEncontrado } from '../../services/erros';
import {
  atualizarMedico,
  consultasAfetadas,
  nomeExibicaoMedico,
  obterMedico,
} from '../../services/medicos';
import type { Disponibilidade, Medico } from '../../types';

const m = t.medicos;

const mesmaDisponibilidade = (a: Disponibilidade, b: Disponibilidade) =>
  JSON.stringify({ ...a, pausa: a.pausa ?? null }) ===
  JSON.stringify({ ...b, pausa: b.pausa ?? null });

/** /medicos/:id/editar — P7: avisa as consultas que ficarão fora do novo horário (A3). */
export default function EditarMedico() {
  const { id = '' } = useParams();
  const { data, erro, recarregar } = useMedico(id);
  const [base, setBase] = useState<Medico | null>(null);
  const [chave, setChave] = useState(0);
  if (data && !base) setBase(data);

  const navigate = useNavigate();
  const toast = useToast();
  const confirmar = useConfirmar();
  const resetRef = useRef<((v: ValoresMedico) => void) | null>(null);
  const aoPronto = useCallback((api: { reset: (v: ValoresMedico) => void }) => {
    resetRef.current = api.reset;
  }, []);

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.medicoNaoEncontrado}
        descricao={m.naoEncontradoDescricao}
        voltarPara="/medicos"
        rotuloVoltar={m.voltarLista}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!base) {
    return (
      <div aria-busy="true">
        <SkeletonLinhas />
      </div>
    );
  }

  const recarregarDados = async () => {
    setBase(await obterMedico(id));
    setChave((k) => k + 1);
  };
  const nome = nomeExibicaoMedico(base);

  return (
    <>
      <CabecalhoPagina
        titulo={m.editar}
        descricao={nome}
        breadcrumbNomes={{ [`/medicos/${id}`]: nome }}
      />
      <FormMedico
        key={chave}
        medico={base}
        aoPronto={aoPronto}
        topo={
          <>
            {!base.ativo && (
              <p className="flex items-center gap-2 rounded-lg border border-border bg-bg px-4 py-3 text-[14px]">
                <Info size={17} aria-hidden className="shrink-0 text-text-muted" />
                {m.avisoInativo}
              </p>
            )}
            {data !== null && data.versao !== base.versao && (
              <div
                role="status"
                className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-card px-4 py-3 text-[14px]"
              >
                <AlertTriangle size={17} aria-hidden className="shrink-0 text-warning" />
                <span className="flex-1">{m.alteradoOutraAba}</span>
                <Button
                  tamanho="sm"
                  variante="contorno"
                  iconeEsquerda={<RotateCw size={14} />}
                  onClick={recarregarDados}
                >
                  {m.recarregarDados}
                </Button>
              </div>
            )}
          </>
        }
        aoEnviar={async (dados) => {
          const nova = dados.disponibilidade as Disponibilidade;
          // P7, passos 2–3: avisa antes de gravar.
          if (!mesmaDisponibilidade(nova, base.disponibilidade)) {
            const afetadas = await consultasAfetadas(id, nova);
            if (afetadas.length > 0) {
              const seguir = await confirmar({
                titulo: m.afetadasTitulo,
                mensagem: m.afetadasMensagem(afetadas.length),
                rotuloConfirmar: m.salvarMesmoAssim,
                rotuloCancelar: m.revisar,
              });
              if (!seguir) return false;
            }
          }
          let resultado: Awaited<ReturnType<typeof atualizarMedico>>;
          try {
            resultado = await atualizarMedico(id, dados, base.versao);
          } catch (e) {
            if (!(e instanceof ErroConcorrencia)) throw e;
            const recarregarAgora = await confirmar({
              titulo: m.concorrenciaTitulo,
              mensagem: t.erros.concorrencia,
              rotuloConfirmar: m.recarregarDados,
              rotuloCancelar: m.continuarEditando,
            });
            const atual = await obterMedico(id);
            setBase(atual);
            if (recarregarAgora) resetRef.current?.(valoresDoMedico(atual));
            return false;
          }
          const n = resultado.consultasForaDoHorario;
          if (n > 0) {
            toast.aviso(m.salvasComAfetadas(n), {
              acao: {
                rotulo: m.verAfetadas,
                aoClicar: () =>
                  navigate(`/consultas?medicoId=${id}&periodo=futuras&status=agendada`),
              },
            });
          } else {
            toast.sucesso(m.alteracoesSalvas);
          }
          navigate(`/medicos/${id}`);
        }}
        aoCancelar={() => navigate(`/medicos/${id}`)}
      />
    </>
  );
}
