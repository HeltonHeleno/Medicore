import { AlertTriangle, CalendarClock, Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { z } from 'zod';
import { ehExcecao } from '../../components/leitos/acoes-leito';
import {
  DialogoSolicitacaoEletiva,
  type InicialEletiva,
} from '../../components/leitos/DialogoSolicitacaoEletiva';
import { SeletorLeito } from '../../components/leitos/SeletorLeito';
import {
  ComboboxPaciente,
  ResumoPaciente,
  type OpcaoPaciente,
} from '../../components/pacientes/ComboboxPaciente';
import { opcaoDoPaciente } from '../../components/pacientes/opcao-paciente';
import { Button } from '../../components/ui/Button';
import { BarraAcoesFormulario } from '../../components/ui/form/BarraAcoesFormulario';
import { Campo } from '../../components/ui/form/Campo';
import { Input } from '../../components/ui/form/Input';
import { RadioGroup } from '../../components/ui/form/RadioGroup';
import { ResumoErros } from '../../components/ui/form/ResumoErros';
import { SecaoFormulario } from '../../components/ui/form/SecaoFormulario';
import { Select } from '../../components/ui/form/Select';
import { Textarea } from '../../components/ui/form/Textarea';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { SETORES_INTERNACAO, nomeSetor } from '../../config/setores';
import { useColecao } from '../../hooks/useColecao';
import { useSituacaoHospitalar } from '../../hooks/useDadosOperacoes';
import { useFormularioEntidade } from '../../hooks/useFormularioEntidade';
import { useToast } from '../../hooks/useToast';
import { tl } from '../../i18n/pt-BR/leitos';
import {
  esquemaInternacao,
  PRECAUCOES,
  type DadosInternacao,
  type EntradaInternacao,
} from '../../schemas/internacao';
import { COLECOES } from '../../services/colecoes-operacoes';
import { obterAtendimento } from '../../services/emergencia';
import { ErroConflito } from '../../services/erros';
import {
  internar,
  leitosCompativeis,
  medicosResponsaveis,
  obterInternacao,
  obterSolicitacao,
} from '../../services/leitos';
import { nomeExibicaoMedico } from '../../services/medicos';
import { consultasFuturasDoPaciente, obterPaciente } from '../../services/pacientes';
import type { Precaucao, SetorId, SetorInternacaoId, SolicitacaoDetalhada } from '../../types';
import {
  dataDoInstante,
  deCampoDataHora,
  hojeNoFuso,
  paraCampoDataHora,
  somarDias,
} from '../../utils/datas';
import { agora } from '../../utils/relogio';

const i = tl.internar;
const c = i.campos;
const ROTULOS: Record<string, string> = {
  pacienteId: c.paciente,
  origem: c.origem,
  hospitalOrigem: c.hospitalOrigem,
  precaucao: c.precaucao,
  leitoId: tl.seletor.rotulo,
  justificativa: tl.seletor.justificativa,
  medicoResponsavelId: c.medico,
  motivo: c.motivo,
  inicio: c.inicio,
  previsaoAlta: c.previsaoAlta,
};

interface Inicial {
  valores: EntradaInternacao;
  paciente: OpcaoPaciente | null;
  solicitacao?: SolicitacaoDetalhada;
  copiado?: boolean;
}

const vazio = (): EntradaInternacao => ({
  pacienteId: '',
  origem: 'eletiva',
  hospitalOrigem: '',
  precaucao: 'padrao',
  setorDesejado: undefined,
  leitoId: '',
  medicoResponsavelId: '',
  motivo: '',
  inicio: agora().toISOString(),
  previsaoAlta: '',
  justificativa: '',
});

/** Monta os valores iniciais a partir de `?pacienteId=`, `?leitoId=`, `?solicitacaoId=` ou `?deInternacao=`. */
async function carregarInicial(params: URLSearchParams): Promise<Inicial> {
  const valores = vazio();
  const solicitacaoId = params.get('solicitacaoId');
  if (solicitacaoId) {
    try {
      const s = await obterSolicitacao(solicitacaoId);
      const medicoId = s.atendimentoId
        ? ((await obterAtendimento(s.atendimentoId).catch(() => null))?.medicoId ?? '')
        : '';
      return {
        solicitacao: s,
        paciente: await opcaoDoPaciente(s.pacienteId),
        valores: {
          ...valores,
          pacienteId: s.pacienteId,
          origem: s.atendimentoId ? 'emergencia' : 'eletiva',
          solicitacaoId: s.id,
          precaucao: s.precaucao,
          setorDesejado: s.setorDesejado,
          leitoId: s.leitoReservadoId ?? '',
          medicoResponsavelId: medicoId,
          motivo: s.motivo,
        },
      };
    } catch {
      // Pedido que não está mais em aberto: segue como internação comum.
    }
  }
  const deInternacao = params.get('deInternacao');
  if (deInternacao) {
    try {
      const anterior = await obterInternacao(deInternacao);
      return {
        copiado: true,
        paciente: await opcaoDoPaciente(anterior.pacienteId),
        valores: {
          ...valores,
          pacienteId: anterior.pacienteId,
          precaucao: anterior.precaucao,
          medicoResponsavelId: anterior.medicoResponsavelId,
          motivo: anterior.motivo,
        },
      };
    } catch {
      /* ignora o parâmetro */
    }
  }
  const pacienteId = params.get('pacienteId') ?? '';
  const paciente = pacienteId ? await opcaoDoPaciente(pacienteId) : null;
  return {
    paciente,
    valores: { ...valores, pacienteId: paciente?.id ?? '', leitoId: params.get('leitoId') ?? '' },
  };
}

/** /leitos/internar — L1 (eletiva ou transferência externa) e L6 (pelo pedido de leito). */
export default function Internar() {
  const [params] = useSearchParams();
  const chave = params.toString();
  const [inicial, setInicial] = useState<{ chave: string; dados: Inicial } | null>(null);

  useEffect(() => {
    let ativo = true;
    void carregarInicial(new URLSearchParams(chave)).then(
      (dados) => ativo && setInicial({ chave, dados }),
    );
    return () => {
      ativo = false;
    };
  }, [chave]);

  return (
    <>
      <CabecalhoPagina titulo={tl.internarPaciente} descricao={i.descricao} />
      {inicial?.chave === chave ? (
        <FormInternar key={chave} inicial={inicial.dados} />
      ) : (
        <div aria-busy="true">
          <SkeletonLinhas linhas={8} />
        </div>
      )}
    </>
  );
}

function FormInternar({ inicial }: { inicial: Inicial }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [paciente, setPaciente] = useState<OpcaoPaciente | null>(inicial.paciente);
  const [usarExcecao, setUsarExcecao] = useState(false);
  const [avisoLeito, setAvisoLeito] = useState<string | undefined>();
  const [pedirLeito, setPedirLeito] = useState(false);
  const sol = inicial.solicitacao;

  const { form, enviar, enviando, resumo, tentativa } = useFormularioEntidade({
    esquema: esquemaInternacao as unknown as z.ZodType<DadosInternacao, EntradaInternacao>,
    valoresIniciais: inicial.valores,
    rotulos: ROTULOS,
    aoEnviar: async (dados) => {
      try {
        const internacao = await internar(dados);
        const leito =
          avaliados.data?.find((a) => a.leito.id === internacao.leitoId)?.leito.codigo ?? '';
        toast.sucesso(tl.avisos.internado(paciente?.nomeExibicao ?? '', leito));
        navigate(`/leitos/internacoes/${internacao.id}`);
      } catch (e) {
        // E-11: o leito foi ocupado por outra aba. Limpa a escolha; os leitos se atualizam sozinhos.
        if (e instanceof ErroConflito && e.codigo === 'leito_indisponivel') {
          form.setValue('leitoId', '');
          throw new ErroConflito(e.codigo, i.leitoOcupado, { campo: 'leitoId' });
        }
        throw e;
      }
    },
  });
  const { register, control, setValue, formState } = form;
  const { errors } = formState;
  const [pacienteId, origem, precaucao, setorDesejado, leitoId] = useWatch({
    control,
    name: ['pacienteId', 'origem', 'precaucao', 'setorDesejado', 'leitoId'],
  });

  const dadosPaciente = useColecao(
    () => (pacienteId ? obterPaciente(pacienteId).catch(() => null) : Promise.resolve(null)),
    [pacienteId],
  );
  const situacao = useSituacaoHospitalar(pacienteId);
  const consultas = useColecao(
    () =>
      pacienteId
        ? consultasFuturasDoPaciente(pacienteId).then((lista) =>
            lista.filter((x) => dataDoInstante(x.inicio) <= somarDias(hojeNoFuso(), 7)),
          )
        : Promise.resolve([]),
    [pacienteId],
  );
  const avaliados = useColecao(
    () =>
      pacienteId
        ? leitosCompativeis({
            pacienteId,
            precaucao: precaucao as Precaucao,
            setorDesejado: (setorDesejado || undefined) as SetorId | undefined,
            solicitacaoId: sol?.id,
          })
        : Promise.resolve(null),
    [pacienteId, precaucao, setorDesejado, sol?.id],
    COLECOES.leitos,
  );
  const leitoEscolhido = avaliados.data?.find((a) => a.leito.id === leitoId);
  const setorDoLeito: string | undefined =
    leitoEscolhido?.leito.setorId ?? ((setorDesejado as string | undefined) || undefined);
  const medicos = useColecao(() => medicosResponsaveis(setorDoLeito || undefined), [setorDoLeito]);

  // L1 passo 4: leito da URL (ou escolhido antes) que deixou de servir é desmarcado, com aviso.
  const conferido = useRef(false);
  useEffect(() => {
    if (!avaliados.data || !leitoId) return;
    const a = avaliados.data.find((x) => x.leito.id === leitoId);
    const serve = a && (a.compativel || (usarExcecao && ehExcecao(a)));
    if (serve) {
      conferido.current = true;
      return;
    }
    if (a && ehExcecao(a) && !conferido.current) {
      // Leito que só não combina por perfil ou isolamento: oferece a exceção em vez de limpar.
      setUsarExcecao(true);
      conferido.current = true;
      return;
    }
    setValue('leitoId', '', { shouldDirty: true });
    setAvisoLeito(
      conferido.current ? i.leitoOcupado : i.leitoDaUrlIncompativel(a?.leito.codigo ?? leitoId),
    );
    conferido.current = true;
  }, [avaliados.data, leitoId, usarExcecao, setValue]);

  // R-X1: internado, ou em atendimento fora deste pedido.
  const s = situacao.data;
  const bloqueio = s?.internacao
    ? {
        texto: i.jaInternado(s.internacao.leitoCodigo),
        para: `/leitos/internacoes/${s.internacao.id}`,
      }
    : s?.atendimento && !(sol?.atendimentoId && sol.atendimentoId === s.atendimento.id)
      ? { texto: i.emAtendimento(s.atendimento.numero), para: `/emergencia/${s.atendimento.id}` }
      : null;

  const inicialEletiva: InicialEletiva = {
    paciente,
    precaucao: precaucao as Precaucao,
    setorDesejado: (setorDesejado || undefined) as SetorInternacaoId | undefined,
    motivo: form.getValues('motivo'),
  };
  const erroDe = (campo: keyof EntradaInternacao) => errors[campo]?.message as string | undefined;

  return (
    <form onSubmit={enviar} noValidate className="space-y-5 pb-2">
      <ResumoErros erros={resumo} tentativa={tentativa} />
      {inicial.copiado && (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-bg px-4 py-3 text-[14px]">
          <Info size={17} aria-hidden className="shrink-0 text-text-muted" />
          {i.copiadoDe}
        </p>
      )}

      <SecaoFormulario titulo={i.secoes.paciente} colunas={1}>
        {sol ? (
          <div>
            <p className="font-semibold">{sol.pacienteNome}</p>
            <p className="text-[13px] text-text-muted">
              {i.pelaSolicitacao(
                sol.atendimentoNumero
                  ? tl.solicitacoes.emergencia(sol.atendimentoNumero)
                  : tl.origens.eletiva,
              )}
            </p>
          </div>
        ) : (
          <Campo rotulo={c.paciente} nome="pacienteId" obrigatorio erro={erroDe('pacienteId')}>
            <Controller
              control={control}
              name="pacienteId"
              render={({ field }) => (
                <ComboboxPaciente
                  ref={field.ref}
                  name={field.name}
                  valor={paciente}
                  mostrarSituacao
                  aoMudar={(p) => {
                    setPaciente(p);
                    setAvisoLeito(undefined);
                    field.onChange(p?.id ?? '');
                  }}
                  aoSair={field.onBlur}
                />
              )}
            />
          </Campo>
        )}
        {bloqueio && (
          <p
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-[14px] text-danger"
          >
            <AlertTriangle size={17} aria-hidden className="shrink-0" />
            <span className="flex-1">{bloqueio.texto}</span>
            <Link
              to={bloqueio.para}
              className="rounded font-semibold underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {i.abrir}
            </Link>
          </p>
        )}
        {dadosPaciente.data && <ResumoPaciente paciente={dadosPaciente.data} avisarNaoInformadas />}
        {consultas.data && consultas.data.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 text-[13.5px]">
            <CalendarClock size={16} aria-hidden className="shrink-0 text-text-muted" />
            {i.consultasProximas(consultas.data.length)}
            <Link
              to={`/consultas?pacienteId=${pacienteId}`}
              className="rounded font-medium text-on-primary-light underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {tl.verNaAgenda}
            </Link>
          </p>
        )}
      </SecaoFormulario>

      <SecaoFormulario titulo={i.secoes.origem} colunas={2}>
        {sol ? (
          <p className="text-[14px]">
            <span className="text-text-muted">{c.origem}: </span>
            {tl.origens[sol.atendimentoId ? 'emergencia' : 'eletiva']}
          </p>
        ) : (
          <Controller
            control={control}
            name="origem"
            render={({ field }) => (
              <RadioGroup
                legenda={c.origem}
                nome="origem"
                obrigatorio
                horizontal
                opcoes={(['eletiva', 'transferencia_externa'] as const).map((x) => ({
                  valor: x,
                  rotulo: tl.origens[x],
                }))}
                valor={field.value}
                aoMudar={field.onChange}
                erro={erroDe('origem')}
              />
            )}
          />
        )}
        {origem === 'transferencia_externa' && (
          <Campo
            rotulo={c.hospitalOrigem}
            nome="hospitalOrigem"
            obrigatorio
            erro={erroDe('hospitalOrigem')}
          >
            <Input {...register('hospitalOrigem')} maxLength={120} />
          </Campo>
        )}
        <Campo rotulo={c.precaucao} nome="precaucao" obrigatorio erro={erroDe('precaucao')}>
          <Select
            vazia={false}
            {...register('precaucao')}
            opcoes={PRECAUCOES.map((x) => ({ valor: x, rotulo: tl.precaucoes[x] }))}
          />
        </Campo>
        <Campo rotulo={c.setorDesejado} nome="setorDesejado" erro={erroDe('setorDesejado')}>
          <Select
            {...register('setorDesejado', { setValueAs: (v) => v || undefined })}
            vazia={tl.qualquerSetor}
            opcoes={SETORES_INTERNACAO.map((x) => ({ valor: x, rotulo: nomeSetor(x) }))}
          />
        </Campo>
      </SecaoFormulario>

      <SecaoFormulario titulo={i.secoes.leito} colunas={1}>
        {avisoLeito && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-lg border border-warning/40 px-4 py-2.5 text-[13.5px] text-warning"
          >
            <AlertTriangle size={16} aria-hidden className="shrink-0" />
            {avisoLeito}
          </p>
        )}
        {!pacienteId ? (
          <p className="rounded-lg bg-bg px-4 py-3 text-[14px] text-text-muted">
            {i.escolhaPaciente}
          </p>
        ) : !avaliados.data ? (
          <SkeletonLinhas linhas={2} />
        ) : (
          <Controller
            control={control}
            name="leitoId"
            render={({ field }) => (
              <SeletorLeito
                ref={(el) =>
                  field.ref({
                    focus: () =>
                      (
                        el?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]') ?? el
                      )?.focus(),
                  })
                }
                avaliados={avaliados.data!}
                valor={field.value}
                aoMudar={(id) => {
                  setAvisoLeito(undefined);
                  form.clearErrors('leitoId');
                  field.onChange(id);
                }}
                permitirExcecao
                usarExcecao={usarExcecao}
                aoMudarUsarExcecao={setUsarExcecao}
                justificativa={(form.watch('justificativa') as string | undefined) ?? ''}
                aoMudarJustificativa={(texto) =>
                  setValue('justificativa', texto, { shouldDirty: true })
                }
                erroJustificativa={erroDe('justificativa')}
                erro={erroDe('leitoId')}
                semCompativel={
                  sol ? undefined : { rotulo: i.pedirLeito, aoClicar: () => setPedirLeito(true) }
                }
              />
            )}
          />
        )}
      </SecaoFormulario>

      <SecaoFormulario titulo={i.secoes.responsavel} colunas={2}>
        <Campo
          rotulo={c.medico}
          nome="medicoResponsavelId"
          obrigatorio
          erro={erroDe('medicoResponsavelId')}
          className="sm:col-span-2"
        >
          <Controller
            control={control}
            name="medicoResponsavelId"
            render={({ field }) => (
              <Select
                ref={field.ref}
                name={field.name}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                opcoes={(medicos.data ?? []).map((m) => ({
                  valor: m.id,
                  rotulo: nomeExibicaoMedico(m),
                }))}
              />
            )}
          />
        </Campo>
        <Campo
          rotulo={c.motivo}
          nome="motivo"
          obrigatorio
          dica={c.motivoDica}
          erro={erroDe('motivo')}
          className="sm:col-span-2"
        >
          <Textarea {...register('motivo')} maxLength={300} rows={2} />
        </Campo>
        <Campo
          rotulo={c.inicio}
          nome="inicio"
          obrigatorio
          dica={c.inicioDica}
          erro={erroDe('inicio')}
        >
          <Controller
            control={control}
            name="inicio"
            render={({ field }) => (
              <Input
                ref={field.ref}
                type="datetime-local"
                value={field.value ? paraCampoDataHora(field.value) : ''}
                onChange={(e) => field.onChange(deCampoDataHora(e.target.value))}
                onBlur={field.onBlur}
              />
            )}
          />
        </Campo>
        <Campo rotulo={c.previsaoAlta} nome="previsaoAlta" erro={erroDe('previsaoAlta')}>
          <Input type="date" min={hojeNoFuso()} {...register('previsaoAlta')} />
        </Campo>
      </SecaoFormulario>

      <BarraAcoesFormulario>
        <Button variante="contorno" onClick={() => navigate(-1)}>
          {tl.cancelar}
        </Button>
        <Button type="submit" disabled={enviando || Boolean(bloqueio)}>
          {enviando ? tl.salvando : i.internar}
        </Button>
      </BarraAcoesFormulario>

      <DialogoSolicitacaoEletiva
        aberto={pedirLeito}
        inicial={inicialEletiva}
        aoFechar={() => setPedirLeito(false)}
        aoPedir={(nome) => {
          setPedirLeito(false);
          toast.sucesso(tl.solicitacoes.pedido(nome));
          navigate('/leitos');
        }}
      />
    </form>
  );
}
