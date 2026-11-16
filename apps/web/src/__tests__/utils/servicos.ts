import { repoAtividades, repoConsultas, repoMedicos, repoPacientes } from '../../services/colecoes';
import { resetar } from '../../services/repositorio';

/** Relógio fixo + armazenamento limpo (os dados de exemplo são semeados no 1º acesso). */
export function prepararServicos(instante: string) {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(instante));
    resetar();
    // Semeia já, com o relógio fixo: os dados de exemplo ocupam de -7 a +7 dias.
    for (const repo of [repoPacientes, repoMedicos, repoConsultas, repoAtividades]) repo.todos();
  });
  afterEach(() => vi.useRealTimers());
}

export const ajustarRelogio = (instante: string) => vi.setSystemTime(new Date(instante));

/** Devolve o erro lançado pela promessa (falha o teste se ela não lançar). */
export async function erroDe(promessa: Promise<unknown>): Promise<Error & Record<string, unknown>> {
  try {
    await promessa;
  } catch (e) {
    return e as Error & Record<string, unknown>;
  }
  throw new Error('A operação deveria ter falhado');
}
