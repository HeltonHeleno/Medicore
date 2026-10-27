/**
 * Serviço de médicos (processos P6–P8).
 */
import { departamentos } from '../data/mock';
import { POR_PAGINA } from '../config/limites';
import { t } from '../i18n/pt-BR';
import { esquemaMedico, type DadosMedico, type EntradaMedico } from '../schemas/medico';
import type {
  Consulta,
  Departamento,
  DiaSemana,
  Disponibilidade,
  FiltrosMedicos,
  Medico,
  MedicoResumo,
  Paginado,
  UF,
} from '../types';
import { consultasForaDaDisponibilidade } from '../utils/agenda';
import { filtrarPorTermo, ordenar, paginar } from '../utils/busca';
import { dataDoInstante, hojeNoFuso } from '../utils/datas';
import { gerarId } from '../utils/id';
import { formatarCrm } from '../utils/mascaras';
import { agora } from '../utils/relogio';
import { registrarAtividade } from './atividades';
import { repoConsultas, repoMedicos } from './colecoes';
import { ErroConcorrencia, ErroConflito, ErroNaoEncontrado, ErroValidacao } from './erros';
import { executar } from './infra';
import { consultasFuturasAgendadas, filtrarStatus } from './pacientes';
import { transacao } from './repositorio';

export const nomeExibicaoMedico = (m: Pick<Medico, 'tratamento' | 'nome'>) =>
  `${m.tratamento} ${m.nome}`;

export const nomeDepartamento = (id: string) => departamentos.find((d) => d.id === id)?.nome ?? id;

export const listarDepartamentos = (): Promise<Departamento[]> => executar(() => departamentos);

/** "Seg a Sex · 08:00–17:00" ou "Seg, Qua, Sex · 08:00–12:00". */
export function resumirDisponibilidade(d: Disponibilidade): string {
  const dias = [...d.diasSemana].sort((a, b) => a - b);
  const nomes = t.diasSemanaCurto;
  const consecutivos =
    dias.length >= 3 && dias.every((dia, i) => i === 0 || dia === dias[i - 1] + 1);
  const texto = consecutivos
    ? t.diasAte(nomes[dias[0]], nomes[dias[dias.length - 1]])
    : dias.map((dia) => nomes[dia]).join(', ');
  return `${texto} · ${d.inicio}–${d.fim}`;
}

function obterOuFalhar(id: string): Medico {
  const m = repoMedicos.obter(id);
  if (!m) throw new ErroNaoEncontrado(t.erros.medicoNaoEncontrado);
  return m;
}

function validar(entrada: EntradaMedico): DadosMedico {
  const r = esquemaMedico.safeParse(entrada);
  if (!r.success) throw ErroValidacao.deZod(r.error);
  return r.data;
}

/** O zod devolve `number[]`; aqui os dias já foram validados (0–6). */
const paraMedico = (dados: DadosMedico) => ({
  ...dados,
  disponibilidade: {
    ...dados.disponibilidade,
    diasSemana: dados.disponibilidade.diasSemana as DiaSemana[],
    duracaoPadraoMin: dados.disponibilidade.duracaoPadraoMin as Disponibilidade['duracaoPadraoMin'],
  },
});

const crmIgual = (m: Medico, numero: string, uf: UF) => m.crm.numero === numero && m.crm.uf === uf;

/** R-M1: CRM (número + UF) e e-mail únicos entre médicos. */
function garantirUnicos(dados: DadosMedico, ignorarId?: string) {
  const outros = repoMedicos.todos().filter((m) => m.id !== ignorarId);
  const mesmoCrm = outros.find((m) => crmIgual(m, dados.crm.numero, dados.crm.uf));
  if (mesmoCrm) {
    throw new ErroConflito('crm_duplicado', t.erros.crmDuplicado, {
      campo: 'crm.numero',
      detalhes: { id: mesmoCrm.id },
    });
  }
  const mesmoEmail = outros.find((m) => m.email === dados.email);
  if (mesmoEmail) {
    throw new ErroConflito('email_duplicado', t.erros.emailDuplicado, {
      campo: 'email',
      detalhes: { id: mesmoEmail.id },
    });
  }
}

const futurasDoMedico = (id: string) => consultasFuturasAgendadas((c) => c.medicoId === id);

// ───────────────────────── leitura ─────────────────────────

export const listarMedicos = (filtros: FiltrosMedicos = {}): Promise<Paginado<MedicoResumo>> =>
  executar(() => {
    const hoje = hojeNoFuso();
    const hojePorMedico = new Map<string, number>();
    for (const c of repoConsultas.todos()) {
      if (c.status !== 'cancelada' && dataDoInstante(c.inicio) === hoje) {
        hojePorMedico.set(c.medicoId, (hojePorMedico.get(c.medicoId) ?? 0) + 1);
      }
    }

    let base = filtrarStatus(repoMedicos.todos(), filtros.status ?? 'ativos');
    if (filtros.departamentoId)
      base = base.filter((m) => m.departamentoId === filtros.departamentoId);

    const resumos: MedicoResumo[] = filtrarPorTermo(base, filtros.busca, {
      textos: (m) => [m.nome],
      digitos: (m) => [m.crm.numero, m.telefone],
    }).map((m) => ({
      id: m.id,
      nomeExibicao: nomeExibicaoMedico(m),
      crmFormatado: formatarCrm(m.crm),
      departamentoId: m.departamentoId,
      departamentoNome: nomeDepartamento(m.departamentoId),
      diasResumo: resumirDisponibilidade(m.disponibilidade),
      consultasHoje: hojePorMedico.get(m.id) ?? 0,
      ativo: m.ativo,
    }));

    // Nome sem o "Dr./Dra." para ordenar.
    const nomes = new Map(base.map((m) => [m.id, m.nome]));
    const chave =
      filtros.ordenarPor === 'departamento'
        ? (r: MedicoResumo) => `${r.departamentoNome} ${nomes.get(r.id)}`
        : (r: MedicoResumo) => nomes.get(r.id);

    return paginar(
      ordenar(resumos, chave, filtros.ordem),
      filtros.pagina,
      filtros.porPagina ?? POR_PAGINA,
    );
  });

export const obterMedico = (id: string): Promise<Medico> => executar(() => obterOuFalhar(id));

export const crmDisponivel = (numero: string, uf: UF, ignorarId?: string): Promise<boolean> =>
  executar(() => !repoMedicos.todos().some((m) => m.id !== ignorarId && crmIgual(m, numero, uf)));

/** Médico que já usa este CRM (para o link "Abrir cadastro existente"), ou `null`. */
export const medicoComCrm = (
  numero: string,
  uf: UF,
  ignorarId?: string,
): Promise<{ id: string; nomeExibicao: string } | null> =>
  executar(() => {
    const m = repoMedicos.todos().find((x) => x.id !== ignorarId && crmIgual(x, numero, uf));
    return m ? { id: m.id, nomeExibicao: nomeExibicaoMedico(m) } : null;
  });

/** R-M2: o diálogo de inativação lista estas consultas. */
export const consultasFuturasDoMedico = (id: string): Promise<Consulta[]> =>
  executar(() => futurasDoMedico(id));

/** R-M3 / A3: consultas futuras que ficariam fora de uma nova disponibilidade. */
export const consultasAfetadas = (id: string, nova: Disponibilidade): Promise<Consulta[]> =>
  executar(() => consultasForaDaDisponibilidade(nova, futurasDoMedico(id)));

// ───────────────────────── escrita ─────────────────────────

/** P6 */
export const criarMedico = (entrada: EntradaMedico): Promise<Medico> =>
  executar(() => {
    const dados = validar(entrada);
    return transacao(() => {
      garantirUnicos(dados);
      const momento = agora().toISOString();
      const medico = repoMedicos.inserir({
        ...paraMedico(dados),
        id: gerarId(),
        criadoEm: momento,
        atualizadoEm: momento,
        versao: 1,
        ativo: true,
      });
      registrarAtividade(
        'medico_cadastrado',
        t.textosAtividade.medicoCadastrado(
          nomeExibicaoMedico(medico),
          nomeDepartamento(medico.departamentoId),
        ),
        medico.id,
      );
      return medico;
    });
  });

/**
 * P7 / R-M3: consultas já marcadas não mudam; o retorno informa quantas futuras
 * ficaram fora do novo horário.
 */
export const atualizarMedico = (
  id: string,
  entrada: EntradaMedico,
  versao: number,
): Promise<{ medico: Medico; consultasForaDoHorario: number }> =>
  executar(() => {
    const dados = validar(entrada);
    return transacao(() => {
      const atual = obterOuFalhar(id);
      if (atual.versao !== versao) throw new ErroConcorrencia();
      garantirUnicos(dados, id);
      const medico = repoMedicos.atualizar(id, paraMedico(dados));
      const fora = consultasForaDaDisponibilidade(medico.disponibilidade, futurasDoMedico(id));
      return { medico, consultasForaDoHorario: fora.length };
    });
  });

/** P8 / R-M2: bloqueado enquanto houver consultas futuras agendadas. */
export const inativarMedico = (id: string, motivo?: string): Promise<Medico> =>
  executar(() =>
    transacao(() => {
      const medico = obterOuFalhar(id);
      if (!medico.ativo) return medico;
      const futuras = futurasDoMedico(id);
      if (futuras.length > 0) {
        throw new ErroConflito('consultas_futuras', t.conflitos.consultasFuturas(futuras.length), {
          detalhes: { consultas: futuras.map((c) => c.id) },
        });
      }
      return repoMedicos.atualizar(id, {
        ativo: false,
        inativadoEm: agora().toISOString(),
        motivoInativacao: motivo?.trim() || undefined,
      });
    }),
  );

export const reativarMedico = (id: string): Promise<Medico> =>
  executar(() =>
    transacao(() => {
      obterOuFalhar(id);
      return repoMedicos.atualizar(id, {
        ativo: true,
        inativadoEm: undefined,
        motivoInativacao: undefined,
      });
    }),
  );
