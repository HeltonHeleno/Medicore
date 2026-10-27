import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { DURACOES_PADRAO } from '../../config/limites';
import { t } from '../../i18n/pt-BR';
import { cn } from '../../utils/cn';
import { Campo } from '../ui/form/Campo';
import { Checkbox } from '../ui/form/Checkbox';
import { idDoCampo } from '../ui/form/estilos';
import { Input } from '../ui/form/Input';
import { Select } from '../ui/form/Select';
import { PreviaDisponibilidade } from './PreviaDisponibilidade';
import type { ValoresMedico } from './valoresMedico';

const m = t.medicos;
const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
// Segunda primeiro (como na agenda); domingo no fim.
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  form: UseFormReturn<ValoresMedico, unknown, unknown>;
  erroDe: (caminho: string) => string | undefined;
}

/** Editor da disponibilidade (R-M4): dias alternáveis, expediente, pausa e duração, com prévia. */
export function EditorDisponibilidade({ form, erroDe }: Props) {
  const { control, register, setValue, getValues } = form;
  const valores = useWatch({ control, name: 'disponibilidade' });
  const [temPausa, setTemPausa] = useState(() =>
    Boolean(getValues('disponibilidade.pausa.inicio')),
  );
  const erroDias = erroDe('disponibilidade.diasSemana');
  const idDias = idDoCampo('disponibilidade.diasSemana');

  return (
    <>
      <Controller
        control={control}
        name="disponibilidade.diasSemana"
        render={({ field }) => (
          <fieldset
            ref={(el) => field.ref({ focus: () => el?.focus() })}
            id={idDias}
            tabIndex={-1}
            aria-describedby={erroDias ? `${idDias}-erro` : undefined}
            className="min-w-0 outline-none sm:col-span-full"
          >
            <legend className="mb-2 text-[13.5px] font-medium">
              {m.campos.dias}
              <span aria-hidden className="ml-0.5 text-danger">
                *
              </span>
              <span className="sr-only">{` (${t.formulario.obrigatorio})`}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {ORDEM_DIAS.map((dia) => {
                const ativo = field.value.includes(dia);
                return (
                  <button
                    key={dia}
                    type="button"
                    aria-pressed={ativo}
                    aria-label={NOMES_DIAS[dia]}
                    onClick={() => {
                      field.onChange(
                        ativo
                          ? field.value.filter((d) => d !== dia)
                          : [...field.value, dia].sort((a, b) => a - b),
                      );
                      field.onBlur();
                    }}
                    className={cn(
                      'inline-flex h-10 min-w-14 items-center justify-center rounded-lg border px-3 text-[14px] font-medium transition-colors',
                      'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none',
                      ativo
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-border-input bg-card text-text hover:bg-bg',
                    )}
                  >
                    {t.diasSemanaCurto[dia]}
                  </button>
                );
              })}
            </div>
            {erroDias && (
              <p
                id={`${idDias}-erro`}
                className="mt-1.5 flex items-start gap-1 text-[12.5px] font-medium text-danger"
              >
                <AlertCircle size={14} aria-hidden className="mt-px shrink-0" />
                {erroDias}
              </p>
            )}
          </fieldset>
        )}
      />

      <Campo
        rotulo={m.campos.inicio}
        nome="disponibilidade.inicio"
        obrigatorio
        erro={erroDe('disponibilidade.inicio')}
      >
        <Input type="time" step={300} {...register('disponibilidade.inicio')} />
      </Campo>
      <Campo
        rotulo={m.campos.fim}
        nome="disponibilidade.fim"
        obrigatorio
        erro={erroDe('disponibilidade.fim')}
      >
        <Input type="time" step={300} {...register('disponibilidade.fim')} />
      </Campo>
      <Campo
        rotulo={m.campos.duracao}
        nome="disponibilidade.duracaoPadraoMin"
        obrigatorio
        erro={erroDe('disponibilidade.duracaoPadraoMin')}
      >
        <Select
          vazia={false}
          {...register('disponibilidade.duracaoPadraoMin', { valueAsNumber: true })}
          opcoes={DURACOES_PADRAO.map((n) => ({ valor: String(n), rotulo: m.campos.minutos(n) }))}
        />
      </Campo>

      <Checkbox
        className="self-end sm:col-span-full"
        rotulo={m.campos.temPausa}
        checked={temPausa}
        onChange={(e) => {
          const marcar = e.target.checked;
          setTemPausa(marcar);
          setValue(
            'disponibilidade.pausa',
            marcar ? { inicio: '12:00', fim: '13:00' } : { inicio: '', fim: '' },
            { shouldDirty: true, shouldValidate: form.formState.isSubmitted },
          );
        }}
      />
      {temPausa && (
        <>
          <Campo
            rotulo={m.campos.pausaInicio}
            nome="disponibilidade.pausa.inicio"
            erro={erroDe('disponibilidade.pausa.inicio')}
          >
            <Input type="time" step={300} {...register('disponibilidade.pausa.inicio')} />
          </Campo>
          <Campo
            rotulo={m.campos.pausaFim}
            nome="disponibilidade.pausa.fim"
            erro={erroDe('disponibilidade.pausa.fim')}
          >
            <Input type="time" step={300} {...register('disponibilidade.pausa.fim')} />
          </Campo>
        </>
      )}

      <PreviaDisponibilidade valores={valores} />
    </>
  );
}
