/**
 * Fase 24 (BL-01.2, BL-01.3) — Montagem da API: validação e serialização por zod, OpenAPI,
 * tradutor de erros, logs sem dados pessoais e as rotas em `/api/v1`.
 */
import { readFileSync } from 'node:fs';
import fastifyCors from '@fastify/cors';
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
import { demonstracaoLigada, type Config } from './config';
import { semEnvio, type Enviador } from './acesso/email';
import { registrarGuarda } from './acesso/guarda';
import { registrarLeiturasSensiveis } from './auditoria/leituras';
import { registrarTratamentoDeErros } from './http/erros';
import type { RegistrarErro } from './monitoramento';
import { rotasAcesso } from './rotas/acesso';
import { rotasAuditoria } from './rotas/auditoria';
import { rotasConsultas } from './rotas/consultas';
import { rotasEmergencia } from './rotas/emergencia';
import { rotasFarmacia } from './rotas/farmacia';
import { rotasLeitos } from './rotas/leitos';
import { rotasMedicos } from './rotas/medicos';
import { rotasPacientes } from './rotas/pacientes';
import { rotasPainel } from './rotas/painel';
import { rotasSaude } from './rotas/saude';
import { rotasSituacao } from './rotas/situacao';
import { rotasDeTeste } from './rotas/teste';
import { rotasRotinas } from './rotas/rotinas';
import { rotasUsuarios } from './rotas/usuarios';
import type { OpcoesRotinas } from './rotinas/agendador';

export const PREFIXO = '/api/v1';

export const VERSAO_API: string = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

export interface DependenciasServidor {
  config: Pick<Config, 'AMBIENTE' | 'LOG_NIVEL' | 'DOCS'> &
    Partial<Pick<Config, 'CORS_ORIGENS' | 'APP_URL' | 'LOGIN_DEMONSTRACAO'>>;
  banco: Banco;
  registrarErro: RegistrarErro;
  /** Para onde vai o log (padrão: saída padrão). Os testes leem o log por aqui. */
  destinoLog?: { write: (linha: string) => void };
  /**
   * Fase 27: conexão do dono das tabelas para as rotas de teste (`/_teste`). Só é passada com
   * `AMBIENTE=teste` e `ROTAS_TESTE=sim` (`config.ts` recusa o resto).
   */
  bancoDeTeste?: Banco;
  /** Fase 27: rota das rotinas para o Cloud Scheduler (só com `ROTINAS_CHAVE`). */
  rotinas?: { chave: string; opcoes?: OpcoesRotinas };
  /** Fase 28: envio dos convites e das senhas novas (padrão: nenhum; o link volta ao administrador). */
  enviador?: Enviador;
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

/** `https://medicore-*-x.vercel.app` → expressão regular (o `*` não atravessa pontos nem barras). */
export function origensPermitidas(lista: readonly string[]): (string | RegExp)[] {
  return lista.map((o) =>
    o.includes('*')
      ? new RegExp(
          `^${o
            .split('*')
            .map((p) => p.replace(/[.+?^${}()|[\]\\/]/g, '\\$&'))
            .join('[^./]*')}$`,
        )
      : o,
  );
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
  // Fase 28: sessão, código de segurança e permissão em todas as rotas (negado por padrão).
  registrarGuarda(app, dep.banco);
  // Fase 29: as leituras sensíveis entram na auditoria antes de a resposta sair.
  registrarLeiturasSensiveis(app, dep.banco);

  // Fase 27: o app (Vercel) chama a API (Cloud Run) em outro endereço.
  const origens = origensPermitidas(dep.config.CORS_ORIGENS ?? []);
  if (origens.length) {
    await app.register(fastifyCors, {
      origin: origens,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'If-Match', 'If-None-Match', 'Accept', 'X-CSRF-Token'],
      // Fase 28: o cookie da sessão (o app chama a API pelo mesmo endereço, por proxy; o CORS fica
      // para as chamadas diretas, como as ferramentas de teste).
      credentials: true,
      exposedHeaders: ['ETag'],
      maxAge: 600,
    });
  }

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
          'API do MediCore (D24). Erros no formato do contrato: `{ codigo, … }`. Gravações exigem `If-Match` com a versão lida (R-API1). Desde a Fase 28, as rotas pedem a sessão (cookie `medicore_sessao`, de `POST /auth/entrar`) e as gravações, o cabeçalho `X-CSRF-Token`.',
      },
      servers: [{ url: '/' }],
      tags: [
        { name: 'sistema', description: 'Situação da API' },
        { name: 'pacientes', description: 'P1–P5 (Fase 25)' },
        { name: 'médicos', description: 'P6–P8 (Fase 25)' },
        { name: 'agenda', description: 'P9–P13, A1, A5 (Fase 25)' },
        { name: 'leitos', description: 'L1–L9, A11 (Fase 26)' },
        { name: 'emergência', description: 'E1–E10, A7, A8 (Fase 26)' },
        { name: 'farmácia', description: 'F1–F9, A9 (Fase 26)' },
        { name: 'painel', description: 'Atividades e indicadores (A12–A14)' },
        { name: 'acesso', description: 'Login, MFA, convite e senha (Fase 28)' },
        { name: 'usuários', description: 'Administração de usuários (Fase 28)' },
        { name: 'auditoria', description: 'Trilha de auditoria e pedido do titular (Fase 29)' },
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
      const enviador = dep.enviador ?? semEnvio;
      const appUrl = dep.config.APP_URL ?? 'http://localhost:5173';
      await v1.register(
        rotasAcesso({
          banco: dep.banco,
          enviador,
          appUrl,
          demonstracao: demonstracaoLigada({
            AMBIENTE: dep.config.AMBIENTE,
            LOGIN_DEMONSTRACAO: dep.config.LOGIN_DEMONSTRACAO,
          }),
        }),
      );
      await v1.register(rotasUsuarios({ banco: dep.banco, enviador, appUrl }));
      await v1.register(rotasAuditoria(dep.banco));
      await v1.register(rotasPacientes(dep.banco));
      await v1.register(rotasMedicos(dep.banco));
      await v1.register(rotasConsultas(dep.banco));
      await v1.register(rotasPainel(dep.banco));
      await v1.register(rotasLeitos(dep.banco));
      await v1.register(rotasEmergencia(dep.banco));
      await v1.register(rotasFarmacia(dep.banco));
      await v1.register(rotasSituacao(dep.banco));
      if (dep.bancoDeTeste) await v1.register(rotasDeTeste(dep.bancoDeTeste));
      if (dep.rotinas) {
        await v1.register(
          rotasRotinas(dep.banco, dep.registrarErro, dep.rotinas.chave, dep.rotinas.opcoes),
        );
      }
      if (dep.rotasExtras) await dep.rotasExtras(v1);
    },
    { prefix: PREFIXO },
  );

  return app;
}
