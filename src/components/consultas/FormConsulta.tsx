import { CalendarCheck, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import type { z } from 'zod';
import { departamentos } from '../../data/mock';
import { useColecao } from '../../hooks/useColecao';
import { useAgenda, useHorariosLivres, useListaMedicos } from '../../hooks/useDados';
import { useFormularioEntidade } from '../../hooks/useFormularioEntidade';
import { t } from '../../i18n/pt-BR';
import { esquemaAgendamento, TIPOS_CONSULTA, type DadosAgendamento } from '../../schemas/consulta';
import { proximoDiaDisponivel } from '../../services/consultas';
import { ErroConflito } from '../../services/erros';
import { listarMedicos, nomeExibicaoMedico, obterMedico } from '../../services/medicos';
import { listarPacientes, obterPaciente, nomeExibicaoPaciente } from '../../services/pacientes';
import type { ConsultaDetalhada, PacienteResumo } from '../../types';
import { atendeNoDia } from '../../utils/agenda';
import {
  dataValida,
  diaDaSemana,
  formatarDataCurta,
  hojeNoFuso,
  horaDoInstante,
  idade,
  dataDoInstante,
  somarDias,
} from '../../utils/datas';
import { ocultarCpf } from '../../utils/mascaras';
import { agora } from '../../utils/relogio';
import { AlertaAlergias } from '../pacientes/AlertaAlergias';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { BarraAcoesFormulario } from '../ui/form/BarraAcoesFormulario';
import { Campo } from '../ui/form/Campo';
import { Combobox } from '../ui/form/Combobox';
import { Input } from '../ui/form/Input';
import { ResumoErros } from '../ui/form/ResumoErros';
import { SecaoFormulario } from '../ui/form/SecaoFormulario';
import { Select } from '../ui/form/Select';
import { Textarea } from '../ui/form/Textarea';
import { SeletorHorario } from './SeletorHorario';
import { DURACOES, type ValoresConsulta } from './valoresConsulta';

const a = t.agenda;
const c = a.campos;
const TRINTA_DIAS = 30 * 86_400_000;

type OpcaoPaciente = Pick<PacienteResumo, 'id' | 'nomeExibicao' | 'cpfMascarado'>;

const ROTULOS: Record<string, string> = {
  pacienteId: c.paciente,
  medicoId: c.medico,
  data: c.data,
  hora: c.hora,
  duracaoMin: c.duracao,
  tipo: c.tipo,
  motivo: c.motivo,
};

const buscarPacientes = (termo: string): Promise<OpcaoPaciente[]> =>
  listarPacientes({ busca: termo, status: 'ativos', porPagina: 10 }).then((r) => r.itens);

interface FormConsultaProps {
  /** Consulta em reagendamento (P10). Ausente = agendamento novo (P9). */
  consulta?: ConsultaDetalhada;
  /** Pré-preenchimento pela URL (`?pacienteId=`, `?medicoId=`, `?data=`). */
  inicial?: { pacienteId?: string; medicoId?: string; data?: string };
  aoSalvar: (dados: DadosAgendamento) => Promise<void | boolean>;
  aoCancelar: () => void;
}

/** Formulário de agendamento (P9) e de reagendamento (P10). */
export function FormConsulta({ consulta, inicial = {}, aoSalvar, aoCancelar }: FormConsultaProps) {
  const reagendando = Boolean(consulta);
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState<OpcaoPaciente | null>(null);
  const [departamentoId, setDepartamentoId] = useState('');
  const [proximoDia, setProximoDia] = useState<{ buscando: boolean; mensagem?: string }>({
    buscando: false,
  });
  const recarregarHorarios = useRef<() => void>(() => undefined);

  const hoje = hojeNoFuso();
  const valoresIniciais: ValoresConsulta = consulta
    ? {
        pacienteId: consulta.pacienteId,
        medicoId: consulta.medicoId,
        data: dataDoInstante(consulta.inicio),
        hora: horaDoInstante(consulta.inicio),
        duracaoMin: consulta.duracaoMin,
        tipo: consulta.tipo,
        motivo: consulta.motivo ?? '',
      }
    : {
        pacienteId: inicial.pacienteId ?? '',
        medicoId: inicial.medicoId ?? '',
        data: inicial.data && dataValida(inicial.data) ? inicial.data : hoje,
        hora: '',
        duracaoMin: 30,
        tipo: 'primeira_vez',
        motivo: '',
      };

  const { form, enviar, enviando, resumo, tentativa } = useFormularioEntidade({
    esquema: esquemaAgendamento as unknown as z.ZodType<DadosAgendamento, ValoresConsulta>,
    valoresIniciais,
    rotulos: ROTULOS,
    aoEnviar: async (dados) => {
      try {
        return await aoSalvar(dados);
      } catch (e) {
        // E-04: alguém ocupou o horário entre a escolha e o salvamento.
        if (
          e instanceof ErroConflito &&
          (e.codigo === 'medico_ocupado' || e.codigo === 'paciente_ocupado')
        ) {
          form.setValue('hora', '');
          recarregarHorarios.current();
          throw new ErroConflito(e.codigo, t.erros.horarioOcupado, { campo: 'hora' });
        }
        throw e;
      }
    },
  });
  const { register, control, setValue, getValues, getFieldState, formState } = form;
  const { errors } = formState;
  const [pacienteId, medicoId, data, duracaoMin] = useWatch({
    control,
    name: ['pacienteId', 'medicoId', 'data', 'duracaoMin'],
  });

  // Pré-requisitos (P9): existir paciente e médico ativos.
  const existentes = useColecao(
    () =>
      Promise.all([
        listarPacientes({ status: 'ativos', porPagina: 1 }).then((r) => r.total),
        listarMedicos({ status: 'ativos', porPagina: 1 }).then((r) => r.total),
      ]),
    [],
  );

  // Paciente pré-selecionado (URL ou reagendamento).
  const idInicialPaciente = valoresIniciais.pacienteId;
  useEffect(() => {
    if (!idInicialPaciente) return;
    obterPaciente(idInicialPaciente)
      .then((p) =>
        setPaciente({
          id: p.id,
          nomeExibicao: nomeExibicaoPaciente(p),
          cpfMascarado: ocultarCpf(p.cpf),
        }),
      )
      .catch(() => setValue('pacienteId', ''));
  }, [idInicialPaciente, setValue]);

  const dadosPaciente = useColecao(
    () => (pacienteId ? obterPaciente(pacienteId).catch(() => null) : Promise.resolve(null)),
    [pacienteId],
  );
  const medicos = useListaMedicos({
    status: 'ativos',
    porPagina: 200,
    departamentoId: departamentoId || undefined,
  });
  const medico = useColecao(
    () => (medicoId ? obterMedico(medicoId).catch(() => null) : Promise.resolve(null)),
    [medicoId],
  );
  const historicoPaciente = useAgenda({ pacienteId: pacienteId || '__nenhum__' });

  const parametrosOk = Boolean(medicoId && dataValida(data) && duracaoMin);
  const horarios = useHorariosLivres(
    parametrosOk
      ? {
          medicoId,
          data,
          duracaoMin,
          pacienteId: pacienteId || undefined,
          ignorarConsultaId: consulta?.id,
        }
      : {},
  );
  useEffect(() => {
    recarregarHorarios.current = horarios.recarregar;
  }, [horarios.recarregar]);

  // Duração padrão do médico ao trocar de médico (no reagendamento, mantém a da consulta).
  const ultimoMedico = useRef(reagendando ? valoresIniciais.medicoId : '');
  useEffect(() => {
    const m = medico.data;
    if (!m || m.id === ultimoMedico.current) return;
    ultimoMedico.current = m.id;
    setValue('duracaoMin', m.disponibilidade.duracaoPadraoMin, { shouldDirty: true });
  }, [medico.data, setValue]);

  // Sugestão de "Retorno": consulta concluída com o mesmo médico nos últimos 30 dias.
  const limiteRetorno = agora().getTime() - TRINTA_DIAS;
  const sugeriuRetorno =
    !reagendando &&
    Boolean(pacienteId && medicoId) &&
    (historicoPaciente.data ?? []).some(
      (x) =>
        x.medicoId === medicoId &&
        x.status === 'concluida' &&
        new Date(x.inicio).getTime() >= limiteRetorno,
    );
  useEffect(() => {
    if (sugeriuRetorno && !getFieldState('tipo').isDirty) setValue('tipo', 'retorno');
  }, [sugeriuRetorno, getFieldState, setValue]);

  // P9 passo 8: horário escolhido deixou de valer → limpa e avisa.
  useEffect(() => {
    if (!horarios.data || horarios.carregando || horarios.atualizando) return;
    const escolhido = getValues('hora');
    if (!escolhido) return;
    const ainda = horarios.data.find((h) => h.hora === escolhido);
    if (!ainda?.livre) {
      setValue('hora', '', { shouldDirty: true });
      // Guardado como "erro" do campo (aviso), para sumir quando outro horário for escolhido.
      form.setError('hora', { type: 'invalidado', message: a.horarioInvalidado(escolhido) });
    }
  }, [horarios.data, horarios.carregando, horarios.atualizando, getValues, setValue, form]);

  // Dia sem atendimento: aviso + próximo dia em que o médico atende.
  const disp = medico.data?.disponibilidade;
  const naoAtende = disp && dataValida(data) && !atendeNoDia(disp, data);
  let proximoAtendimento: string | null = null;
  if (naoAtende && disp) {
    for (let i = 1; i <= 7 && !proximoAtendimento; i++) {
      const d = somarDias(data, i);
      if (atendeNoDia(disp, d)) proximoAtendimento = d;
    }
  }

  async function buscarProximoDia() {
    setProximoDia({ buscando: true });
    const d = await proximoDiaDisponivel(
      medicoId,
      data,
      duracaoMin,
      pacienteId || undefined,
      consulta?.id,
    );
    if (d) {
      setValue('data', d, { shouldDirty: true, shouldValidate: true });
      setProximoDia({ buscando: false });
    } else {
      setProximoDia({ buscando: false, mensagem: a.semProximoDia });
    }
  }

  const erroDe = (campo: keyof ValoresConsulta) => errors[campo]?.message;
  const nomeMedico = medico.data ? nomeExibicaoMedico(medico.data) : '';

  if (!reagendando && existentes.data && (existentes.data[0] === 0 || existentes.data[1] === 0)) {
    const semPacientes = existentes.data[0] === 0;
    return (
      <EmptyState
        mensagem={semPacientes ? a.semPacientes : a.semMedicos}
        acao={{
          rotulo: semPacientes ? a.cadastrarPaciente : a.cadastrarMedico,
          aoClicar: () => navigate(semPacientes ? '/pacientes/novo' : '/medicos/novo'),
        }}
      />
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-5 pb-2">
      <ResumoErros erros={resumo} tentativa={tentativa} />

      <SecaoFormulario titulo={a.secoes.paciente} colunas={1}>
        {reagendando ? (
          <div>
            <p className="font-semibold">{consulta!.pacienteNome}</p>
            <p className="text-[13px] text-text-muted">{a.pacienteFixo}</p>
          </div>
        ) : (
          <Campo
            rotulo={c.paciente}
            nome="pacienteId"
            obrigatorio
            dica={c.pacienteDica}
            erro={erroDe('pacienteId')}
          >
            <Controller
              control={control}
              name="pacienteId"
              render={({ field }) => (
                <Combobox
                  ref={field.ref}
                  name={field.name}
                  buscar={buscarPacientes}
                  valor={paciente}
                  aoMudar={(p) => {
                    setPaciente(p);
                    field.onChange(p?.id ?? '');
                  }}
                  aoSair={field.onBlur}
                  paraTexto={(p) => p.nomeExibicao}
                  chave={(p) => p.id}
                  renderizarOpcao={(p) => (
                    <span className="flex justify-between gap-3">
                      <span>{p.nomeExibicao}</span>
                      <span className="text-[12.5px] text-text-muted tabular-nums">
                        {p.cpfMascarado}
                      </span>
                    </span>
                  )}
                />
              )}
            />
          </Campo>
        )}
        {dadosPaciente.data && (
          <div className="space-y-3">
            <p className="text-[13.5px] text-text-muted">
              {a.resumoPaciente(
                t.pacientes.anos(idade(dadosPaciente.data.dataNascimento)),
                dadosPaciente.data.convenio.tipo === 'convenio'
                  ? dadosPaciente.data.convenio.nome
                  : t.convenio.particular,
              )}
            </p>
            <AlertaAlergias alergias={dadosPaciente.data.alergias} />
          </div>
        )}
        {!reagendando && (
          <Link
            to={`/pacientes/novo?voltarPara=${encodeURIComponent(`/consultas/nova${medicoId ? `?medicoId=${medicoId}` : ''}`)}`}
            className="inline-flex w-fit items-center gap-1.5 rounded text-[13.5px] font-medium text-on-primary-light hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <UserPlus size={15} aria-hidden />
            {a.cadastrarPaciente}
          </Link>
        )}
      </SecaoFormulario>

      <SecaoFormulario titulo={a.secoes.profissional} colunas={3}>
        <Campo rotulo={c.departamento} dica={c.departamentoDica}>
          <Select
            value={departamentoId}
            onChange={(e) => setDepartamentoId(e.target.value)}
            vazia={a.todosDepartamentos}
            opcoes={departamentos.map((d) => ({ valor: d.id, rotulo: d.nome }))}
          />
        </Campo>
        <Campo
          rotulo={c.medico}
          nome="medicoId"
          obrigatorio
          erro={erroDe('medicoId')}
          className="sm:col-span-2"
        >
          {/* Controlado: as opções chegam depois do valor inicial (pré-preenchimento pela URL). */}
          <Controller
            control={control}
            name="medicoId"
            render={({ field }) => (
              <Select
                ref={field.ref}
                name={field.name}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                opcoes={[
                  ...(medicos.data?.itens ?? []).map((m) => ({
                    valor: m.id,
                    rotulo: a.opcaoMedico(m.nomeExibicao, m.diasResumo),
                  })),
                  // Médico atual fora do filtro de departamento continua visível.
                  ...(medico.data && !medicos.data?.itens.some((m) => m.id === medico.data!.id)
                    ? [{ valor: medico.data.id, rotulo: nomeMedico }]
                    : []),
                ]}
              />
            )}
          />
        </Campo>
        <Campo
          rotulo={c.data}
          nome="data"
          obrigatorio
          erro={erroDe('data')}
          dica={
            naoAtende && medico.data ? (
              <span className="flex flex-col items-start gap-1 text-warning">
                {a.naoAtendeNoDia(nomeMedico, a.diasNaPreposicao[diaDaSemana(data)])}
                {proximoAtendimento && (
                  <button
                    type="button"
                    onClick={() =>
                      setValue('data', proximoAtendimento!, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded font-medium text-on-primary-light underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <CalendarCheck size={14} aria-hidden />
                    {a.proximoAtendimento(formatarDataCurta(proximoAtendimento))} — {a.usarData}
                  </button>
                )}
              </span>
            ) : undefined
          }
        >
          <Input type="date" min={hoje} {...register('data')} />
        </Campo>
        <Campo rotulo={c.duracao} nome="duracaoMin" obrigatorio erro={erroDe('duracaoMin')}>
          <Select
            vazia={false}
            {...register('duracaoMin', { valueAsNumber: true })}
            opcoes={[...new Set([...DURACOES, duracaoMin])]
              .filter((n) => Number.isFinite(n))
              .sort((x, y) => x - y)
              .map((n) => ({ valor: String(n), rotulo: a.minutos(n) }))}
          />
        </Campo>
        <Campo
          rotulo={c.tipo}
          nome="tipo"
          obrigatorio
          erro={erroDe('tipo')}
          dica={sugeriuRetorno ? a.sugestaoRetorno : undefined}
          className="sm:col-span-2"
        >
          <Select
            vazia={false}
            {...register('tipo')}
            opcoes={TIPOS_CONSULTA.map((x) => ({ valor: x, rotulo: a.tipos[x] }))}
          />
        </Campo>
      </SecaoFormulario>

      <SecaoFormulario titulo={a.secoes.horario} colunas={1}>
        <Controller
          control={control}
          name="hora"
          render={({ field }) => (
            <SeletorHorario
              ref={(el) =>
                field.ref({
                  focus: () =>
                    (el?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]') ?? el)?.focus(),
                })
              }
              horarios={parametrosOk ? horarios.data : null}
              carregando={horarios.carregando || horarios.atualizando}
              valor={field.value}
              aoMudar={(h) => {
                form.clearErrors('hora');
                field.onChange(h);
              }}
              horarioAtual={
                consulta &&
                medicoId === consulta.medicoId &&
                data === dataDoInstante(consulta.inicio)
                  ? horaDoInstante(consulta.inicio)
                  : undefined
              }
              erro={errors.hora?.type === 'invalidado' ? undefined : erroDe('hora')}
              aviso={errors.hora?.type === 'invalidado' ? errors.hora.message : undefined}
              semParametros={!parametrosOk}
              aoBuscarProximoDia={buscarProximoDia}
              buscandoProximoDia={proximoDia.buscando}
              mensagemProximoDia={proximoDia.mensagem}
            />
          )}
        />
      </SecaoFormulario>

      <SecaoFormulario titulo={a.secoes.detalhes} colunas={1}>
        <Campo rotulo={c.motivo} nome="motivo" erro={erroDe('motivo')}>
          <Textarea {...register('motivo')} maxLength={500} rows={3} />
        </Campo>
      </SecaoFormulario>

      <BarraAcoesFormulario>
        <Button variante="contorno" onClick={aoCancelar}>
          {a.cancelar}
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando ? a.salvando : reagendando ? a.salvarReagendamento : a.agendar}
        </Button>
      </BarraAcoesFormulario>
    </form>
  );
}
