export interface AbaModulo {
  rotulo: string;
  /** Destino da aba. Pode ter query (`/emergencia?aba=alertas`). */
  para: string;
  /** Número ao lado do rótulo (ex.: alertas em aberto). */
  contador?: number;
}

/** Caminho e parâmetros de busca de um destino como `/emergencia?aba=alertas`. */
function partes(destino: string) {
  const [caminho, busca = ''] = destino.split('?');
  return { caminho, parametros: new URLSearchParams(busca) };
}

/**
 * A aba ativa é a de caminho mais longo que contém o atual (`/leitos/internacoes/42` ativa
 * "Internações", não "Mapa"); entre as de mesmo caminho, vence a que tem mais parâmetros
 * presentes na URL. Assim `/emergencia?aba=alertas` ativa "Alertas", e `/emergencia`, "Fila".
 */
export function abaAtiva(abas: readonly AbaModulo[], caminho: string, busca: string): number {
  const atual = new URLSearchParams(busca);
  let melhor = -1;
  let pontos = [-1, -1];
  abas.forEach((aba, i) => {
    const { caminho: c, parametros } = partes(aba.para);
    const contem = caminho === c || caminho.startsWith(`${c}/`);
    const todos = [...parametros].every(([k, v]) => atual.get(k) === v);
    if (!contem || !todos) return;
    const p = [c.length, [...parametros].length];
    if (p[0] > pontos[0] || (p[0] === pontos[0] && p[1] > pontos[1])) {
      melhor = i;
      pontos = p;
    }
  });
  return melhor;
}
