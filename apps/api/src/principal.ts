/** Fase 24 — Ponto de entrada da API (`npm run dev` / `npm start`). */
import { enviadorResend, semEnvio } from './acesso/email';
import { conectar, desconectar } from './banco/conexao';
import { ErroConfiguracao, lerConfig } from './config';
import { iniciarMonitoramento } from './monitoramento';
import { iniciarAgendador } from './rotinas/agendador';
import { criarServidor, VERSAO_API } from './servidor';

let config;
try {
  config = lerConfig();
} catch (erro) {
  if (erro instanceof ErroConfiguracao) {
    console.error(erro.message);
    process.exit(1);
  }
  throw erro;
}

const registrarErro = await iniciarMonitoramento(config, VERSAO_API);
const banco = conectar(config.DATABASE_URL, config.BANCO_CONEXOES);
// Fase 27: a conexão do dono das tabelas, só onde é preciso apagar tudo e semear de novo: as rotas
// de teste (AMBIENTE=teste, ver config.ts) e a restauração diária da demonstração (27.2.2).
const precisaDoDono = config.ROTAS_TESTE || config.AMBIENTE === 'demonstracao';
const bancoDono = precisaDoDono
  ? conectar(config.DATABASE_URL_MIGRACAO ?? config.DATABASE_URL, 2)
  : undefined;
const opcoesRotinas =
  config.AMBIENTE === 'demonstracao' ? { restaurarDemonstracao: bancoDono } : {};
const app = await criarServidor({
  config,
  banco,
  registrarErro,
  bancoDeTeste: config.ROTAS_TESTE ? bancoDono : undefined,
  enviador:
    config.EMAIL_PROVEDOR === 'resend'
      ? enviadorResend(config.RESEND_API_KEY!, config.EMAIL_REMETENTE!)
      : semEnvio,
  rotinas: config.ROTINAS_CHAVE
    ? { chave: config.ROTINAS_CHAVE, opcoes: opcoesRotinas }
    : undefined,
});
const pararRotinas = config.ROTINAS
  ? iniciarAgendador(banco, registrarErro, undefined, opcoesRotinas)
  : () => {};

const encerrar = async () => {
  pararRotinas();
  await app.close();
  await desconectar(banco);
  if (bancoDono) await desconectar(bancoDono);
  process.exit(0);
};
process.on('SIGTERM', () => void encerrar());
process.on('SIGINT', () => void encerrar());

await app.listen({ port: config.PORTA, host: config.HOST });
