import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import type { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/EmptyState';
import { BarraAcoesFormulario } from '../../components/ui/form/BarraAcoesFormulario';
import { Campo } from '../../components/ui/form/Campo';
import { Input } from '../../components/ui/form/Input';
import { ResumoErros } from '../../components/ui/form/ResumoErros';
import { SecaoFormulario } from '../../components/ui/form/SecaoFormulario';
import { Select } from '../../components/ui/form/Select';
import { Textarea } from '../../components/ui/form/Textarea';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { NaoEncontrado } from '../../components/ui/NaoEncontrado';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { useAcoesLeito } from '../../hooks/useAcoesLeito';
import { useColecao } from '../../hooks/useColecao';
import { useInternacao, useLeito } from '../../hooks/useDadosOperacoes';
import { useConfirmar } from '../../hooks/useConfirmar';
import { useFormularioEntidade } from '../../hooks/useFormularioEntidade';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { tl } from '../../i18n/pt-BR/leitos';
import {
  esquemaEdicaoInternacao,
  PRECAUCOES,
  type EntradaEdicaoInternacao,
} from '../../schemas/internacao';
import { ErroConcorrencia, ErroNaoEncontrado } from '../../services/erros';
import { editarInternacao, medicosResponsaveis, obterInternacao } from '../../services/leitos';
import { nomeExibicaoMedico } from '../../services/medicos';
import type { InternacaoDetalhada } from '../../types';

const c = tl.internar.campos;
const ROTULOS: Record<string, string> = {
  medicoResponsavelId: c.medico,
  previsaoAlta: c.previsaoAlta,
  precaucao: c.precaucao,
  motivo: c.motivo,
  justificativa: tl.editar.justificativa,
};

const valoresDe = (i: InternacaoDetalhada): EntradaEdicaoInternacao => ({
  medicoResponsavelId: i.medicoResponsavelId,
  previsaoAlta: i.previsaoAlta ?? '',
  precaucao: i.precaucao,
  motivo: i.motivo,
  justificativa: '',
});

/** /leitos/internacoes/:id/editar — L7, com a versão carregada (R-G1, E-05). */
export default function EditarInternacao() {
  const { id = '' } = useParams();
  const { data, erro, recarregar } = useInternacao(id);
  const [base, setBase] = useState<InternacaoDetalhada | null>(null);
  const [chave, setChave] = useState(0);
  if (data && !base) setBase(data);

  if (erro instanceof ErroNaoEncontrado) {
    return (
      <NaoEncontrado
        titulo={t.erros.internacaoNaoEncontrada}
        descricao={tl.detalhe.naoEncontradaDescricao}
        voltarPara="/leitos/internacoes"
        rotuloVoltar={tl.voltarInternacoes}
      />
    );
  }
  if (erro) return <ErrorState aoTentarNovamente={recarregar} />;
  if (!base) {
    return (
      <div aria-busy="true">
        <SkeletonLinhas linhas={6} />
      </div>
    );
  }

  return (
    <>
      <CabecalhoPagina
        titulo={tl.detalhe.editar}
        descricao={tl.editar.descricao(base.pacienteNome, base.leitoCodigo)}
        breadcrumbNomes={{ [`/leitos/internacoes/${id}`]: base.pacienteNome }}
      />
      <FormEditar
        key={chave}
        base={base}
        aoNovaBase={(nova, recarregarForm) => {
          setBase(nova);
          if (recarregarForm) setChave((k) => k + 1);
        }}
      />
    </>
  );
}

function FormEditar({
  base,
  aoNovaBase,
}: {
  base: InternacaoDetalhada;
  aoNovaBase: (nova: InternacaoDetalhada, recarregarForm: boolean) => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const confirmar = useConfirmar();
  const acoes = useAcoesLeito();
  const leito = useLeito(base.leitoId);
  const medicos = useColecao(() => medicosResponsaveis(base.setorId), [base.setorId]);

  const { form, enviar, enviando, resumo, tentativa } = useFormularioEntidade({
    esquema: esquemaEdicaoInternacao as unknown as z.ZodType<
      EntradaEdicaoInternacao,
      EntradaEdicaoInternacao
    >,
    valoresIniciais: valoresDe(base),
    rotulos: ROTULOS,
    aoEnviar: async (dados) => {
      try {
        await editarInternacao(base.id, dados, base.versao);
      } catch (e) {
        if (!(e instanceof ErroConcorrencia)) throw e;
        // E-05: recarregar (perde as alterações) ou continuar editando sobre a versão atual.
        const recarregarAgora = await confirmar({
          titulo: tl.editar.concorrenciaTitulo,
          mensagem: t.erros.concorrencia,
          rotuloConfirmar: tl.editar.recarregar,
          rotuloCancelar: tl.editar.continuar,
        });
        aoNovaBase(await obterInternacao(base.id), recarregarAgora);
        return false;
      }
      toast.sucesso(tl.editar.salvo);
      navigate(`/leitos/internacoes/${base.id}`);
    },
  });
  const { register, control, formState } = form;
  const { errors } = formState;
  const precaucao = useWatch({ control, name: 'precaucao' });
  const semIsolamento = precaucao !== 'padrao' && leito.data && !leito.data.isolamento;
  const erroDe = (campo: keyof EntradaEdicaoInternacao) =>
    errors[campo]?.message as string | undefined;

  return (
    <form onSubmit={enviar} noValidate className="space-y-5 pb-2">
      <ResumoErros erros={resumo} tentativa={tentativa} />
      <SecaoFormulario titulo={tl.internar.secoes.responsavel} colunas={2}>
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
        <Campo rotulo={c.previsaoAlta} nome="previsaoAlta" erro={erroDe('previsaoAlta')}>
          <Input type="date" {...register('previsaoAlta')} />
        </Campo>
        <Campo rotulo={c.precaucao} nome="precaucao" obrigatorio erro={erroDe('precaucao')}>
          <Select
            vazia={false}
            {...register('precaucao')}
            opcoes={PRECAUCOES.map((x) => ({ valor: x, rotulo: tl.precaucoes[x] }))}
          />
        </Campo>
        {semIsolamento && (
          <div className="space-y-3 sm:col-span-2">
            <div
              role="status"
              className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 px-4 py-3 text-[14px]"
            >
              <AlertTriangle size={17} aria-hidden className="shrink-0 text-warning" />
              <span className="flex-1">{tl.editar.precaucaoSemIsolamento}</span>
              <Button tamanho="sm" variante="contorno" onClick={() => acoes.transferir(base)}>
                {tl.editar.transferirAgora}
              </Button>
            </div>
            <Campo
              rotulo={tl.editar.justificativa}
              nome="justificativa"
              obrigatorio
              erro={erroDe('justificativa')}
            >
              <Textarea {...register('justificativa')} maxLength={300} rows={2} />
            </Campo>
          </div>
        )}
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
      </SecaoFormulario>
      <BarraAcoesFormulario>
        <Button variante="contorno" onClick={() => navigate(`/leitos/internacoes/${base.id}`)}>
          {tl.cancelar}
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando ? tl.salvando : tl.editar.salvar}
        </Button>
      </BarraAcoesFormulario>
      {acoes.dialogos}
    </form>
  );
}
