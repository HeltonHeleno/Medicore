/**
 * Fase 29 (BL-03.2) — Leituras sensíveis: abrir o cadastro do paciente (com CPF completo e
 * alergias), o histórico hospitalar, um atendimento, uma internação ou uma dispensação.
 *
 * A leitura é gravada **antes** de a resposta sair (`onSend`): se a gravação falhar, a resposta
 * vira erro. Nenhum dado sensível sai sem registro. Só o que foi visto, nunca o conteúdo.
 */
import { pode } from '@medicore/dominio/permissoes';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Banco } from '../banco/conexao';
import { registrarAcesso } from './servico';

interface Leitura {
  entidade: string;
  /** O que foi visto (códigos, ver `tau.detalhes`). */
  detalhe: (r: FastifyRequest) => string;
  /** De onde vem o id do registro e o do paciente. */
  registro?: 'id';
  paciente: 'id' | 'corpo' | 'nenhum';
}

const comCpf = (r: FastifyRequest) =>
  r.sessao && pode(r.sessao.usuario.perfis, 'pacientes.verCpf')
    ? 'cadastro,cpf_completo,alergias'
    : 'cadastro,alergias';

/** As rotas que são leitura sensível. As outras leituras não entram na trilha. */
export const LEITURAS_SENSIVEIS: Record<string, Leitura> = {
  '/api/v1/pacientes/:id': {
    entidade: 'pacientes',
    detalhe: comCpf,
    registro: 'id',
    paciente: 'id',
  },
  '/api/v1/pacientes/cpf/:cpf': {
    entidade: 'pacientes',
    detalhe: () => 'busca_cpf',
    paciente: 'corpo',
  },
  '/api/v1/pacientes/:id/alergia/:medicamentoId': {
    entidade: 'pacientes',
    detalhe: () => 'alergias',
    registro: 'id',
    paciente: 'id',
  },
  '/api/v1/pacientes/:id/historico-hospitalar': {
    entidade: 'pacientes',
    detalhe: () => 'historico_hospitalar',
    registro: 'id',
    paciente: 'id',
  },
  '/api/v1/pacientes/:id/dispensacoes': {
    entidade: 'pacientes',
    detalhe: () => 'dispensacoes',
    registro: 'id',
    paciente: 'id',
  },
  '/api/v1/atendimentos/:id': {
    entidade: 'atendimentos',
    detalhe: () => 'atendimento',
    registro: 'id',
    paciente: 'corpo',
  },
  '/api/v1/internacoes/:id': {
    entidade: 'internacoes',
    detalhe: () => 'internacao',
    registro: 'id',
    paciente: 'corpo',
  },
  '/api/v1/dispensacoes/:id': {
    entidade: 'dispensacoes',
    detalhe: () => 'dispensacao',
    registro: 'id',
    paciente: 'corpo',
  },
};

declare module 'fastify' {
  interface FastifyRequest {
    /** Fase 29: o paciente do registro lido (vem da resposta). */
    pacienteDaLeitura?: string;
  }
}

const idDoCorpo = (corpo: unknown, chave: 'id' | 'pacienteId') =>
  typeof corpo === 'object' &&
  corpo !== null &&
  typeof (corpo as Record<string, unknown>)[chave] === 'string'
    ? ((corpo as Record<string, unknown>)[chave] as string)
    : undefined;

export function registrarLeiturasSensiveis(app: FastifyInstance, banco: Banco): void {
  app.addHook('preSerialization', async (requisicao: FastifyRequest, _r, corpo) => {
    const leitura = LEITURAS_SENSIVEIS[requisicao.routeOptions.url ?? ''];
    if (leitura?.paciente === 'corpo' && requisicao.method === 'GET') {
      // A busca por CPF devolve o paciente achado (`id`); os outros, o `pacienteId` do registro.
      requisicao.pacienteDaLeitura =
        idDoCorpo(corpo, 'pacienteId') ??
        (leitura.entidade === 'pacientes' ? idDoCorpo(corpo, 'id') : undefined);
    }
    return corpo;
  });

  app.addHook('onSend', async (requisicao, resposta, carga) => {
    if (requisicao.method !== 'GET') return carga;
    const leitura = LEITURAS_SENSIVEIS[requisicao.routeOptions.url ?? ''];
    // 200 (ou 304, quando o navegador já tinha o cadastro e o mostra de novo).
    if (!leitura || !requisicao.sessao || ![200, 304].includes(resposta.statusCode)) return carga;
    const params = requisicao.params as Record<string, string>;
    const pacienteId =
      leitura.paciente === 'id'
        ? params.id
        : leitura.paciente === 'corpo'
          ? requisicao.pacienteDaLeitura
          : undefined;
    // A busca por CPF sem resultado não mostrou ninguém.
    if (leitura.detalhe(requisicao) === 'busca_cpf' && !pacienteId) return carga;
    await registrarAcesso(banco, {
      acao: 'leitura',
      entidade: leitura.entidade,
      ...(leitura.registro ? { registroId: params.id } : {}),
      ...(pacienteId ? { pacienteId } : {}),
      detalhe: leitura.detalhe(requisicao),
    });
    return carga;
  });
}
