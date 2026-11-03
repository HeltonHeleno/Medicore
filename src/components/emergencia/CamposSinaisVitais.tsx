import { TriangleAlert } from 'lucide-react';
import { FAIXA_PESO, FAIXAS_VALIDAS } from '../../config/sinais-vitais';
import { t } from '../../i18n/pt-BR';
import { te } from '../../i18n/pt-BR/emergencia';
import { avaliarSinais } from '../../utils/sinais-vitais';
import { Campo } from '../ui/form/Campo';
import type { CampoSinal } from '../../types';
import { Input } from '../ui/form/Input';
import {
  CAMPOS_SINAIS,
  lerNumero,
  paraSinais,
  type CampoSinalOuPeso,
  type ValoresSinais,
} from './sinais';

const numero = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

interface CamposSinaisVitaisProps {
  valores: ValoresSinais;
  aoMudar: (campo: CampoSinalOuPeso, texto: string) => void;
  /** Erros vindos do esquema (têm prioridade sobre a conferência local da faixa válida). */
  erros?: Partial<Record<CampoSinalOuPeso, string>>;
  /** Idade (ou idade aproximada) para a faixa de alerta (D18); sem ela, vale a de adulto. */
  idade: number | null | undefined;
  mostrarPeso?: boolean;
  /** Prefixo dos nomes no formulário (`sinais.pas`), para o `ResumoErros` levar ao campo. */
  prefixo?: string;
}

/**
 * Sinais vitais da triagem e da reavaliação (E2, E10). Cada campo tem o rótulo com a
 * unidade e a faixa válida na dica (R-E5). A sinalização por faixa etária (D18) aparece
 * como **texto** ("Atenção: abaixo de 92%") ligado ao campo, sem ser erro e sem sugerir cor.
 */
export function CamposSinaisVitais({
  valores,
  aoMudar,
  erros = {},
  idade,
  mostrarPeso,
  prefixo = 'sinais',
}: CamposSinaisVitaisProps) {
  const avaliacao = avaliarSinais(paraSinais(valores), idade);
  const alertaDe = (c: CampoSinal) => avaliacao.alertas.find((a) => a.campo === c)?.texto;
  const algumValor = CAMPOS_SINAIS.some((c) => lerNumero(valores[c]) !== undefined);

  /** Fora da faixa possível: erro do campo (mesma mensagem do esquema). */
  function erroLocal(campo: CampoSinalOuPeso): string | undefined {
    const n = lerNumero(valores[campo]);
    if (n === undefined) {
      return valores[campo]?.trim() ? t.validacao.numeroInvalido : undefined;
    }
    const f = campo === 'pesoKg' ? { ...FAIXA_PESO, unidade: 'kg' } : FAIXAS_VALIDAS[campo];
    return n < f.min || n > f.max ? t.validacao.foraDaFaixa(f.min, f.max, f.unidade) : undefined;
  }

  const campos: CampoSinalOuPeso[] = mostrarPeso
    ? [...CAMPOS_SINAIS, 'pesoKg']
    : [...CAMPOS_SINAIS];

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-1 text-[14px] font-semibold">{te.sinaisVitais}</legend>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {campos.map((campo) => {
          const f = campo === 'pesoKg' ? { ...FAIXA_PESO, unidade: 'kg' } : FAIXAS_VALIDAS[campo];
          const erro = erros[campo] ?? erroLocal(campo);
          const alerta = campo === 'pesoKg' || erro ? undefined : alertaDe(campo);
          return (
            <Campo
              key={campo}
              nome={`${prefixo}.${campo}`}
              rotulo={campo === 'pesoKg' ? te.pesoOpcional : te.sinais[campo]}
              erro={erro}
              dica={
                <>
                  {te.faixaValida(numero(f.min), numero(f.max), f.unidade)}
                  {alerta && (
                    <span className="mt-0.5 flex items-start gap-1 font-semibold text-warning">
                      <TriangleAlert size={13} aria-hidden className="mt-px shrink-0" />
                      {alerta}
                    </span>
                  )}
                </>
              }
            >
              <Input
                inputMode="decimal"
                autoComplete="off"
                value={valores[campo] ?? ''}
                onChange={(e) => aoMudar(campo, e.target.value)}
              />
            </Campo>
          );
        })}
      </div>
      <p className="text-[12.5px] text-text-muted">
        {avaliacao.usandoFaixaAdulto && algumValor && (
          <span className="mr-1 font-medium text-warning">{te.alertaSinal.faixaAdulto}.</span>
        )}
        {te.sinalizacaoNaoDiagnostico}
      </p>
    </fieldset>
  );
}
