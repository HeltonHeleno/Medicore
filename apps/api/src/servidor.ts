/**
 * Fase 24 (BL-01.2, BL-01.3) — Montagem da API: validação e serialização por zod, OpenAPI,
 * tradutor de erros, logs sem dados pessoais e as rotas em `/api/v1`.
 */
import { readFileSync } from 'node:fs';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { rotaSemParametros } from '@medicore/dominio/monitoramento/limpeza';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Banco } from './banco/conexao';
import type { Config } from './config';
import { registrarTratamentoDeErros } from './http/erros';
import type { RegistrarErro } from './monitoramento';
import { rotasConsultas } from './rotas/consultas';
import { rotasMedicos } from './rotas/medicos';
import { rotasPacientes } from './rotas/pacientes';
import { rotasPainel } from './rotas/painel';
import { rotasSaude } from './rotas/saude';

export const PREFIXO = '/api/v1';

export const VERSAO_API: string = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

export interface DependenciasServidor {
  config: Pick<Config, 'AMBIENTE' | 'LOG_NIVEL' | 'DOCS'>;
  banco: Banco;
  registrarErro: RegistrarErro;
  /** Para onde vai o log (padrão: saída padrão). Os testes leem o log por aqui. */
  destinoLog?: { write: (linha: string) => void };
  /** Rotas extras (os testes registram rotas de exemplo aqui). */
  rotasExtras?: (app: FastifyInstance) => Promise<void> | void;
}

/**
 * Log de requisição: método, rota **com os parâmetros no lugar dos valores** e código de resposta.
 * Nada de busca, cabeçalhos, corpo ou ids (R-API4, D34).
 */
function requisicaoNoLog(requisicao: FastifyRequest) {
  return {
    metodo: requisicao.method,
    rota: requisicao.routeOptions?.url ?? rotaSemParametros(requisicao.url),
  };
}

export async function criarServidor(dep: DependenciasServidor) {
  const app = Fastify({
    logger: {
      level: dep.config.LOG_NIVEL,
      serializers: {
        req: requisicaoNoLog,
        res: (resposta: { statusCode: number }) => ({ status: resposta.statusCode }),
      },
      redact: { paths: ['req.headers', 'headers', 'body', 'cookies'], remove: true },
      ...(dep.destinoLog ? { stream: dep.destinoLog } : {}),
    },
    // Cloud Run e a Vercel ficam na frente: o IP real vem do proxy (auditoria, Fase 29).
    trustProxy: true,
    // ids das requisições sem informação do cliente
    genReqId: () => crypto.randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registrarTratamentoDeErros(app, dep.registrarErro);

  app.addHook('onSend', async (_requisicao, resposta) => {
    resposta.header('X-Content-Type-Options', 'nosniff');
  });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'MediCore API',
        version: VERSAO_API,
        description:
          'API do MediCore (D24). Erros no formato do contrato: `{ codigo, … }`. Gravações exigem `If-Match` com a versão lida (R-API1).',
      },
      servers: [{ url: '/' }],
      tags: [
        { name: 'sistema', description: 'Situação da API' },
        { name: 'pacientes', description: 'P1–P5 (Fase 25)' },
        { name: 'médicos', description: 'P6–P8 (Fase 25)' },
        { name: 'agenda', description: 'P9–P13, A1, A5 (Fase 25)' },
        { name: 'painel', description: 'Atividades e indicadores dos cadastros' },
      ],
    },
    transform: jsonSchemaTransform,
  });
  if (dep.config.DOCS) {
    await app.register(fastifySwaggerUi, { routePrefix: `${PREFIXO}/docs` });
  }

  await app.register(
    async (v1) => {
      v1.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger());
      await v1.register(
        rotasSaude({ banco: dep.banco, versao: VERSAO_API, ambiente: dep.config.AMBIENTE }),
      );
      await v1.register(rotasPacientes(dep.banco));
      await v1.register(rotasMedicos(dep.banco));
      await v1.register(rotasConsultas(dep.banco));
      await v1.register(rotasPainel(dep.banco));
      if (dep.rotasExtras) await dep.rotasExtras(v1);
    },
    { prefix: PREFIXO },
  );

  return app;
}
