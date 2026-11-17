/**
 * Fase 28 (BL-02.5) — Conta inicial: `npm run acesso:primeiro-admin -- "Nome" email@hospital.com`
 * (ou `node dist/primeiro-administrador.js "Nome" email`). Cria um Administrador convidado e mostra
 * o link do primeiro acesso (48 h), onde a pessoa define a senha e o segundo fator. Só funciona com
 * o banco sem usuários; depois disso, os convites saem da tela "Usuários".
 */
import { conectar, desconectar } from '../banco/conexao';
import { linkDoToken } from '../rotas/acesso';
import { criarPrimeiroAdministrador } from './servico';

// Linha de comando: exercitada à mão na publicação (docs/backend/PUBLICACAO.md), não pelo Vitest.
/* v8 ignore start */
{
  const [nome, email] = process.argv.slice(2);
  const url = process.env.DATABASE_URL;
  if (!nome || !email || !url) {
    console.error('Uso: DATABASE_URL=… APP_URL=… primeiro-administrador "Nome completo" email');
    process.exit(2);
  }
  const banco = conectar(url, 1);
  try {
    const { token, usuario } = await criarPrimeiroAdministrador(banco, nome, email);
    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
    console.log(`Administrador ${usuario.nome} <${usuario.email}> criado.`);
    console.log('Link do primeiro acesso (vale 48 h, uma vez só; envie só para essa pessoa):');
    console.log(linkDoToken(appUrl, 'convite', token));
  } catch (erro) {
    console.error((erro as Error).message);
    process.exitCode = 1;
  } finally {
    await desconectar(banco);
  }
}
/* v8 ignore stop */
