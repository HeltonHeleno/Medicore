/**
 * Coleções dos módulos operacionais (Fase 15). Ficam fora de `colecoes.ts` para não entrar
 * no pacote inicial: só os serviços dos módulos (carregados com as páginas) as importam.
 *
 * As 9 coleções são semeadas a partir da MESMA geração (`gerarDadosOperacionais`), feita uma
 * vez e guardada em memória até o próximo `resetar()`: assim nascem coerentes entre si (A16).
 */
import { gerarDadosOperacionais, type DadosOperacionais } from '../data/seeds/operacoes';
import type {
  Atendimento,
  Dispensacao,
  Internacao,
  Leito,
  Lote,
  Medicamento,
  Movimentacao,
  ResumoMensal,
  SolicitacaoLeito,
} from '../types';
import type { RetratoOperacoes } from '../utils/consistencia';
import { agora } from '../utils/relogio';
import { repoConsultas, repoMedicos, repoPacientes } from './colecoes';
import { aoResetar, criarRepositorio } from './repositorio';

let cache: DadosOperacionais | null = null;
aoResetar(() => {
  cache = null;
});

function dados(): DadosOperacionais {
  if (!cache) {
    cache = gerarDadosOperacionais({
      pacientes: repoPacientes.todos(),
      medicos: repoMedicos.todos(),
      agora: agora(),
    });
  }
  return cache;
}

/** Cópia profunda: a semente não pode compartilhar objetos com o que foi gravado. */
const copia = <T>(lista: T[]): T[] => structuredClone(lista);

export const repoLeitos = criarRepositorio<Leito>('leitos', () => copia(dados().leitos));
export const repoInternacoes = criarRepositorio<Internacao>('internacoes', () =>
  copia(dados().internacoes),
);
export const repoSolicitacoes = criarRepositorio<SolicitacaoLeito>('solicitacoes_leito', () =>
  copia(dados().solicitacoes),
);
export const repoAtendimentos = criarRepositorio<Atendimento>('atendimentos', () =>
  copia(dados().atendimentos),
);
export const repoMedicamentos = criarRepositorio<Medicamento>('medicamentos', () =>
  copia(dados().medicamentos),
);
export const repoLotes = criarRepositorio<Lote>('lotes', () => copia(dados().lotes));
export const repoMovimentacoes = criarRepositorio<Movimentacao>('movimentacoes', () =>
  copia(dados().movimentacoes),
);
export const repoDispensacoes = criarRepositorio<Dispensacao>('dispensacoes', () =>
  copia(dados().dispensacoes),
);
export const repoResumos = criarRepositorio<ResumoMensal>('resumos_mensais', () =>
  copia(dados().resumos),
);

export const REPOS_OPERACOES = [
  repoLeitos,
  repoInternacoes,
  repoSolicitacoes,
  repoAtendimentos,
  repoMedicamentos,
  repoLotes,
  repoMovimentacoes,
  repoDispensacoes,
  repoResumos,
] as const;

/** Nomes das coleções (para `useColecao` saber quando recarregar). */
export const COLECOES = {
  leitos: [
    repoLeitos.nome,
    repoInternacoes.nome,
    repoSolicitacoes.nome,
    repoAtendimentos.nome,
    repoPacientes.nome,
  ],
  emergencia: [repoAtendimentos.nome, repoSolicitacoes.nome, repoLeitos.nome, repoPacientes.nome],
  farmacia: [repoMedicamentos.nome, repoLotes.nome, repoMovimentacoes.nome, repoDispensacoes.nome],
} as const;

/** Semeia (se preciso) todas as coleções de uma vez, na mesma geração. */
export function garantirSemeadura(): void {
  for (const repo of REPOS_OPERACOES) repo.todos();
}

/** Retrato atual para a verificação de consistência (A17). */
export function retratoAtual(): RetratoOperacoes {
  return {
    leitos: repoLeitos.todos(),
    internacoes: repoInternacoes.todos(),
    solicitacoes: repoSolicitacoes.todos(),
    atendimentos: repoAtendimentos.todos(),
    lotes: repoLotes.todos(),
    movimentacoes: repoMovimentacoes.todos(),
    dispensacoes: repoDispensacoes.todos(),
    pacientes: repoPacientes.todos(),
    consultas: repoConsultas.todos(),
  };
}
