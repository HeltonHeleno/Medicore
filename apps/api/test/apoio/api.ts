/** API de teste: o servidor real, com um banco de teste e, opcionalmente, rotas extras. */
import type { FastifyInstance } from 'fastify';
import type { Banco } from '../../src/banco/conexao';
import { criarServidor } from '../../src/servidor';
import { criarBancoDeTeste, type BancoDeTeste } from './banco';
import { comSessao } from './sessao';

export interface ApiDeTeste {
  app: FastifyInstance;
  banco: BancoDeTeste;
  erros: unknown[];
  encerrar: () => Promise<void>;
}

export async function criarApiDeTeste(
  rotasExtras?: (app: FastifyInstance, banco: Banco) => Promise<void> | void,
): Promise<ApiDeTeste> {
  const banco = await criarBancoDeTeste();
  const erros: unknown[] = [];
  const app = await criarServidor({
    config: { AMBIENTE: 'teste', LOG_NIVEL: 'silent', DOCS: true },
    banco: banco.app,
    registrarErro: (erro) => {
      erros.push(erro);
      return `evento${erros.length}`;
    },
    rotasExtras: rotasExtras ? (v1) => rotasExtras(v1, banco.app) : undefined,
  });
  await app.ready();
  comSessao(app);
  return {
    app,
    banco,
    erros,
    encerrar: async () => {
      await app.close();
      await banco.encerrar();
    },
  };
}
