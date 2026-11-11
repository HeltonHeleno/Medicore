import { AlertTriangle, Info, Lock } from 'lucide-react';
import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useFormularioEntidade } from '../../hooks/useFormularioEntidade';
import { tf } from '../../i18n/pt-BR/farmacia';
import {
  esquemaMedicamento,
  FORMAS,
  LISTAS_CONTROLADO,
  UNIDADES,
  type DadosMedicamento,
} from '../../schemas/farmacia';
import { ErroConflito } from '../../services/erros';
import type { ValoresMedicamento } from './valores-medicamento';
import { Button } from '../ui/Button';
import { BarraAcoesFormulario } from '../ui/form/BarraAcoesFormulario';
import { Campo } from '../ui/form/Campo';
import { Input } from '../ui/form/Input';
import { ResumoErros } from '../ui/form/ResumoErros';
import { SecaoFormulario } from '../ui/form/SecaoFormulario';
import { Select } from '../ui/form/Select';

const f = tf.formMedicamento;
const c = f.campos;

/** Campo vazio vira "não informado" (o `coerce` do zod transformaria "" em 0). */
const esquemaTela = z.preprocess((v) => {
  const x = v as ValoresMedicamento;
  return { ...x, estoqueMinimo: x.estoqueMinimo.trim() === '' ? undefined : x.estoqueMinimo };
}, esquemaMedicamento) as unknown as z.ZodType<DadosMedicamento, ValoresMedicamento>;

const ROTULOS: Record<string, string> = { ...c };

interface FormMedicamentoProps {
  inicial: ValoresMedicamento;
  /** Já houve movimentação: unidade e unidades por embalagem ficam travadas (F1). */
  travado?: boolean;
  /** Grava. Devolva `false` se o usuário desistiu (ex.: E-05 com "Continuar editando"). */
  aoEnviar: (dados: DadosMedicamento) => Promise<void | boolean>;
  aoCancelar: () => void;
}

/** F1: cadastro e edição de medicamento (unicidade E-02 com link, controlado, unidade travada). */
export function FormMedicamento({ inicial, travado, aoEnviar, aoCancelar }: FormMedicamentoProps) {
  const [duplicado, setDuplicado] = useState<string | null>(null);
  const { form, enviar, enviando, resumo, tentativa } = useFormularioEntidade({
    esquema: esquemaTela,
    valoresIniciais: inicial,
    rotulos: ROTULOS,
    aoEnviar: async (dados) => {
      setDuplicado(null);
      return aoEnviar(dados);
    },
    aoErroServico: (e) => {
      if (e instanceof ErroConflito && e.codigo === 'medicamento_duplicado' && e.detalhes?.id)
        setDuplicado(String(e.detalhes.id));
    },
  });
  const { register, control, formState } = form;
  const { errors } = formState;
  const controlado = useWatch({ control, name: 'controlado' });
  const erroDe = (campo: keyof ValoresMedicamento) => errors[campo]?.message as string | undefined;

  return (
    <form onSubmit={enviar} noValidate className="space-y-5 pb-2">
      <ResumoErros erros={resumo} tentativa={tentativa} />
      {duplicado && (
        <p
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-[14px] text-danger"
        >
          <AlertTriangle size={17} aria-hidden className="shrink-0" />
          <span className="flex-1">{f.duplicado}</span>
          <Link
            to={`/farmacia/medicamentos/${duplicado}`}
            className="rounded font-semibold underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {f.abrirExistente}
          </Link>
        </p>
      )}

      <SecaoFormulario titulo={f.secoes.identificacao} colunas={2}>
        <Campo rotulo={c.nome} nome="nome" obrigatorio dica={f.dicas.nome} erro={erroDe('nome')}>
          <Input {...register('nome')} maxLength={120} />
        </Campo>
        <Campo rotulo={c.nomeComercial} nome="nomeComercial" erro={erroDe('nomeComercial')}>
          <Input {...register('nomeComercial')} maxLength={120} />
        </Campo>
        <Campo
          rotulo={c.principioAtivo}
          nome="principioAtivo"
          obrigatorio
          dica={f.dicas.principioAtivo}
          erro={erroDe('principioAtivo')}
        >
          <Input {...register('principioAtivo')} maxLength={120} />
        </Campo>
        <Campo rotulo={c.classe} nome="classe" dica={f.dicas.classe} erro={erroDe('classe')}>
          <Input {...register('classe')} maxLength={80} />
        </Campo>
      </SecaoFormulario>

      <SecaoFormulario titulo={f.secoes.apresentacao} colunas={2}>
        <Campo
          rotulo={c.concentracao}
          nome="concentracao"
          obrigatorio
          dica={f.dicas.concentracao}
          erro={erroDe('concentracao')}
        >
          <Input {...register('concentracao')} maxLength={40} />
        </Campo>
        <Campo rotulo={c.forma} nome="forma" obrigatorio erro={erroDe('forma')}>
          <Select
            {...register('forma')}
            opcoes={FORMAS.map((x) => ({ valor: x, rotulo: tf.formas[x] }))}
          />
        </Campo>
        <Campo rotulo={c.unidade} nome="unidade" obrigatorio erro={erroDe('unidade')}>
          {travado ? (
            <Input readOnly value={inicial.unidade ? tf.unidades[inicial.unidade](2) : ''} />
          ) : (
            <Select
              {...register('unidade')}
              opcoes={UNIDADES.map((x) => ({ valor: x, rotulo: tf.unidades[x](2) }))}
            />
          )}
        </Campo>
        <Campo
          rotulo={c.unidadesPorEmbalagem}
          nome="unidadesPorEmbalagem"
          dica={f.dicas.unidadesPorEmbalagem}
          erro={erroDe('unidadesPorEmbalagem')}
        >
          <Input
            inputMode="numeric"
            autoComplete="off"
            readOnly={travado}
            {...register('unidadesPorEmbalagem')}
          />
        </Campo>
        {travado && (
          <p className="flex items-start gap-2 text-[13px] text-text-muted sm:col-span-2">
            <Lock size={15} aria-hidden className="mt-0.5 shrink-0" />
            {f.travado}
          </p>
        )}
      </SecaoFormulario>

      <SecaoFormulario titulo={f.secoes.controle} colunas={2}>
        <Campo rotulo={c.controlado} nome="controlado" erro={erroDe('controlado')}>
          <Select
            vazia={false}
            {...register('controlado')}
            opcoes={[
              { valor: '', rotulo: f.naoControlado },
              ...LISTAS_CONTROLADO.map((x) => ({ valor: x, rotulo: tf.controlado(x) })),
            ]}
          />
        </Campo>
        <Campo
          rotulo={c.estoqueMinimo}
          nome="estoqueMinimo"
          obrigatorio
          dica={f.dicas.estoqueMinimo}
          erro={erroDe('estoqueMinimo')}
        >
          <Input inputMode="numeric" autoComplete="off" {...register('estoqueMinimo')} />
        </Campo>
        {controlado && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-lg border border-warning/40 px-3 py-2 text-[13.5px] sm:col-span-2"
          >
            <Info size={16} aria-hidden className="mt-0.5 shrink-0 text-warning" />
            {f.avisoControlado}
          </p>
        )}
      </SecaoFormulario>

      <BarraAcoesFormulario>
        <Button variante="contorno" onClick={aoCancelar}>
          {tf.cancelar}
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando ? tf.salvando : f.salvar}
        </Button>
      </BarraAcoesFormulario>
    </form>
  );
}
