import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FormConsulta } from '../../components/consultas/FormConsulta';
import { ErrorState } from '../../components/ui/EmptyState';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { NaoEncontrado } from '../../components/ui/NaoEncontrado';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { useConsulta } from '../../hooks/useDados';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { reagendarConsulta } from '../../services/consultas';
import { ErroConcorrencia, ErroNaoEncontrado } from '../../services/erros';
import type { ConsultaDetalhada } from '../../types';
import { dataDoInstante, formatarDataCurta, horaDoInstante } from '../../utils/datas';

const a = t.agenda;

/** /consultas/:id/editar — P10 (só para consultas agendadas, R-S1). */
export default function EditarConsulta() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, erro, recarregar } = useConsulta(id);
  // Versão carregada ao abrir (gravações de outra aba não trocam o formulário).
  const [base, setBase] = useState<ConsultaDetalhada | null>(null);
  if (data && !base) setBase(data);

  const naoAgendada = base !== null && base.status !== 'agendada';
  useEffect(() => {
    if (!naoAgendada) return;
    toast.aviso(a.naoPodeAlterar);
    navigate(`/consultas/${id}`, { replace: true });
  }, [naoAgendada, id, navigate, toast]);

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.consultaNaoEncontrada}
        descricao={a.naoEncontradaDescricao}
        voltarPara="/consultas"
        rotuloVoltar={a.voltarAgenda}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!base || naoAgendada) return <SkeletonLinhas />;

  return (
    <>
      <CabecalhoPagina
        titulo={a.editar}
        descricao={a.tituloDetalhe(base.pacienteNome)}
        breadcrumbNomes={{ [`/consultas/${id}`]: a.tituloDetalhe(base.pacienteNome) }}
      />
      <FormConsulta
        consulta={base}
        aoSalvar={async (dados) => {
          try {
            const c = await reagendarConsulta(id, dados, base.versao);
            toast.sucesso(
              a.reagendada(formatarDataCurta(dataDoInstante(c.inicio)), horaDoInstante(c.inicio)),
            );
            navigate(`/consultas/${id}`);
          } catch (e) {
            if (!(e instanceof ErroConcorrencia)) throw e;
            // R-G1: outra aba mexeu na consulta. Volta ao detalhe para ver a versão atual.
            toast.erro(t.erros.concorrencia);
            return false;
          }
        }}
        aoCancelar={() => navigate(`/consultas/${id}`)}
      />
    </>
  );
}
