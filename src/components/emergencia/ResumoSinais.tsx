import type { SinaisVitais } from '../../types';
import { textoSinais } from './sinais';

/** Sinais registrados, em uma linha (ou "—" quando nenhum foi informado). */
export function ResumoSinais({ sinais }: { sinais: SinaisVitais }) {
  const texto = textoSinais(sinais);
  return <p className="text-[13.5px] tabular-nums">{texto || '—'}</p>;
}
