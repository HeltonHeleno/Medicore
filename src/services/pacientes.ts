/**
 * Serviço de pacientes (processos P1–P5).
 * As funções públicas são assíncronas (imitam uma API); a lógica fica em funções
 * síncronas para rodar inteira dentro de `transacao`.
 */
import { POR_PAGINA } from '../config/limites';
import { t } from '../i18n/pt-BR';
import { esquemaPaciente, type DadosPaciente, type EntradaPaciente } from '../schemas/paciente';
import type {
  Consulta,
  FiltrosPacientes,
  Paciente,
  PacienteResumo,
  Paginado,
  StatusFiltro,
} from '../types';
import { filtrarPorTermo, ordenar, paginar } from '../utils/busca';
import { idade } from '../utils/datas';
import { gerarId } from '../utils/id';
import { ocultarCpf } from '../utils/mascaras';
import { agora } from '../utils/relogio';
import { registrarAtividade } from './atividades';
import { repoConsultas, repoPacientes } from './colecoes';
import { ErroConcorrencia, ErroConflito, ErroNaoEncontrado, ErroValidacao } from './erros';
import { executar } from './infra';
import { transacao } from './repositorio';

/** R-P6: nome social, quando houver, é o nome exibido. */
export const nomeExibicaoPaciente = (p: Pick<Paciente, 'nome' | 'nomeSocial'>) =>
  p.nomeSocial || p.nome;

export const filtrarStatus = <T extends { ativo: boolean }>(
  itens: readonly T[],
  status: StatusFiltro,
) => (status === 'todos' ? [...itens] : itens.filter((i) => i.ativo === (status === 'ativos')));

/** Consultas agendadas que ainda não começaram. */
export const consultasFuturasAgendadas = (filtro: (c: Consulta) => boolean): Consulta[] => {
  const momento = agora().getTime();
  return repoConsultas
    .todos()
    .filter((c) => c.status === 'agendada' && new Date(c.inicio).getTime() >= momento && filtro(c))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
};

function resumir(p: Paciente, proximas: Map<string, string>): PacienteResumo {
  return {
    id: p.id,
    nomeExibicao: nomeExibicaoPaciente(p),
    cpfMascarado: ocultarCpf(p.cpf),
    idade: idade(p.dataNascimento),
    telefone: p.telefone,
    convenioNome: p.convenio.tipo === 'convenio' ? p.convenio.nome : t.convenio.particular,
    temAlergias: Boolean(p.alergias),
    proximaConsulta: proximas.get(p.id),
    ativo: p.ativo,
  };
}

function obterOuFalhar(id: string): Paciente {
  const p = repoPacientes.obter(id);
  if (!p) throw new ErroNaoEncontrado(t.erros.pacienteNaoEncontrado);
  return p;
}

function validar(entrada: EntradaPaciente): DadosPaciente {
  const r = esquemaPaciente.safeParse(entrada);
  if (!r.success) throw ErroValidacao.deZod(r.error);
  return r.data;
}

function garantirCpfUnico(cpf: string, ignorarId?: string) {
  const existente = repoPacientes.todos().find((p) => p.cpf === cpf && p.id !== ignorarId);
  if (existente) {
    throw new ErroConflito('cpf_duplicado', t.erros.cpfDuplicado, {
      campo: 'cpf',
      detalhes: { id: existente.id },
    });
  }
}

/** Campos opcionais: na edição, o que veio vazio precisa apagar o valor anterior. */
const OPCIONAIS = {
  nomeSocial: undefined,
  email: undefined,
  endereco: undefined,
  responsavel: undefined,
  tipoSanguineo: undefined,
  alergias: undefined,
  contatoEmergencia: undefined,
  observacoes: undefined,
} satisfies Partial<Record<keyof Paciente, undefined>>;

/** O consentimento vira `{ aceito, em }` no serviço; o `true` do formulário não é gravado. */
function semConsentimento(dados: DadosPaciente): Omit<DadosPaciente, 'consentimentoLgpd'> {
  const resto: Partial<DadosPaciente> = { ...dados };
  delete resto.consentimentoLgpd;
  return resto as Omit<DadosPaciente, 'consentimentoLgpd'>;
}

// ───────────────────────── leitura ─────────────────────────

/** R-G3: por padrão, só ativos. Busca por nome, nome social, CPF ou telefone (A4). */
export const listarPacientes = (
  filtros: FiltrosPacientes = {},
): Promise<Paginado<PacienteResumo>> =>
  executar(() => {
    const proximas = new Map<string, string>();
    for (const c of consultasFuturasAgendadas(() => true)) {
      if (!proximas.has(c.pacienteId)) proximas.set(c.pacienteId, c.inicio);
    }

    const base = filtrarStatus(repoPacientes.todos(), filtros.status ?? 'ativos');
    const achados = filtrarPorTermo(base, filtros.busca, {
      textos: (p) => [p.nome, p.nomeSocial],
      digitos: (p) => [p.cpf, p.telefone],
    }).map((p) => resumir(p, proximas));

    const chave = {
      nome: (r: PacienteResumo) => r.nomeExibicao,
      idade: (r: PacienteResumo) => r.idade,
      proximaConsulta: (r: PacienteResumo) => r.proximaConsulta,
    }[filtros.ordenarPor ?? 'nome'];

    return paginar(
      ordenar(achados, chave, filtros.ordem),
      filtros.pagina,
      filtros.porPagina ?? POR_PAGINA,
    );
  });

export const obterPaciente = (id: string): Promise<Paciente> => executar(() => obterOuFalhar(id));

/** Para a validação do formulário enquanto o usuário digita (R-P1). */
export const cpfDisponivel = (cpf: string, ignorarId?: string): Promise<boolean> =>
  executar(() => !repoPacientes.todos().some((p) => p.cpf === cpf && p.id !== ignorarId));

/** Cadastro que já usa este CPF (para o link "Abrir cadastro existente"), ou `null`. */
export const pacienteComCpf = (
  cpf: string,
  ignorarId?: string,
): Promise<{ id: string; nomeExibicao: string } | null> =>
  executar(() => {
    const p = repoPacientes.todos().find((x) => x.cpf === cpf && x.id !== ignorarId);
    return p ? { id: p.id, nomeExibicao: nomeExibicaoPaciente(p) } : null;
  });

/** O paciente já teve alguma consulta? (R-P3: só sem consultas pode ser excluído). */
export const pacienteTemConsultas = (id: string): Promise<boolean> =>
  executar(() => repoConsultas.todos().some((c) => c.pacienteId === id));

/** Quantas consultas seriam canceladas ao inativar (texto do diálogo de confirmação). */
export const consultasFuturasDoPaciente = (id: string): Promise<Consulta[]> =>
  executar(() => consultasFuturasAgendadas((c) => c.pacienteId === id));

// ───────────────────────── escrita ─────────────────────────

/** P1 */
export const criarPaciente = (entrada: EntradaPaciente): Promise<Paciente> =>
  executar(() => {
    const dados = validar(entrada);
    return transacao(() => {
      garantirCpfUnico(dados.cpf);
      const momento = agora().toISOString();
      const paciente = repoPacientes.inserir({
        ...semConsentimento(dados),
        id: gerarId(),
        criadoEm: momento,
        atualizadoEm: momento,
        versao: 1,
        ativo: true,
        consentimentoLgpd: { aceito: true, em: momento },
      });
      registrarAtividade(
        'paciente_cadastrado',
        t.textosAtividade.pacienteCadastrado(nomeExibicaoPaciente(paciente)),
        paciente.id,
      );
      return paciente;
    });
  });

/** P2 — `versao` é a que a tela carregou (R-G1). */
export const atualizarPaciente = (
  id: string,
  entrada: EntradaPaciente,
  versao: number,
): Promise<Paciente> =>
  executar(() => {
    const dados = validar(entrada);
    return transacao(() => {
      const atual = obterOuFalhar(id);
      if (atual.versao !== versao) throw new ErroConcorrencia();
      garantirCpfUnico(dados.cpf, id);
      return repoPacientes.atualizar(id, { ...OPCIONAIS, ...semConsentimento(dados) });
    });
  });

/**
 * P3 / R-P2: inativa e cancela, na mesma transação, as consultas futuras agendadas.
 * Devolve quantas consultas foram canceladas.
 */
export const inativarPaciente = (id: string, motivo?: string): Promise<number> =>
  executar(() =>
    transacao(() => {
      const paciente = obterOuFalhar(id);
      if (!paciente.ativo) return 0;
      const momento = agora().toISOString();
      const futuras = consultasFuturasAgendadas((c) => c.pacienteId === id);
      const motivoCancelamento = t.conflitos.motivoPacienteInativado;
      for (const c of futuras) {
        repoConsultas.atualizar(c.id, {
          status: 'cancelada',
          motivoCancelamento,
          eventos: [...c.eventos, { tipo: 'cancelada', em: momento, detalhe: motivoCancelamento }],
        });
      }
      repoPacientes.atualizar(id, {
        ativo: false,
        inativadoEm: momento,
        motivoInativacao: motivo?.trim() || undefined,
      });
      registrarAtividade(
        'paciente_inativado',
        t.textosAtividade.pacienteInativado(nomeExibicaoPaciente(paciente)),
        id,
      );
      return futuras.length;
    }),
  );

/** P4 */
export const reativarPaciente = (id: string): Promise<Paciente> =>
  executar(() =>
    transacao(() => {
      obterOuFalhar(id);
      return repoPacientes.atualizar(id, {
        ativo: true,
        inativadoEm: undefined,
        motivoInativacao: undefined,
      });
    }),
  );

/** P5 / R-P3: só quem nunca teve consulta pode ser excluído de vez. */
export const excluirPaciente = (id: string): Promise<void> =>
  executar(() =>
    transacao(() => {
      obterOuFalhar(id);
      if (repoConsultas.todos().some((c) => c.pacienteId === id)) {
        throw new ErroConflito('tem_historico', t.conflitos.temHistorico);
      }
      repoPacientes.remover(id);
    }),
  );
