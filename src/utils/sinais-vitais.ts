/**
 * D18 / R-E5: sinalização dos sinais vitais pela faixa etária.
 * É só um destaque visual, nunca um diagnóstico nem uma sugestão de cor (D8).
 */
import {
  FAIXAS_ALERTA,
  FAIXAS_VALIDAS,
  SINALIZACAO_PEDIATRICA_ATIVA,
  TEMPERATURA_ALERTA,
  type FaixaEtaria,
} from '../config/sinais-vitais';
import { te } from '../i18n/pt-BR/emergencia';
import type { AlertaSinal, SinaisVitais } from '../types';

const numero = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const comUnidade = (n: number, campo: keyof typeof FAIXAS_VALIDAS) => {
  const u = FAIXAS_VALIDAS[campo].unidade;
  return u === '%' ? `${numero(n)}%` : `${numero(n)} ${u}`;
};

/**
 * Faixa etária para os alertas. Sem idade (provisório sem idade aproximada), vale a de
 * adulto. Com a sinalização pediátrica desligada, menores de 12 também usam a de adulto.
 */
export function faixaEtaria(idade: number | null | undefined): FaixaEtaria {
  if (idade === null || idade === undefined || !SINALIZACAO_PEDIATRICA_ATIVA) return 'adulto';
  if (idade < 1) return 'menor_1';
  if (idade <= 5) return 'de_1_a_5';
  if (idade <= 11) return 'de_6_a_11';
  return 'adulto';
}

export interface AvaliacaoSinais {
  alertas: AlertaSinal[];
  /** Sem idade conhecida (ou sinalização pediátrica desligada para uma criança). */
  usandoFaixaAdulto: boolean;
}

/** PAS mínima da faixa (nas crianças de 1 a 11 anos: 70 + 2 × idade). */
export function pasMinima(faixa: FaixaEtaria, idade: number | null | undefined): number {
  const limite = FAIXAS_ALERTA[faixa].pasMin;
  return limite === 'pediatrica' ? 70 + 2 * Math.floor(idade ?? 0) : limite;
}

export function avaliarSinais(
  sinais: SinaisVitais,
  idade: number | null | undefined,
): AvaliacaoSinais {
  const faixa = faixaEtaria(idade);
  const f = FAIXAS_ALERTA[faixa];
  const alertas: AlertaSinal[] = [];
  const a = te.alertaSinal;

  if (sinais.fc !== undefined) {
    if (sinais.fc < f.fc.min)
      alertas.push({ campo: 'fc', texto: a.abaixo(comUnidade(f.fc.min, 'fc')) });
    else if (sinais.fc > f.fc.max)
      alertas.push({ campo: 'fc', texto: a.acima(comUnidade(f.fc.max, 'fc')) });
  }
  if (sinais.fr !== undefined && sinais.fr > f.frMax) {
    alertas.push({ campo: 'fr', texto: a.acima(comUnidade(f.frMax, 'fr')) });
  }
  if (sinais.pas !== undefined) {
    const min = pasMinima(faixa, idade);
    if (sinais.pas < min) alertas.push({ campo: 'pas', texto: a.abaixo(comUnidade(min, 'pas')) });
    else if (f.pasMax !== undefined && sinais.pas > f.pasMax)
      alertas.push({ campo: 'pas', texto: a.acima(comUnidade(f.pasMax, 'pas')) });
  }
  if (sinais.spo2 !== undefined && sinais.spo2 < f.spo2Min) {
    alertas.push({ campo: 'spo2', texto: a.abaixo(comUnidade(f.spo2Min, 'spo2')) });
  }
  if (sinais.temperatura !== undefined) {
    if (sinais.temperatura >= TEMPERATURA_ALERTA.max)
      alertas.push({
        campo: 'temperatura',
        texto: a.aPartirDe(comUnidade(TEMPERATURA_ALERTA.max, 'temperatura')),
      });
    else if (sinais.temperatura < TEMPERATURA_ALERTA.min)
      alertas.push({
        campo: 'temperatura',
        texto: a.abaixo(comUnidade(TEMPERATURA_ALERTA.min, 'temperatura')),
      });
  }

  const crianca = idade !== null && idade !== undefined && idade < 12;
  return {
    alertas,
    usandoFaixaAdulto: idade === null || idade === undefined || (crianca && faixa === 'adulto'),
  };
}

/** Algum sinal piorou para a faixa de alerta em relação aos anteriores? (E10: sugerir retriagem). */
export function pioraParaAlerta(
  anteriores: SinaisVitais | undefined,
  novos: SinaisVitais,
  idade: number | null | undefined,
): boolean {
  const antes = new Set(
    anteriores ? avaliarSinais(anteriores, idade).alertas.map((x) => x.campo) : [],
  );
  return avaliarSinais(novos, idade).alertas.some((x) => !antes.has(x.campo));
}
