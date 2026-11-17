/**
 * Fase 26 — Os mesmos nomes que os serviços do navegador usam (`repoLeitos`, `transacao`,
 * `executar`, `registrarAtividade`), agora sobre a unidade de trabalho da transação atual
 * (`unidade.ts`). Assim o código das regras é o mesmo do navegador, linha a linha.
 */
import type {
  Atendimento,
  Atividade,
  Consulta,
  Dispensacao,
  Internacao,
  Leito,
  Lote,
  Medicamento,
  Medico,
  Movimentacao,
  Paciente,
  ResumoMensal,
  SolicitacaoLeito,
  TipoAtividade,
} from '@medicore/dominio/types';
import { autoria, autorIdAtual } from '@medicore/dominio/utils/autor';
import { gerarId } from '@medicore/dominio/utils/id';
import { agora } from '@medicore/dominio/utils/relogio';
import { unidadeAtual, type NomeRepo, type RepoMemoria } from './unidade';

export type Repositorio<T extends { id: string }> = Pick<
  RepoMemoria<T>,
  'todos' | 'obter' | 'inserir' | 'atualizar' | 'remover' | 'substituirTodos' | 'onde'
> & { readonly nome: string };

function repo<T extends { id: string }>(nome: NomeRepo): Repositorio<T> {
  const r = () => unidadeAtual().repo<T>(nome);
  return {
    nome,
    todos: () => r().todos(),
    obter: (id) => r().obter(id),
    inserir: (item) => r().inserir(item),
    atualizar: (id, mudancas) => r().atualizar(id, mudancas),
    remover: (id) => r().remover(id),
    substituirTodos: (lista) => r().substituirTodos(lista),
    onde: (chave, condicao, filtro) => r().onde(chave, condicao, filtro),
  };
}

export const repoPacientes = repo<Paciente>('pacientes');
export const repoMedicos = repo<Medico>('medicos');
export const repoConsultas = repo<Consulta>('consultas');
export const repoAtividades = repo<Atividade>('atividades');
export const repoLeitos = repo<Leito>('leitos');
export const repoInternacoes = repo<Internacao>('internacoes');
export const repoSolicitacoes = repo<SolicitacaoLeito>('solicitacoes');
export const repoAtendimentos = repo<Atendimento>('atendimentos');
export const repoMedicamentos = repo<Medicamento>('medicamentos');
export const repoLotes = repo<Lote>('lotes');
export const repoMovimentacoes = repo<Movimentacao>('movimentacoes');
export const repoDispensacoes = repo<Dispensacao>('dispensacoes');
export const repoResumos = repo<ResumoMensal>('resumos');

/**
 * No navegador, `executar` simulava a latência e devolvia cópias, e `transacao` juntava as
 * gravações. Aqui a operação inteira já roda numa transação do banco (`ler`/`gravar`), e a
 * resposta é serializada: os dois só chamam a operação.
 */
export const executar = <T>(operacao: () => T): T => operacao();
export const transacao = <T>(operacao: () => T): T => operacao();

/**
 * R-X6: a atividade é gravada na mesma transação da operação. O limite de 200 do navegador (D15)
 * não existe no banco.
 */
export function registrarAtividade(
  tipo: TipoAtividade,
  descricao: string,
  referenciaId?: string,
): Atividade {
  return repoAtividades.inserir({
    id: gerarId(),
    tipo,
    descricao,
    em: agora().toISOString(),
    ...(referenciaId ? { referenciaId } : {}),
    // Fase 28 (D31): com login, quem fez.
    ...(autorIdAtual() ? autoria() : {}),
  });
}
