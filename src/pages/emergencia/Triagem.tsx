import { ArrowLeft, Info } from 'lucide-react';
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { BadgeRisco } from '../../components/emergencia/BadgeRisco';
import { CamposSinaisVitais } from '../../components/emergencia/CamposSinaisVitais';
import {
  CAMPOS_SINAIS,
  lerNumero,
  type CampoSinalOuPeso,
  type ValoresSinais,
} from '../../components/emergencia/sinais';
import { AlertaAlergias } from '../../components/pacientes/AlertaAlergias';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/EmptyState';
import { BarraAcoesFormulario } from '../../components/ui/form/BarraAcoesFormulario';
import { Campo } from '../../components/ui/form/Campo';
import { Input } from '../../components/ui/form/Input';
import { ResumoErros } from '../../components/ui/form/ResumoErros';
import { SecaoFormulario } from '../../components/ui/form/SecaoFormulario';
import { Textarea } from '../../components/ui/form/Textarea';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { NaoEncontrado } from '../../components/ui/NaoEncontrado';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { useAtendimento } from '../../hooks/useDadosOperacoes';
import { useConfirmar } from '../../hooks/useConfirmar';
import { useFormularioEntidade } from '../../hooks/useFormularioEntidade';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { te } from '../../i18n/pt-BR/emergencia';
import { esquemaTriagem, type DadosTriagem } from '../../schemas/emergencia';
import { obterAtendimento, triar } from '../../services/emergencia';
import { ErroConcorrencia, ErroConflito, ErroNaoEncontrado } from '../../services/erros';
import type { AtendimentoDetalhado, CorRisco, Triagem as TriagemTipo } from '../../types';
import { CORES_RISCO } from '../../types/emergencia';
import { autorAtual } from '../../utils/autor';
import { horaDoInstante } from '../../utils/datas';
import { calcularPrazo, pesoRisco } from '../../utils/fila';
import { agora } from '../../utils/relogio';
import { formatarPrazo } from '../../utils/tempos';
import { ResumoSinais } from '../../components/emergencia/ResumoSinais';

const tt = te.triagemTela;

interface ValoresTriagem {
  risco: CorRisco | '';
  profissional: string;
  sinais: ValoresSinais;
  pesoKg: string;
  observacao: string;
  justificativa: string;
}

/** Texto digitado → número; texto inválido segue como está para o esquema recusar. */
const numeroOuTexto = (texto: string | undefined) =>
  texto === undefined || texto.trim() === '' ? undefined : (lerNumero(texto) ?? texto);

const paraEntrada = (v: ValoresTriagem) => ({
  risco: v.risco || undefined,
  profissional: v.profissional,
  sinais: Object.fromEntries(CAMPOS_SINAIS.map((c) => [c, numeroOuTexto(v.sinais[c])])),
  pesoKg: numeroOuTexto(v.pesoKg),
  observacao: v.observacao,
  justificativa: v.justificativa,
});

/** /emergencia/:id/triagem — E2 (triagem e retriagem). */
export default function Triagem() {
  const { id = '' } = useParams();
  const { data, erro, recarregar } = useAtendimento(id);
  // A versão usada é a da abertura da tela (E-05); só muda quando o usuário recarrega.
  const [base, setBase] = useState<AtendimentoDetalhado | null>(null);
  const [rascunho, setRascunho] = useState<ValoresTriagem | undefined>();
  if (data && !base) setBase(data);

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.atendimentoNaoEncontrado}
        descricao={te.detalheTela.naoEncontradoDescricao}
        voltarPara="/emergencia"
        rotuloVoltar={te.voltarFila}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!base) {
    return (
      <div aria-busy="true">
        <SkeletonLinhas linhas={8} />
      </div>
    );
  }
  if (base.status === 'encerrado') {
    return (
      <>
        <CabecalhoPagina
          titulo={tt.encerradoTitulo}
          breadcrumbNomes={{ [`/emergencia/${id}`]: base.numero }}
        />
        <p className="mb-4 text-text-muted">{te.regras.atendimentoEncerrado}</p>
        <ButtonLink to={`/emergencia/${id}`}>{te.verAtendimento}</ButtonLink>
      </>
    );
  }
  return (
    <FormTriagem
      key={base.versao}
      base={base}
      rascunho={rascunho}
      aoNovaBase={(a, valores) => {
        setRascunho(valores);
        setBase(a);
      }}
    />
  );
}

function FormTriagem({
  base,
  rascunho,
  aoNovaBase,
}: {
  base: AtendimentoDetalhado;
  /** O que já estava digitado antes de recarregar a versão (E-05). */
  rascunho?: ValoresTriagem;
  aoNovaBase: (a: AtendimentoDetalhado, valores: ValoresTriagem) => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const confirmar = useConfirmar();
  const anterior: TriagemTipo | undefined = base.triagens[base.triagens.length - 1];
  const retriagem = anterior !== undefined;
  const titulo = retriagem ? tt.tituloRetriagem(base.numero) : tt.titulo(base.numero);

  const esquema = z.preprocess(
    (v) => paraEntrada(v as ValoresTriagem),
    esquemaTriagem(base.risco),
  ) as unknown as z.ZodType<DadosTriagem, ValoresTriagem>;

  const { form, enviar, enviando, resumo, tentativa } = useFormularioEntidade({
    esquema,
    valoresIniciais: rascunho ?? {
      risco: '' as const,
      profissional: autorAtual(),
      sinais: {},
      pesoKg: '',
      observacao: '',
      justificativa: '',
    },
    rotulos: {
      risco: tt.risco,
      profissional: tt.profissional,
      pesoKg: te.peso,
      observacao: tt.observacao,
      justificativa: tt.justificativa,
      ...Object.fromEntries(CAMPOS_SINAIS.map((c) => [`sinais.${c}`, te.sinais[c]])),
    },
    aoEnviar: async (dados) => {
      const semSinais = Object.values(dados.sinais).every((x) => x === undefined);
      if (
        semSinais &&
        dados.risco !== 'vermelho' &&
        !(await confirmar({
          titulo: tt.semSinaisTitulo,
          mensagem: tt.semSinaisMensagem,
          rotuloConfirmar: tt.classificar,
          rotuloCancelar: te.voltar,
        }))
      )
        return false;
      try {
        const a = await triar(base.id, dados, base.versao);
        toast.sucesso(
          te.avisos.triagemRegistrada(
            te.cores[dados.risco].toLowerCase(),
            a.prazo ? horaDoInstante(a.prazo) : '—',
          ),
        );
        navigate('/emergencia');
      } catch (e) {
        if (e instanceof ErroConcorrencia) {
          // E-05: outra aba mudou o atendimento. Mostra a versão atual mantendo o digitado.
          toast.aviso(te.dialogos.mudouSituacao);
          aoNovaBase(await obterAtendimento(base.id), form.getValues());
          return false;
        }
        if (e instanceof ErroConflito && e.codigo === 'transicao_invalida') {
          // E-16: encerrado em outra aba.
          toast.aviso(e.message);
          navigate(`/emergencia/${base.id}`);
          return false;
        }
        throw e;
      }
    },
  });
  const { register, control, setValue, formState } = form;
  const { errors } = formState;
  const [riscoBruto, sinais, pesoKg] = useWatch({ control, name: ['risco', 'sinais', 'pesoKg'] });
  const risco = (riscoBruto || undefined) as CorRisco | undefined;
  const menosGrave = !!risco && !!base.risco && pesoRisco(risco) > pesoRisco(base.risco);
  const prazoNovo = risco
    ? calcularPrazo({ risco: base.risco, prazo: base.prazo }, { risco, em: agora().toISOString() })
    : undefined;
  const errosSinais = {
    ...Object.fromEntries(
      CAMPOS_SINAIS.map((c) => [
        c,
        (errors.sinais as Record<string, { message?: string }> | undefined)?.[c]?.message,
      ]),
    ),
    pesoKg: errors.pesoKg?.message,
  } as Partial<Record<CampoSinalOuPeso, string>>;

  return (
    <>
      <Link
        to={`/emergencia/${base.id}`}
        className="mb-3 inline-flex items-center gap-1.5 rounded text-[13.5px] text-text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <ArrowLeft size={15} aria-hidden />
        {te.voltar}
      </Link>
      <CabecalhoPagina
        titulo={titulo}
        breadcrumbNomes={{ [`/emergencia/${base.id}`]: base.numero }}
        descricao={[
          base.idade !== undefined && base.pacienteId
            ? `${base.nomeExibicao}, ${te.anos(base.idade)}`
            : base.nomeExibicao,
          base.queixa,
        ].join(' · ')}
      />
      <div className="space-y-5">
        <p className="flex items-start gap-2 rounded-lg border border-border bg-bg px-4 py-3 text-[13.5px]">
          <Info size={17} aria-hidden className="mt-0.5 shrink-0 text-text-muted" />
          {te.avisoEscopo}
        </p>
        <AlertaAlergias alergias={base.pacienteAlergias} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <form onSubmit={enviar} noValidate className="min-w-0 space-y-5 pb-2">
            <ResumoErros erros={resumo} tentativa={tentativa} />
            <Card>
              <CamposSinaisVitais
                valores={{ ...sinais, pesoKg }}
                aoMudar={(campo, texto) =>
                  campo === 'pesoKg'
                    ? setValue('pesoKg', texto, { shouldDirty: true })
                    : setValue(`sinais.${campo}`, texto, { shouldDirty: true })
                }
                erros={errosSinais}
                idade={base.idade}
                mostrarPeso
              />
            </Card>

            <SecaoFormulario titulo={tt.risco} colunas={1}>
              <Controller
                control={control}
                name="risco"
                render={({ field }) => (
                  <fieldset
                    id="campo-risco"
                    tabIndex={-1}
                    aria-describedby="risco-dica"
                    aria-invalid={errors.risco ? true : undefined}
                    className="min-w-0 outline-none"
                  >
                    <legend className="mb-2 text-[13.5px] font-medium">
                      {tt.risco}
                      <span aria-hidden className="ml-0.5 text-danger">
                        *
                      </span>
                      <span className="sr-only">{` (${t.formulario.obrigatorio})`}</span>
                    </legend>
                    <p id="risco-dica" className="mb-2 text-[12.5px] text-text-muted">
                      {tt.riscoDica}
                    </p>
                    <div className="flex flex-col gap-2">
                      {CORES_RISCO.map((cor) => (
                        <label
                          key={cor}
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 has-[:checked]:border-primary has-[:checked]:bg-primary-light/40"
                        >
                          <input
                            type="radio"
                            name={field.name}
                            value={cor}
                            checked={field.value === cor}
                            onChange={() => field.onChange(cor)}
                            onBlur={field.onBlur}
                            className="size-[18px] shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          />
                          <BadgeRisco risco={cor} variante="tempoAlvo" />
                          <span className="text-[13.5px] text-text-muted">
                            {te.significados[cor]}
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors.risco?.message && (
                      <p className="mt-1.5 text-[12.5px] font-medium text-danger">
                        {errors.risco.message}
                      </p>
                    )}
                  </fieldset>
                )}
              />
              <p role="status" aria-live="polite" className="text-[14px] font-medium">
                {prazoNovo ? tt.prazoPrevisto(formatarPrazo(prazoNovo)) : ''}
              </p>
              {menosGrave && (
                <Campo
                  rotulo={tt.justificativa}
                  nome="justificativa"
                  obrigatorio
                  dica={tt.justificativaDica}
                  erro={errors.justificativa?.message}
                >
                  <Textarea {...register('justificativa')} maxLength={300} rows={2} />
                </Campo>
              )}
            </SecaoFormulario>

            <SecaoFormulario titulo={tt.profissional} colunas={2}>
              <Campo
                rotulo={tt.profissional}
                nome="profissional"
                obrigatorio
                erro={errors.profissional?.message}
              >
                <Input {...register('profissional')} maxLength={120} />
              </Campo>
              <Campo
                rotulo={tt.observacao}
                nome="observacao"
                erro={errors.observacao?.message}
                className="sm:col-span-2"
              >
                <Textarea {...register('observacao')} maxLength={500} rows={2} />
              </Campo>
            </SecaoFormulario>

            <BarraAcoesFormulario>
              <Button variante="contorno" onClick={() => navigate(`/emergencia/${base.id}`)}>
                {te.cancelar}
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando ? te.salvando : tt.salvar}
              </Button>
            </BarraAcoesFormulario>
          </form>

          {retriagem && (
            <Card titulo={tt.anterior} className="h-fit">
              <div className="space-y-2 text-[14px]">
                <BadgeRisco risco={anterior.risco} />
                <p className="text-text-muted">
                  {tt.anteriorResumo(
                    te.cores[anterior.risco],
                    horaDoInstante(anterior.em),
                    anterior.profissional,
                  )}
                </p>
                {base.prazo && (
                  <p>
                    {te.detalheTela.campos.prazo}: {formatarPrazo(base.prazo)}
                  </p>
                )}
                <ResumoSinais sinais={anterior.sinais} />
                {anterior.observacao && <p className="text-text-muted">{anterior.observacao}</p>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
