/**
 * Fase 24 (24.3.2) — Tradutor de erros da API.
 *
 * - Erros do domínio (`ErroValidacao`, `ErroConflito`…) → HTTP pelo contrato de
 *   `@medicore/dominio/contrato/erros` (o mesmo que o navegador usa no caminho de volta).
 * - Validação de entrada (zod) → 422 com os campos.
 * - Restrições do banco (D25) → 409 com o código do conflito; conflito de serialização → 409.
 * - O resto → 500 `{ codigo: 'interno', id }`, com o `id` do evento no monitoramento.
 *
 * R-API4: nenhuma resposta traz pilha, SQL, nome de tabela ou dado de outro registro.
 */
import {
  respostaDeErro,
  type CorpoErro,
  type RespostaErro,
} from '@medicore/dominio/contrato/erros';
import { ErroConflito, ErroValidacao, type CodigoConflito } from '@medicore/dominio/erros';
import { t } from '@medicore/dominio/i18n/pt-BR';
import { to as tOperacoes } from '@medicore/dominio/i18n/pt-BR/operacoes';
import { tf } from '@medicore/dominio/i18n/pt-BR/farmacia';
import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

/** Erro do `pg` (só os campos usados aqui). */
interface ErroPg {
  code?: string;
  constraint?: string;
}

const ehErroPg = (e: unknown): e is ErroPg =>
  typeof e === 'object' && e !== null && typeof (e as ErroPg).code === 'string';

/**
 * O Drizzle embrulha o erro do `pg` (em `cause`) numa mensagem que traz o SQL **e os valores**
 * da consulta. Esse texto nunca pode ir para log, monitoramento ou resposta.
 */
const ehErroDeConsulta = (e: unknown): e is Error & { cause?: unknown; query: string } =>
  e instanceof Error && 'query' in e && 'params' in e;

/** O erro do `pg` por baixo do erro do Drizzle (ou o próprio erro). */
export function erroDoBanco(erro: unknown): unknown {
  return ehErroDeConsulta(erro) && erro.cause ? erro.cause : erro;
}

/**
 * Versão do erro que pode ir para o monitoramento: sem SQL nem valores. Fica o código do
 * PostgreSQL, a restrição (se houver) e a pilha.
 */
export function erroSemDados(erro: unknown): unknown {
  if (!ehErroDeConsulta(erro)) return erro;
  const causa = erro.cause as ErroPg | undefined;
  const seguro = new Error(
    `Falha no banco (${causa?.code ?? 'sem código'}${causa?.constraint ? `, ${causa.constraint}` : ''})`,
  );
  seguro.name = 'ErroBanco';
  seguro.stack = `${seguro.name}: ${seguro.message}\n${(erro.stack ?? '')
    .split('\n')
    .filter((l) => l.trimStart().startsWith('at '))
    .join('\n')}`;
  return seguro;
}

/** Códigos do PostgreSQL tratados como conflito. */
const VIOLACAO_UNICA = '23505';
const VIOLACAO_EXCLUSAO = '23P01';
const VIOLACAO_CHECK = '23514';
const VIOLACAO_CHAVE_ESTRANGEIRA = '23503';
const FALHA_SERIALIZACAO = '40001';
const DEADLOCK = '40P01';

/**
 * Restrição do banco → conflito do domínio. A mensagem é a mesma que o serviço mostra hoje
 * quando a regra é conferida antes de gravar; sem nomes, porque o banco não sabe quem é quem.
 */
const POR_RESTRICAO: Record<
  string,
  { codigo: CodigoConflito; mensagem: () => string; campo?: string }
> = {
  pacientes_cpf_unico: {
    codigo: 'cpf_duplicado',
    mensagem: () => t.erros.cpfDuplicado,
    campo: 'cpf',
  },
  medicos_crm_unico: {
    codigo: 'crm_duplicado',
    mensagem: () => t.erros.crmDuplicado,
    campo: 'crm.numero',
  },
  medicos_email_unico: {
    codigo: 'email_duplicado',
    mensagem: () => t.erros.emailDuplicado,
    campo: 'email',
  },
  consultas_sem_sobreposicao_por_medico: {
    codigo: 'medico_ocupado',
    mensagem: () => t.erros.horarioOcupado,
    campo: 'hora',
  },
  internacoes_uma_ativa_por_leito: {
    codigo: 'leito_indisponivel',
    mensagem: () => tOperacoes.leitoIndisponivel,
    campo: 'leitoId',
  },
  internacoes_uma_ativa_por_paciente: {
    codigo: 'paciente_internado',
    mensagem: () => t.erros.pacienteJaInternado,
    campo: 'pacienteId',
  },
  atendimentos_um_aberto_por_paciente: {
    codigo: 'paciente_em_atendimento',
    mensagem: () => t.erros.pacienteJaEmAtendimento,
    campo: 'pacienteId',
  },
  lotes_quantidade_atual_nao_negativa: {
    codigo: 'estoque_insuficiente',
    mensagem: () => tf.regras.saldoNegativo,
    campo: 'quantidade',
  },
};

/** Erro do banco → conflito do domínio, ou `null` se não for um erro de restrição conhecido. */
export function conflitoDoBanco(original: unknown): ErroConflito | null {
  const erro = erroDoBanco(original);
  if (!ehErroPg(erro)) return null;
  const restricao = erro.constraint ? POR_RESTRICAO[erro.constraint] : undefined;
  if (restricao && [VIOLACAO_UNICA, VIOLACAO_EXCLUSAO, VIOLACAO_CHECK].includes(erro.code!)) {
    return new ErroConflito(restricao.codigo, restricao.mensagem(), { campo: restricao.campo });
  }
  if (
    [
      VIOLACAO_UNICA,
      VIOLACAO_EXCLUSAO,
      VIOLACAO_CHECK,
      VIOLACAO_CHAVE_ESTRANGEIRA,
      FALHA_SERIALIZACAO,
      DEADLOCK,
    ].includes(erro.code!)
  ) {
    return new ErroConflito('conflito_dados', t.erros.conflitoDados);
  }
  return null;
}

/** `/endereco/cep` → `endereco.cep` (o caminho que os formulários usam). */
function campoDoCaminho(caminho: string): string {
  return caminho.replace(/^\//, '').split('/').filter(Boolean).join('.');
}

/** Validação de entrada do Fastify/zod → `ErroValidacao` com os campos. */
export function validacaoDaEntrada(erro: unknown): ErroValidacao | null {
  if (!hasZodFastifySchemaValidationErrors(erro)) return null;
  const campos: Record<string, string> = {};
  for (const problema of erro.validation) {
    const campo = campoDoCaminho(problema.instancePath) || '_';
    if (!(campo in campos)) campos[campo] = problema.message ?? t.validacao.obrigatorio;
  }
  return new ErroValidacao(campos);
}

/** Qualquer erro → resposta do contrato. O 500 recebe o `id` de quem registrou o erro. */
export function traduzirErro(
  erro: unknown,
  registrarInesperado: (e: unknown) => string,
): RespostaErro {
  const doDominio = validacaoDaEntrada(erro) ?? conflitoDoBanco(erro) ?? erro;
  const resposta = respostaDeErro(doDominio);
  if (resposta.status !== 500) return resposta;
  // Erros do próprio Fastify com status de cliente (corpo malformado, tipo de conteúdo).
  const statusFastify = (erro as FastifyError | undefined)?.statusCode;
  if (statusFastify && statusFastify >= 400 && statusFastify < 500) {
    return { status: 422, corpo: { codigo: 'validacao', campos: { _: t.validacao.obrigatorio } } };
  }
  return { status: 500, corpo: { codigo: 'interno', id: registrarInesperado(erroSemDados(erro)) } };
}

/** Liga o tradutor e a resposta de rota inexistente na instância do Fastify. */
export function registrarTratamentoDeErros(
  app: FastifyInstance,
  registrarInesperado: (e: unknown) => string,
): void {
  app.setErrorHandler((erro, requisicao, resposta) => {
    const { status, corpo } = traduzirErro(erro, registrarInesperado);
    if (status === 500) {
      requisicao.log.error(
        { tipo: (erro as Error)?.name, codigo: corpo.codigo },
        'erro inesperado',
      );
    }
    return resposta.status(status).send(corpo satisfies CorpoErro);
  });
  app.setNotFoundHandler((_requisicao, resposta) =>
    resposta.status(404).send({ codigo: 'nao_encontrado' } satisfies CorpoErro),
  );
}
