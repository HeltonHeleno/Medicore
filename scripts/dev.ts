/**
 * Fase 24 (24.2.2) — `npm run dev` na raiz: sobe a API e o app juntos, com a saída de cada um
 * prefixada. O banco vem do Docker Compose (`docker compose up -d`).
 * Para subir um só: `npm run dev:web` ou `npm run dev:api`.
 */
import { spawn } from 'node:child_process';

const processos = [
  { nome: 'api', cor: '\x1b[36m', args: ['run', 'dev', '-w', '@medicore/api'] },
  { nome: 'web', cor: '\x1b[35m', args: ['run', 'dev', '-w', '@medicore/web'] },
].map(({ nome, cor, args }) => {
  const filho = spawn('npm', args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  const prefixo = `${cor}[${nome}]\x1b[0m `;
  const repassar = (destino: NodeJS.WriteStream) => (bloco: Buffer) => {
    for (const linha of bloco.toString().split(/\r?\n/))
      if (linha) destino.write(`${prefixo}${linha}\n`);
  };
  filho.stdout.on('data', repassar(process.stdout));
  filho.stderr.on('data', repassar(process.stderr));
  return filho;
});

const encerrar = () => {
  for (const p of processos) p.kill('SIGTERM');
};
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
for (const p of processos) {
  p.on('exit', (codigo) => {
    if (codigo && codigo !== 0) {
      encerrar();
      process.exitCode = codigo;
    }
  });
}
