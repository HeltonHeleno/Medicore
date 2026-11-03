import { useEffect, useState } from 'react';
import { dataDoInstante } from '../utils/datas';
import { agora } from '../utils/relogio';

export interface Relogio {
  /** Instante atual (atualizado a cada tique). */
  agora: Date;
  /** "Hoje" no fuso do hospital: muda sozinho na virada da meia-noite. */
  hoje: string;
}

/**
 * Tique periódico para os tempos que mudam sozinhos ("há 12 min", prazos, validades).
 * Os valores exibidos são sempre `agora − instante gravado`, nunca contadores acumulados,
 * então continuam certos mesmo com a aba em segundo plano (RS-14). Não anuncia nada
 * ao leitor de tela: quem usa decide o que é relevante.
 */
export function useRelogio(intervaloMs = 30_000): Relogio {
  const [instante, setInstante] = useState(() => agora());
  useEffect(() => {
    const id = setInterval(() => setInstante(agora()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return { agora: instante, hoje: dataDoInstante(instante) };
}
