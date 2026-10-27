import { useEffect, useState, type ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import { Link } from 'react-router-dom';
import type { z } from 'zod';
import { departamentos } from '../../data/mock';
import { useFormularioEntidade } from '../../hooks/useFormularioEntidade';
import { t } from '../../i18n/pt-BR';
import { esquemaMedico, type DadosMedico } from '../../schemas/medico';
import { ErroConflito } from '../../services/erros';
import { medicoComCrm } from '../../services/medicos';
import { UFS, type Medico } from '../../types';
import { somenteDigitos, ufValida } from '../../utils/validacao';
import { Button } from '../ui/Button';
import { BarraAcoesFormulario } from '../ui/form/BarraAcoesFormulario';
import { Campo } from '../ui/form/Campo';
import { Input } from '../ui/form/Input';
import { InputMascarado } from '../ui/form/InputMascarado';
import { ResumoErros } from '../ui/form/ResumoErros';
import { SecaoFormulario } from '../ui/form/SecaoFormulario';
import { Select } from '../ui/form/Select';
import { EditorDisponibilidade } from './EditorDisponibilidade';
import { valoresDoMedico, type ValoresMedico } from './valoresMedico';

const m = t.medicos;
const c = m.campos;

const ROTULOS: Record<string, string> = {
  tratamento: c.tratamento,
  nome: c.nome,
  'crm.numero': c.crmNumero,
  'crm.uf': c.crmUf,
  telefone: c.telefone,
  email: c.email,
  departamentoId: c.departamento,
  'disponibilidade.diasSemana': c.dias,
  'disponibilidade.inicio': c.inicio,
  'disponibilidade.fim': c.fim,
  'disponibilidade.pausa.inicio': c.pausaInicio,
  'disponibilidade.pausa.fim': c.pausaFim,
  'disponibilidade.duracaoPadraoMin': c.duracao,
};

interface FormMedicoProps {
  medico?: Medico;
  aoEnviar: (dados: DadosMedico) => Promise<void | boolean>;
  aoCancelar: () => void;
  topo?: ReactNode;
  aoPronto?: (api: { reset: (valores: ValoresMedico) => void }) => void;
}

/** Formulário de médico (P6 e P7). */
export function FormMedico({ medico, aoEnviar, aoCancelar, topo, aoPronto }: FormMedicoProps) {
  const editando = Boolean(medico);
  const [crmExistente, setCrmExistente] = useState<{ id: string; nomeExibicao: string } | null>(
    null,
  );

  const { form, enviar, enviando, resumo, tentativa } = useFormularioEntidade({
    esquema: esquemaMedico as unknown as z.ZodType<DadosMedico, ValoresMedico>,
    valoresIniciais: valoresDoMedico(medico),
    aoEnviar,
    rotulos: ROTULOS,
    aoErroServico: (erro) => {
      if (erro instanceof ErroConflito && erro.codigo === 'crm_duplicado' && erro.detalhes?.id) {
        setCrmExistente({ id: String(erro.detalhes.id), nomeExibicao: '' });
      }
    },
  });
  const { register, control, formState, getValues, setError, setFocus, trigger } = form;
  const { errors, isDirty } = formState;

  useEffect(() => {
    aoPronto?.({ reset: (valores) => form.reset(valores) });
  }, [aoPronto, form]);

  // Foco inicial em "Tratamento" (P6, passo 1).
  useEffect(() => {
    if (!editando) setFocus('tratamento');
  }, [editando, setFocus]);

  const erroDe = (caminho: string): string | undefined => {
    let atual: unknown = errors;
    for (const parte of caminho.split('.'))
      atual = (atual as Record<string, unknown> | undefined)?.[parte];
    return (atual as { message?: string } | undefined)?.message;
  };

  // ── R-M1: CRM disponível ao sair do número ou trocar a UF ──
  async function verificarCrm() {
    const numero = somenteDigitos(getValues('crm.numero'));
    const uf = getValues('crm.uf');
    if (!(await trigger('crm.numero')) || !/^\d{4,7}$/.test(numero) || !ufValida(uf)) return;
    const existente = await medicoComCrm(numero, uf, medico?.id);
    setCrmExistente(existente);
    if (existente) setError('crm.numero', { type: 'crm_duplicado', message: t.erros.crmDuplicado });
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-5 pb-2">
      {topo}
      <ResumoErros erros={resumo} tentativa={tentativa} />

      <SecaoFormulario titulo={m.secoes.identificacao} colunas={3}>
        <Campo rotulo={c.tratamento} nome="tratamento" obrigatorio erro={erroDe('tratamento')}>
          <Select
            {...register('tratamento')}
            opcoes={[
              { valor: 'Dr.', rotulo: 'Dr.' },
              { valor: 'Dra.', rotulo: 'Dra.' },
            ]}
          />
        </Campo>
        <Campo
          rotulo={c.nome}
          nome="nome"
          obrigatorio
          dica={c.nomeDica}
          erro={erroDe('nome')}
          className="sm:col-span-2"
        >
          <Input {...register('nome')} autoComplete="name" maxLength={120} />
        </Campo>
        <Campo
          rotulo={c.crmNumero}
          nome="crm.numero"
          obrigatorio
          erro={erroDe('crm.numero')}
          dica={
            errors.crm?.numero?.type === 'crm_duplicado' && crmExistente ? (
              <Link
                to={`/medicos/${crmExistente.id}`}
                className="font-medium text-on-primary-light underline underline-offset-2"
              >
                {t.erros.abrirExistente}
                {crmExistente.nomeExibicao && ` (${crmExistente.nomeExibicao})`}
              </Link>
            ) : undefined
          }
        >
          <Input
            {...register('crm.numero', { onBlur: () => void verificarCrm() })}
            inputMode="numeric"
            autoComplete="off"
            maxLength={7}
          />
        </Campo>
        <Campo rotulo={c.crmUf} nome="crm.uf" obrigatorio erro={erroDe('crm.uf')}>
          <Select
            {...register('crm.uf', { onChange: () => void verificarCrm() })}
            opcoes={UFS.map((uf) => ({ valor: uf, rotulo: uf }))}
          />
        </Campo>
      </SecaoFormulario>

      <SecaoFormulario titulo={m.secoes.contato} colunas={2}>
        <Campo rotulo={c.telefone} nome="telefone" obrigatorio erro={erroDe('telefone')}>
          <Controller
            control={control}
            name="telefone"
            render={({ field }) => (
              <InputMascarado
                ref={field.ref}
                name={field.name}
                mascara="telefone"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                autoComplete="tel"
              />
            )}
          />
        </Campo>
        <Campo rotulo={c.email} nome="email" obrigatorio erro={erroDe('email')}>
          <Input type="email" {...register('email')} autoComplete="email" maxLength={120} />
        </Campo>
      </SecaoFormulario>

      <SecaoFormulario titulo={m.secoes.lotacao} colunas={2}>
        <Campo
          rotulo={c.departamento}
          nome="departamentoId"
          obrigatorio
          erro={erroDe('departamentoId')}
        >
          <Select
            {...register('departamentoId')}
            opcoes={departamentos.map((d) => ({ valor: d.id, rotulo: d.nome }))}
          />
        </Campo>
      </SecaoFormulario>

      <SecaoFormulario
        titulo={m.secoes.disponibilidade}
        descricao={m.secoes.disponibilidadeDescricao}
        colunas={3}
      >
        <EditorDisponibilidade form={form} erroDe={erroDe} />
      </SecaoFormulario>

      <BarraAcoesFormulario>
        <Button variante="contorno" onClick={aoCancelar}>
          {m.cancelar}
        </Button>
        <Button type="submit" disabled={enviando || (editando && !isDirty)}>
          {enviando ? m.salvando : m.salvar}
        </Button>
      </BarraAcoesFormulario>
    </form>
  );
}
