/**
 * A11 — leitos compatíveis e leito sugerido (R-L2, R-L5, R-L6).
 */
import type {
  Leito,
  LeitoAvaliado,
  MotivoIncompatibilidade,
  PerfilLeito,
  Precaucao,
  SetorId,
} from '../types';

/** R-L5: menores de 18 anos ocupam leito pediátrico. */
export const perfilDoPaciente = (idade: number): PerfilLeito =>
  idade < 18 ? 'pediatrico' : 'adulto';

export interface CriterioLeito {
  perfil: PerfilLeito;
  precaucao: Precaucao;
  setorDesejado?: SetorId;
  /** Leito reservado para esta solicitação também serve (R-L2). */
  solicitacaoId?: string;
}

export function motivosIncompatibilidade(
  leito: Leito,
  c: CriterioLeito,
): MotivoIncompatibilidade[] {
  const motivos: MotivoIncompatibilidade[] = [];
  const livre =
    leito.status === 'livre' ||
    (leito.status === 'reservado' && !!c.solicitacaoId && leito.solicitacaoId === c.solicitacaoId);
  if (!livre) motivos.push('situacao');
  if (leito.perfil !== c.perfil) motivos.push('perfil');
  if (c.precaucao !== 'padrao' && !leito.isolamento) motivos.push('isolamento');
  if (c.setorDesejado && leito.setorId !== c.setorDesejado) motivos.push('setor');
  return motivos;
}

/**
 * Avalia todos os leitos e marca o sugerido: o primeiro compatível na ordem
 * 1. reservado para a mesma solicitação; 2. setor desejado; 3. sem isolamento quando a
 * precaução é padrão (guarda os de isolamento); 4. quarto com o outro leito livre; 5. código.
 * Ordem do resultado: sugerido, compatíveis e incompatíveis (cada grupo por código).
 */
export function avaliarLeitos(leitos: readonly Leito[], c: CriterioLeito): LeitoAvaliado[] {
  const livresPorQuarto = new Map<string, number>();
  for (const l of leitos) {
    if (l.quarto && l.status === 'livre') {
      const chave = `${l.setorId}:${l.quarto}`;
      livresPorQuarto.set(chave, (livresPorQuarto.get(chave) ?? 0) + 1);
    }
  }
  const outroLivreNoQuarto = (l: Leito) =>
    !!l.quarto &&
    (livresPorQuarto.get(`${l.setorId}:${l.quarto}`) ?? 0) > (l.status === 'livre' ? 1 : 0);

  const avaliados = leitos.map((leito) => {
    const motivos = motivosIncompatibilidade(leito, c);
    return { leito, compativel: motivos.length === 0, motivos, sugerido: false };
  });

  const pontos = (l: Leito) =>
    [
      l.status === 'reservado' ? 0 : 1,
      c.setorDesejado && l.setorId === c.setorDesejado ? 0 : 1,
      c.precaucao === 'padrao' && l.isolamento ? 1 : 0,
      outroLivreNoQuarto(l) ? 0 : 1,
    ] as const;
  const comparar = (a: Leito, b: Leito) => {
    const pa = pontos(a);
    const pb = pontos(b);
    for (let i = 0; i < pa.length; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
    return a.codigo.localeCompare(b.codigo);
  };

  const compativeis = avaliados
    .filter((a) => a.compativel)
    .sort((a, b) => comparar(a.leito, b.leito));
  if (compativeis[0]) compativeis[0].sugerido = true;
  const [sugerido, ...resto] = compativeis;
  const porCodigo = (a: LeitoAvaliado, b: LeitoAvaliado) =>
    a.leito.codigo.localeCompare(b.leito.codigo);
  return [
    ...(sugerido ? [sugerido] : []),
    ...resto.sort(porCodigo),
    ...avaliados.filter((a) => !a.compativel).sort(porCodigo),
  ];
}
