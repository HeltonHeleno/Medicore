import { AlertTriangle, Info, RotateCw } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FormPaciente } from '../../components/pacientes/FormPaciente';
import {
  valoresDoPaciente,
  type ValoresPaciente,
} from '../../components/pacientes/valoresPaciente';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/EmptyState';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { NaoEncontrado } from '../../components/ui/NaoEncontrado';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { useConfirmar } from '../../hooks/useConfirmar';
import { usePaciente } from '../../hooks/useDados';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { ErroConcorrencia, ErroNaoEncontrado } from '../../services/erros';
import { atualizarPaciente, nomeExibicaoPaciente, obterPaciente } from '../../services/pacientes';
import type { Paciente } from '../../types';
import { mascararCpf } from '../../utils/mascaras';

const p = t.pacientes;

/** /pacientes/:id/editar — P2, com controle de versão (R-G1) e aviso de outra aba (M6). */
export default function EditarPaciente() {
  const { id = '' } = useParams();
  const { data, erro, recarregar } = usePaciente(id);
  // A versão que o formulário está editando (não muda sozinha quando outra aba grava).
  const [base, setBase] = useState<Paciente | null>(null);
  const [chave, setChave] = useState(0);
  if (data && !base) setBase(data);

  const navigate = useNavigate();
  const toast = useToast();
  const confirmar = useConfirmar();
  const resetRef = useRef<((v: ValoresPaciente) => void) | null>(null);
  const aoPronto = useCallback((api: { reset: (v: ValoresPaciente) => void }) => {
    resetRef.current = api.reset;
  }, []);

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.pacienteNaoEncontrado}
        descricao={p.naoEncontradoDescricao}
        voltarPara="/pacientes"
        rotuloVoltar={p.voltarLista}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!base) {
    return (
      <div aria-busy="true" className="space-y-4">
        <SkeletonLinhas />
      </div>
    );
  }

  const recarregarDados = async () => {
    const atual = await obterPaciente(id);
    setBase(atual);
    setChave((k) => k + 1); // remonta o formulário com os dados novos
  };

  const mudouEmOutraAba = data !== null && data.versao !== base.versao;
  const nome = nomeExibicaoPaciente(base);

  return (
    <>
      <CabecalhoPagina
        titulo={p.editar}
        descricao={nome}
        breadcrumbNomes={{ [`/pacientes/${id}`]: nome }}
      />
      <FormPaciente
        key={chave}
        paciente={base}
        aoPronto={aoPronto}
        topo={
          <>
            {!base.ativo && (
              <p className="flex items-center gap-2 rounded-lg border border-border bg-bg px-4 py-3 text-[14px]">
                <Info size={17} aria-hidden className="shrink-0 text-text-muted" />
                {p.avisoInativo}
              </p>
            )}
            {mudouEmOutraAba && (
              <div
                role="status"
                className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-card px-4 py-3 text-[14px]"
              >
                <AlertTriangle size={17} aria-hidden className="shrink-0 text-warning" />
                <span className="flex-1">{p.alteradoOutraAba}</span>
                <Button
                  tamanho="sm"
                  variante="contorno"
                  iconeEsquerda={<RotateCw size={14} />}
                  onClick={recarregarDados}
                >
                  {p.recarregarDados}
                </Button>
              </div>
            )}
          </>
        }
        aoEnviar={async (dados) => {
          // P2, passo 3: trocar o CPF pede confirmação.
          if (dados.cpf !== base.cpf) {
            const ok = await confirmar({
              titulo: p.alterarCpfTitulo,
              mensagem: p.alterarCpfMensagem(mascararCpf(base.cpf), mascararCpf(dados.cpf)),
              rotuloConfirmar: p.alterarCpf,
            });
            if (!ok) return false;
          }
          try {
            await atualizarPaciente(id, dados, base.versao);
          } catch (e) {
            if (!(e instanceof ErroConcorrencia)) throw e;
            // E-05: recarregar (perde as alterações) ou continuar editando.
            const recarregarAgora = await confirmar({
              titulo: p.concorrenciaTitulo,
              mensagem: t.erros.concorrencia,
              rotuloConfirmar: p.recarregarDados,
              rotuloCancelar: p.continuarEditando,
            });
            // Nos dois casos passa a valer a versão atual: recarregar descarta o que foi
            // digitado; continuar mantém, e o próximo "Salvar" grava por cima.
            const atual = await obterPaciente(id);
            setBase(atual);
            if (recarregarAgora) resetRef.current?.(valoresDoPaciente(atual));
            return false;
          }
          toast.sucesso(p.alteracoesSalvas);
          navigate(`/pacientes/${id}`);
        }}
        aoCancelar={() => navigate(`/pacientes/${id}`)}
      />
    </>
  );
}
