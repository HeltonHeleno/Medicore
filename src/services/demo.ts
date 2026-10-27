/**
 * "Restaurar dados de exemplo" (13.5): apaga os dados locais e semeia de novo,
 * já gravando no storage para que as outras abas recebam os mesmos dados.
 */
import { repoAtividades, repoConsultas, repoMedicos, repoPacientes } from './colecoes';
import { resetar } from './repositorio';

export function restaurarDadosExemplo(): void {
  resetar();
  for (const repo of [repoPacientes, repoMedicos, repoConsultas, repoAtividades]) repo.todos();
}
