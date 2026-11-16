/**
 * Fase 27 (27.2.4) — As rotinas do dia chamadas de fora (Cloud Scheduler). No Cloud Run, a API pode
 * ficar sem nenhuma instância e o relógio interno (`iniciarAgendador`) para junto; o Cloud Scheduler
 * chama esta rota de madrugada (e de 15 em 15 minutos, por segurança). A tabela `rotinas` continua
 * garantindo uma execução por dia, venha a chamada de onde vier.
 *
 * Só existe com `ROTINAS_CHAVE`; a chamada precisa do cabeçalho `X-Rotinas-Chave` igual (comparação
 * em tempo constante). Fora do OpenAPI.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { ErroNaoEncontrado } from '@medicore/dominio/erros';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Banco } from '../banco/conexao';
import type { RegistrarErro } from '../monitoramento';
import { executarRotinasDoDia, type OpcoesRotinas } from '../rotinas/agendador';

const resumo = (texto: string) => createHash('sha256').update(texto).digest();

export function chaveConfere(recebida: unknown, esperada: string): boolean {
  return typeof recebida === 'string' && timingSafeEqual(resumo(recebida), resumo(esperada));
}

export function rotasRotinas(
  banco: Banco,
  registrarErro: RegistrarErro,
  chave: string,
  opcoes: OpcoesRotinas = {},
): FastifyPluginAsyncZod {
  return async (app) => {
    app.post('/rotinas/executar', { schema: { hide: true } }, async (req) => {
      // Sem a chave certa, a rota "não existe" (não confirma nada a quem procura).
      if (!chaveConfere(req.headers['x-rotinas-chave'], chave)) {
        throw new ErroNaoEncontrado('Rota não encontrada.');
      }
      return executarRotinasDoDia(banco, registrarErro, opcoes);
    });
  };
}
