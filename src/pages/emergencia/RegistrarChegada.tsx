import { AlertTriangle, Siren } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import {
  ComboboxPaciente,
  ResumoPaciente,
  type OpcaoPaciente,
} from '../../components/pacientes/ComboboxPaciente';
import { opcaoDoPaciente } from '../../components/pacientes/opcao-paciente';
import { Button } from '../../components/ui/Button';
import { BarraAcoesFormulario } from '../../components/ui/form/BarraAcoesFormulario';
import { Campo } from '../../components/ui/form/Campo';
import { Checkbox } from '../../components/ui/form/Checkbox';
import { Input } from '../../components/ui/form/Input';
import { RadioGroup } from '../../components/ui/form/RadioGroup';
import { ResumoErros } from '../../components/ui/form/ResumoErros';
import { SecaoFormulario } from '../../components/ui/form/SecaoFormulario';
import { Select } from '../../components/ui/form/Select';
import { Textarea } from '../../components/ui/form/Textarea';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { useColecao } from '../../hooks/useColecao';
import { useConfirmar } from '../../hooks/useConfirmar';
import { useSituacaoHospitalar } from '../../hooks/useDadosOperacoes';
import { useFormularioEntidade } from '../../hooks/useFormularioEntidade';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { te } from '../../i18n/pt-BR/emergencia';
import { esquemaChegada, MODOS_CHEGADA, type EntradaChegada } from '../../schemas/emergencia';
import { SEXOS } from '../../schemas/paciente';
import { registrarChegada } from '../../services/emergencia';
import { obterPaciente } from '../../services/pacientes';
import type { ModoChegada, Sexo } from '../../types';
import { deCampoDataHora, paraCampoDataHora } from '../../utils/datas';
import { agora } from '../../utils/relogio';

const c = te.chegadaTela;

/** Valores como estão na tela; os nomes seguem o esquema para os erros caírem no campo. */
interface ValoresChegada {
  identificacao: 'cadastrado' | 'provisorio';
  pacienteId: string;
  provisorio: { descricao: string; sexo: Sexo | ''; idadeAproximada: string };
  modoChegada: ModoChegada | '';
  queixa: string;
  chegadaEm: string;
  emergenciaImediata: boolean;
}

/** Tela → entrada do serviço: só uma das identificações vai adiante; hora no fuso do hospital. */
const paraEntrada = (v: ValoresChegada): EntradaChegada =>
  ({
    ...(v.identificacao === 'cadastrado'
      ? { pacienteId: v.pacienteId }
      : { provisorio: v.provisorio }),
    modoChegada: v.modoChegada,
    queixa: v.queixa,
    chegadaEm: v.chegadaEm ? deCampoDataHora(v.chegadaEm) : '',
    emergenciaImediata: v.emergenciaImediata,
  }) as EntradaChegada;

const esquemaTela = z.preprocess((v) => paraEntrada(v as ValoresChegada), esquemaChegada);

const ROTULOS: Record<string, string> = {
  pacienteId: c.paciente,
  'provisorio.descricao': c.descricaoProvisoria,
  'provisorio.sexo': c.sexo,
  'provisorio.idadeAproximada': c.idadeAproximada,
  modoChegada: c.modo,
  queixa: c.queixa,
  chegadaEm: c.hora,
};

/** /emergencia/chegada — E1. Com `?pacienteId=`, o paciente vem escolhido. */
export default function RegistrarChegada() {
  const [params] = useSearchParams();
  const pacienteId = params.get('pacienteId') ?? '';
  const [inicial, setInicial] = useState<{ id: string; paciente: OpcaoPaciente | null } | null>(
    null,
  );
  useEffect(() => {
    let ativo = true;
    void (pacienteId ? opcaoDoPaciente(pacienteId) : Promise.resolve(null)).then(
      (paciente) => ativo && setInicial({ id: pacienteId, paciente }),
    );
    return () => {
      ativo = false;
    };
  }, [pacienteId]);

  return (
    <>
      <CabecalhoPagina titulo={te.registrarChegada} descricao={c.descricao} />
      {inicial?.id === pacienteId ? (
        <FormChegada key={pacienteId} paciente={inicial.paciente} />
      ) : (
        <div aria-busy="true">
          <SkeletonLinhas linhas={6} />
        </div>
      )}
    </>
  );
}

function FormChegada({ paciente: pacienteInicial }: { paciente: OpcaoPaciente | null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const confirmar = useConfirmar();
  const idSugestoes = useId();
  const [paciente, setPaciente] = useState<OpcaoPaciente | null>(pacienteInicial);

  const { form, enviar, enviando, resumo, tentativa } = useFormularioEntidade({
    esquema: esquemaTela as unknown as z.ZodType<EntradaChegada, ValoresChegada>,
    valoresIniciais: {
      identificacao: 'cadastrado',
      pacienteId: pacienteInicial?.id ?? '',
      provisorio: { descricao: '', sexo: '', idadeAproximada: '' },
      modoChegada: 'meios_proprios',
      queixa: '',
      chegadaEm: paraCampoDataHora(agora()),
      emergenciaImediata: false,
    },
    rotulos: ROTULOS,
    aoEnviar: async (dados) => {
      // R-E2: emergência imediata pede confirmação antes de gravar.
      if (
        dados.emergenciaImediata &&
        !(await confirmar({
          titulo: c.confirmarTitulo,
          mensagem: te.confirmarEmergenciaImediata,
          rotuloConfirmar: c.confirmar,
          rotuloCancelar: te.voltar,
          perigo: true,
        }))
      )
        return false;
      const a = await registrarChegada(dados);
      toast.sucesso(te.avisos.chegadaRegistrada(a.numero));
      navigate(a.status === 'aguardando_triagem' ? `/emergencia/${a.id}/triagem` : '/emergencia');
    },
  });
  const { register, control, setValue, formState } = form;
  const { errors } = formState;
  const [identificacao, pacienteId] = useWatch({
    control,
    name: ['identificacao', 'pacienteId'],
  });
  const cadastrado = identificacao === 'cadastrado';
  const situacao = useSituacaoHospitalar(cadastrado ? pacienteId : '');
  const dadosPaciente = useColecao(
    () =>
      cadastrado && pacienteId
        ? obterPaciente(pacienteId).catch(() => null)
        : Promise.resolve(null),
    [cadastrado, pacienteId],
  );

  // E-14 / R-X1: internado ou com atendimento aberto não registra outra chegada.
  const s = situacao.data;
  const bloqueio = !cadastrado
    ? null
    : s?.internacao
      ? {
          texto: c.internado(s.internacao.leitoCodigo),
          para: `/leitos/internacoes/${s.internacao.id}`,
        }
      : s?.atendimento
        ? { texto: c.emAtendimento(s.atendimento.numero), para: `/emergencia/${s.atendimento.id}` }
        : null;

  const erroDe = (campo: string) => {
    const partes = campo.split('.');
    let atual: unknown = errors;
    for (const p of partes) atual = (atual as Record<string, unknown> | undefined)?.[p];
    return (atual as { message?: string } | undefined)?.message;
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-5 pb-2">
      <ResumoErros erros={resumo} tentativa={tentativa} />

      <SecaoFormulario titulo={c.identificacao} colunas={1}>
        <Controller
          control={control}
          name="identificacao"
          render={({ field }) => (
            <RadioGroup
              legenda={c.identificacao}
              nome="identificacao"
              horizontal
              opcoes={[
                { valor: 'cadastrado', rotulo: c.cadastrado },
                { valor: 'provisorio', rotulo: c.provisorio },
              ]}
              valor={field.value}
              aoMudar={field.onChange}
            />
          )}
        />
        {cadastrado ? (
          <>
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
                      field.onChange(p?.id ?? '');
                    }}
                    aoSair={field.onBlur}
                  />
                )}
              />
            </Campo>
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
                  {c.abrir}
                </Link>
              </p>
            )}
            {dadosPaciente.data && <ResumoPaciente paciente={dadosPaciente.data} />}
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Campo
              rotulo={c.descricaoProvisoria}
              nome="provisorio.descricao"
              obrigatorio
              dica={c.descricaoProvisoriaDica}
              erro={erroDe('provisorio.descricao')}
            >
              <Input {...register('provisorio.descricao')} maxLength={200} />
            </Campo>
            <Campo
              rotulo={c.sexo}
              nome="provisorio.sexo"
              obrigatorio
              erro={erroDe('provisorio.sexo')}
            >
              <Select
                {...register('provisorio.sexo')}
                opcoes={SEXOS.map((x) => ({ valor: x, rotulo: t.pacientes.sexos[x] }))}
              />
            </Campo>
            <Campo
              rotulo={c.idadeAproximada}
              nome="provisorio.idadeAproximada"
              erro={erroDe('provisorio.idadeAproximada')}
            >
              <Input
                inputMode="numeric"
                autoComplete="off"
                {...register('provisorio.idadeAproximada')}
              />
            </Campo>
          </div>
        )}
      </SecaoFormulario>

      <SecaoFormulario titulo={c.secaoChegada} colunas={2}>
        <Campo rotulo={c.modo} nome="modoChegada" obrigatorio erro={erroDe('modoChegada')}>
          <Select
            vazia={false}
            {...register('modoChegada')}
            opcoes={MODOS_CHEGADA.map((m) => ({ valor: m, rotulo: te.modosChegada[m] }))}
          />
        </Campo>
        <Campo
          rotulo={c.hora}
          nome="chegadaEm"
          obrigatorio
          dica={c.horaDica}
          erro={erroDe('chegadaEm')}
        >
          <Input type="datetime-local" {...register('chegadaEm')} />
        </Campo>
        <div className="space-y-2 sm:col-span-2">
          <div
            role="group"
            aria-labelledby={idSugestoes}
            className="flex flex-wrap items-center gap-2"
          >
            <span id={idSugestoes} className="text-[12.5px] text-text-muted">
              {c.sugestoes}:
            </span>
            {te.queixasSugeridas.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() =>
                  setValue('queixa', q, { shouldDirty: true, shouldValidate: tentativa > 0 })
                }
                className="rounded-full border border-border-input px-3 py-1 text-[13px] hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {q}
              </button>
            ))}
          </div>
          <Campo
            rotulo={c.queixa}
            nome="queixa"
            obrigatorio
            dica={c.queixaDica}
            erro={erroDe('queixa')}
          >
            <Textarea {...register('queixa')} maxLength={300} rows={2} />
          </Campo>
        </div>
        <div className="rounded-lg border border-borda-risco-vermelho/50 p-3 sm:col-span-2">
          <Checkbox
            {...register('emergenciaImediata')}
            rotulo={
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Siren size={16} aria-hidden className="text-risco-vermelho" />
                {te.emergenciaImediata}
              </span>
            }
            descricao={c.imediataDica}
          />
        </div>
      </SecaoFormulario>

      <BarraAcoesFormulario>
        <Button variante="contorno" onClick={() => navigate('/emergencia')}>
          {te.cancelar}
        </Button>
        <Button type="submit" disabled={enviando || !!bloqueio}>
          {enviando ? te.salvando : c.registrar}
        </Button>
      </BarraAcoesFormulario>
    </form>
  );
}
