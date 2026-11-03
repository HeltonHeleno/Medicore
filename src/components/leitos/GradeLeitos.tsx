import { Sparkles } from 'lucide-react';
import { SETORES } from '../../config/setores';
import { tl } from '../../i18n/pt-BR/leitos';
import type { LeitoDetalhado, SetorId } from '../../types';
import { Button } from '../ui/Button';
import type { AcaoLeito } from './acoes-leito';
import { CartaoLeito } from './CartaoLeito';

interface GradeLeitosProps {
  leitos: readonly LeitoDetalhado[];
  /** Ocupação do setor inteiro (independe dos filtros), por setor. */
  ocupacao: Partial<Record<SetorId, { ocupados: number; operacionais: number }>>;
  destacados?: ReadonlySet<string>;
  aoAcao: (acao: AcaoLeito, leito: LeitoDetalhado) => void;
  aoConcluirSetor: (setorNome: string, leitos: LeitoDetalhado[]) => void;
}

const GRADE =
  'grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5';

/** Agrupa os leitos da enfermaria por quarto (leitos do mesmo quarto lado a lado). */
function porQuarto(leitos: LeitoDetalhado[]) {
  const grupos = new Map<string, LeitoDetalhado[]>();
  for (const l of leitos) {
    const q = l.quarto ?? '';
    grupos.set(q, [...(grupos.get(q) ?? []), l]);
  }
  return [...grupos.entries()];
}

/**
 * Grade do mapa: uma `section` com título por setor; cada leito é um link (não há grade
 * com setas), e a ordem de Tab segue a ordem visual. Abaixo de 420px vira uma lista.
 */
export function GradeLeitos({
  leitos,
  ocupacao,
  destacados,
  aoAcao,
  aoConcluirSetor,
}: GradeLeitosProps) {
  return (
    <div className="space-y-6">
      {SETORES.map((setor) => {
        const doSetor = leitos.filter((l) => l.setorId === setor.id);
        if (doSetor.length === 0) return null;
        const higienizando = doSetor.filter((l) => l.status === 'higienizacao');
        const o = ocupacao[setor.id] ?? {
          ocupados: doSetor.filter((l) => l.status === 'ocupado').length,
          operacionais: doSetor.filter((l) => l.status !== 'bloqueado').length,
        };
        const idTitulo = `setor-${setor.id}`;
        const cartao = (l: LeitoDetalhado) => (
          <li key={l.id}>
            <CartaoLeito leito={l} aoAcao={aoAcao} destacado={destacados?.has(l.id)} />
          </li>
        );
        return (
          <section key={setor.id} aria-labelledby={idTitulo}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id={idTitulo} className="text-[16px] font-semibold">
                {tl.mapa.setorTitulo(setor.nome, o.ocupados, o.operacionais)}
              </h2>
              {higienizando.length > 1 && (
                <Button
                  tamanho="sm"
                  variante="contorno"
                  iconeEsquerda={<Sparkles size={15} />}
                  onClick={() => aoConcluirSetor(setor.nome, higienizando)}
                >
                  {tl.mapa.concluirSetor(higienizando.length)}
                </Button>
              )}
            </div>
            {setor.id === 'enfermaria' ? (
              <div className="grid gap-x-4 gap-y-3 md:grid-cols-2 2xl:grid-cols-3">
                {porQuarto(doSetor).map(([quarto, doQuarto]) => (
                  <div key={quarto} role="group" aria-label={tl.quarto(quarto)}>
                    <p aria-hidden className="mb-1.5 text-[12.5px] font-medium text-text-muted">
                      {tl.quarto(quarto)}
                    </p>
                    <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                      {doQuarto.map(cartao)}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <ul className={GRADE}>{doSetor.map(cartao)}</ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
