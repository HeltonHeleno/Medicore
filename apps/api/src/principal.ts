/** Fase 24 — Ponto de entrada da API (`npm run dev` / `npm start`). */
import { conectar, desconectar } from './banco/conexao';
import { ErroConfiguracao, lerConfig } from './config';
import { iniciarMonitoramento } from './monitoramento';
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
const app = await criarServidor({ config, banco, registrarErro });

const encerrar = async () => {
  await app.close();
  await desconectar(banco);
  process.exit(0);
};
process.on('SIGTERM', () => void encerrar());
process.on('SIGINT', () => void encerrar());

await app.listen({ port: config.PORTA, host: config.HOST });
