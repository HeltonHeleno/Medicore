import { AlertTriangle, Info, OctagonAlert, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ItemDispensacao, type ValorItem } from '../../components/farmacia/ItemDispensacao';
import { validarDispensacao } from '../../components/farmacia/validar-dispensacao';
import { ComboboxPaciente, type OpcaoPaciente } from '../../components/pacientes/ComboboxPaciente';
import { opcaoDoPaciente } from '../../components/pacientes/opcao-paciente';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/feedback/Modal';
import { BarraAcoesFormulario } from '../../components/ui/form/BarraAcoesFormulario';
import { Campo } from '../../components/ui/form/Campo';
import { focarCampo, naOrdemDaTela } from '../../components/ui/form/foco';
import { ResumoErros, type ItemErro } from '../../components/ui/form/ResumoErros';
import { SecaoFormulario } from '../../components/ui/form/SecaoFormulario';
import { Select } from '../../components/ui/form/Select';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { MAX_ITENS_DISPENSACAO } from '../../config/limites';
import { useColecao } from '../../hooks/useColecao';
import { useListaMedicos } from '../../hooks/useDados';
import { useDestinoDispensacao, useEstoque } from '../../hooks/useDadosOperacoes';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { tf } from '../../i18n/pt-BR/farmacia';
import { COLECOES } from '../../services/colecoes-operacoes';
import { ErroConflito, ErroValidacao } from '../../services/erros';
import {
  dispensar,
  nomeMedicamento,
  quantidadeComUnidade,
  verificarAlergia,
  type DestinoDetalhado,
} from '../../services/farmacia';
import { obterPaciente } from '../../services/pacientes';
import { gerarId } from '../../utils/id';

const d = tf.dispensarTela;

const itemVazio = (medicamentoId = ''): ValorItem => ({
  chave: gerarId(),
  medicamentoId,
  quantidade: null,
  cienteAlergia: false,
  justificativaAlergia: '',
  conferiReceita: false,
  confirmoQuantidade: false,
});

const textoDestino = (x: DestinoDetalhado) =>
  x.tipo === 'internacao' ? d.destinoInternacao(x.referencia) : d.destinoEmergencia(x.referencia);

/** /farmacia/dispensar — F3. Aceita `?pacienteId=` e `?medicamentoId=`. */
export default function Dispensar() {
  const [params] = useSearchParams();
  const pacienteUrl = params.get('pacienteId') ?? '';
  const [inicial, setInicial] = useState<{ id: string; paciente: OpcaoPaciente | null } | null>(
    null,
  );
  useEffect(() => {
    let ativo = true;
    void (pacienteUrl ? opcaoDoPaciente(pacienteUrl) : Promise.resolve(null)).then(
      (paciente) => ativo && setInicial({ id: pacienteUrl, paciente }),
    );
    return () => {
      ativo = false;
    };
  }, [pacienteUrl]);

  return (
    <>
      <CabecalhoPagina titulo={tf.dispensar} descricao={d.descricao} />
      {inicial?.id === pacienteUrl ? (
        <FormDispensar
          key={pacienteUrl}
          pacienteInicial={inicial.paciente}
          medicamentoInicial={params.get('medicamentoId') ?? ''}
        />
      ) : (
        <div aria-busy="true">
          <SkeletonLinhas linhas={8} />
        </div>
      )}
    </>
  );
}

function FormDispensar({
  pacienteInicial,
  medicamentoInicial,
}: {
  pacienteInicial: OpcaoPaciente | null;
  medicamentoInicial: string;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const [paciente, setPaciente] = useState<OpcaoPaciente | null>(pacienteInicial);
  const pacienteId = paciente?.id ?? '';
  const [medicoId, setMedicoId] = useState('');
  const medicoTocado = useRef(false);
  const [itens, setItens] = useState<ValorItem[]>(() => [itemVazio(medicamentoInicial)]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroTopo, setErroTopo] = useState<string | undefined>();
  const [tentativa, setTentativa] = useState(0);
  // 21.2.3: depois de cada tentativa com erros, foco no 1º campo inválido na ordem da tela.
  useEffect(() => {
    if (!tentativa) return;
    const [primeiro] = naOrdemDaTela(Object.keys(erros).map((campo) => ({ campo })));
    if (primeiro) focarCampo(primeiro.campo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentativa]);
  const [revisando, setRevisando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const estoque = useEstoque({ status: 'ativos', porPagina: 500 });
  const medicos = useListaMedicos({ status: 'ativos', porPagina: 200 });
  const destino = useDestinoDispensacao(pacienteId);
  const dadosPaciente = useColecao(
    () => (pacienteId ? obterPaciente(pacienteId).catch(() => null) : Promise.resolve(null)),
    [pacienteId],
  );
  const ids = itens.map((i) => i.medicamentoId);
  const alergias = useColecao(
    () =>
      pacienteId
        ? Promise.all(
            ids.map((id) => (id ? verificarAlergia(pacienteId, id).catch(() => null) : null)),
          )
        : Promise.resolve(ids.map(() => null)),
    [pacienteId, ids.join('|')],
    COLECOES.farmacia,
  );

  // F3 passo 2: médico do destino (responsável da internação ou médico do atendimento).
  const sugerido = destino.data?.medicoId;
  useEffect(() => {
    if (!medicoTocado.current) setMedicoId(sugerido ?? '');
  }, [sugerido]);

  const listaEstoque = useMemo(() => estoque.data?.itens ?? [], [estoque.data]);
  const alergiasDe = alergias.data ?? [];

  function mudarItem(i: number, mudancas: Partial<ValorItem>) {
    setItens((atual) => atual.map((x, j) => (j === i ? { ...x, ...mudancas } : x)));
  }

  function revisar() {
    setErroTopo(undefined);
    const r = validarDispensacao({
      pacienteId,
      temDestino: !!destino.data,
      medicoId,
      itens,
      estoque: listaEstoque,
      alergias: alergiasDe,
    });
    setErros(r.erros);
    setTentativa((n) => n + 1);
    if (Object.keys(r.erros).length === 0) setRevisando(true);
  }

  async function confirmar() {
    const r = validarDispensacao({
      pacienteId,
      temDestino: !!destino.data,
      medicoId,
      itens,
      estoque: listaEstoque,
      alergias: alergiasDe,
    });
    setEnviando(true);
    try {
      const x = await dispensar(r.entrada);
      toast.sucesso(tf.avisos.dispensacaoRegistrada(x.itens.length));
      navigate(`/farmacia/dispensacoes/${x.id}`);
    } catch (e) {
      setEnviando(false);
      setRevisando(false);
      // E-12 no item; E-15 no topo; E-03 (inativo) e validação nos campos.
      if (e instanceof ErroConflito && e.codigo === 'destino_inativo') setErroTopo(e.message);
      else if (e instanceof ErroConflito && e.campo) setErros({ [e.campo]: e.message });
      else if (e instanceof ErroValidacao) setErros(e.campos);
      else toast.erro(e instanceof Error ? e.message : t.erros.inesperadoTitulo);
      setTentativa((n) => n + 1);
    }
  }

  const rotulos: Record<string, string> = {
    pacienteId: d.paciente,
    medicoSolicitanteId: d.medico,
  };
  const resumo: ItemErro[] = naOrdemDaTela(
    Object.entries(erros).map(([campo, mensagem]) => {
      const m = /^itens\.(\d+)\./.exec(campo);
      return { campo, mensagem, rotulo: m ? d.item(Number(m[1]) + 1) : rotulos[campo] };
    }),
  );
  const alergiasTexto = dadosPaciente.data?.alergias?.trim();
  const medicoNome = medicos.data?.itens.find((m) => m.id === medicoId)?.nomeExibicao ?? '';

  if (!estoque.data || !medicos.data) {
    return (
      <div aria-busy="true">
        <SkeletonLinhas linhas={8} />
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        revisar();
      }}
      className="space-y-5 pb-2"
    >
      {/* R-F15 / M27: alergias fixas no topo durante todo o formulário. */}
      {pacienteId && dadosPaciente.data && (
        <div className="sticky top-0 z-10 -mx-1 px-1 pt-1">
          {alergiasTexto ? (
            <p className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger-bg px-4 py-2.5 text-[14px] font-semibold text-danger shadow-[var(--shadow-card)]">
              <OctagonAlert size={17} aria-hidden className="mt-0.5 shrink-0" />
              {d.alergias(alergiasTexto)}
            </p>
          ) : (
            <p className="flex items-start gap-2 rounded-lg border border-warning/50 bg-card px-4 py-2.5 text-[14px] font-semibold text-warning shadow-[var(--shadow-card)]">
              <AlertTriangle size={17} aria-hidden className="mt-0.5 shrink-0" />
              {tf.alergiasNaoInformadas}
            </p>
          )}
        </div>
      )}
      <ResumoErros erros={resumo} tentativa={tentativa} />
      {erroTopo && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-[14px] font-medium text-danger"
        >
          <AlertTriangle size={17} aria-hidden className="shrink-0" />
          {erroTopo}
        </p>
      )}

      <SecaoFormulario titulo={d.paciente} colunas={2}>
        <Campo
          rotulo={d.paciente}
          nome="pacienteId"
          obrigatorio
          erro={erros.pacienteId}
          className="sm:col-span-2"
        >
          <ComboboxPaciente
            name="pacienteId"
            valor={paciente}
            filtro="internados_ou_em_atendimento"
            aoMudar={(p) => {
              setPaciente(p);
              setErroTopo(undefined);
              setErros((atual) => {
                const resto = { ...atual };
                delete resto.pacienteId;
                return resto;
              });
              setItens((atual) =>
                atual.map((x) => ({ ...x, cienteAlergia: false, justificativaAlergia: '' })),
              );
            }}
          />
        </Campo>
        <p className="text-[14px] sm:col-span-2">
          <span className="font-medium">{d.destino}:</span>{' '}
          {!pacienteId
            ? d.escolhaPaciente
            : destino.data
              ? textoDestino(destino.data)
              : destino.carregando
                ? '…'
                : d.semDestino}
        </p>
        <Campo
          rotulo={d.medico}
          nome="medicoSolicitanteId"
          obrigatorio
          erro={erros.medicoSolicitanteId}
        >
          <Select
            value={medicoId}
            onChange={(e) => {
              medicoTocado.current = true;
              setMedicoId(e.target.value);
            }}
            opcoes={medicos.data.itens.map((m) => ({ valor: m.id, rotulo: m.nomeExibicao }))}
          />
        </Campo>
      </SecaoFormulario>

      <SecaoFormulario titulo={d.itens} colunas={1}>
        <p className="flex items-start gap-2 text-[13px] text-text-muted">
          <Info size={15} aria-hidden className="mt-0.5 shrink-0" />
          {tf.avisoEscopo}
        </p>
        {itens.map((item, i) => (
          <ItemDispensacao
            key={item.chave}
            indice={i}
            valor={item}
            aoMudar={(mudancas) => mudarItem(i, mudancas)}
            aoRemover={
              itens.length > 1
                ? () => setItens((atual) => atual.filter((_, j) => j !== i))
                : undefined
            }
            estoque={listaEstoque}
            alergia={alergiasDe[i]}
            erros={erros}
          />
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variante="contorno"
            iconeEsquerda={<Plus size={17} />}
            disabled={itens.length >= MAX_ITENS_DISPENSACAO}
            onClick={() => setItens((atual) => [...atual, itemVazio()])}
          >
            {d.adicionar}
          </Button>
          <span className="text-[12.5px] text-text-muted">
            {d.limiteItens(MAX_ITENS_DISPENSACAO)}
          </span>
        </div>
      </SecaoFormulario>

      <BarraAcoesFormulario>
        <Button variante="contorno" onClick={() => navigate('/farmacia')}>
          {tf.cancelar}
        </Button>
        <Button type="submit">{d.revisar}</Button>
      </BarraAcoesFormulario>

      <Modal
        aberto={revisando}
        aoFechar={() => setRevisando(false)}
        titulo={d.resumoTitulo}
        descricao={
          paciente && destino.data
            ? d.resumoPara(paciente.nomeExibicao, textoDestino(destino.data))
            : undefined
        }
        tamanho="lg"
        rodape={
          <>
            <Button variante="contorno" onClick={() => setRevisando(false)}>
              {tf.voltar}
            </Button>
            <Button disabled={enviando} onClick={confirmar}>
              {enviando ? tf.salvando : d.confirmar}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-[14px]">
          <p>{d.resumoMedico(medicoNome)}</p>
          <ul className="space-y-2">
            {itens.map((item, i) => {
              const e = listaEstoque.find((x) => x.medicamento.id === item.medicamentoId);
              if (!e) return null;
              const m = e.medicamento;
              const a = alergiasDe[i];
              return (
                <li key={item.chave} className="rounded-lg border border-border px-3 py-2">
                  <p className="font-medium">
                    {nomeMedicamento(m)} · {quantidadeComUnidade(m, item.quantidade ?? 0)}
                  </p>
                  {(a || m.controlado || item.confirmoQuantidade) && (
                    <ul className="mt-1 text-[13px] text-text-muted">
                      {a && <li>{d.alertaAlergia(a.termo)}</li>}
                      {m.controlado && <li>{d.alertaControlado}</li>}
                      {item.confirmoQuantidade && <li>{d.alertaQuantidade}</li>}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="flex items-start gap-2 text-[13px] text-text-muted">
            <Info size={15} aria-hidden className="mt-0.5 shrink-0" />
            {tf.avisoEscopo}
          </p>
        </div>
      </Modal>
    </form>
  );
}
