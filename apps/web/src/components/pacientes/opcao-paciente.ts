import { nomeExibicaoPaciente, obterPaciente } from '../../services/pacientes';
import { ocultarCpf } from '@medicore/dominio/utils/mascaras';
import type { OpcaoPaciente } from './ComboboxPaciente';

/** Opção do `ComboboxPaciente` a partir do id (pré-preenchimento por `?pacienteId=`). */
export async function opcaoDoPaciente(id: string): Promise<OpcaoPaciente | null> {
  try {
    const p = await obterPaciente(id);
    return { id: p.id, nomeExibicao: nomeExibicaoPaciente(p), cpfMascarado: ocultarCpf(p.cpf) };
  } catch {
    return null;
  }
}
