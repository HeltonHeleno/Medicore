/**
 * Regras entre módulos R-X2, R-X3 e R-X4. Carregado sob demanda pelos serviços de pacientes
 * e médicos (que vão no pacote inicial), para não puxar os módulos operacionais junto.
 * Funções síncronas: rodam dentro da transação de quem chama.
 */
import { to } from '../i18n/pt-BR/operacoes';
import {
  repoAtendimentos,
  repoDispensacoes,
  repoInternacoes,
  repoLeitos,
  repoSolicitacoes,
} from './colecoes-operacoes';
import type { PendenciaModulo } from './erros';
import { nomeExibicaoPaciente } from './pacientes';
import { repoPacientes } from './colecoes';

const o = to;
const codigo = (leitoId: string) => repoLeitos.obter(leitoId)?.codigo ?? '—';

/** R-X2: internação ativa ou atendimento aberto impedem inativar o paciente. */
export function pendenciasPaciente(pacienteId: string): PendenciaModulo[] {
  const itens: PendenciaModulo[] = [];
  for (const i of repoInternacoes.todos()) {
    if (i.pacienteId === pacienteId && i.status === 'ativa') {
      itens.push({
        tipo: 'internacao',
        id: i.id,
        descricao: o.pendenciaInternacao(codigo(i.leitoId)),
      });
    }
  }
  for (const a of repoAtendimentos.todos()) {
    if (a.pacienteId === pacienteId && a.status !== 'encerrado') {
      itens.push({ tipo: 'atendimento', id: a.id, descricao: o.pendenciaAtendimento(a.numero) });
    }
  }
  return itens;
}

/** R-X3: quem já teve internação, atendimento, pedido de leito ou dispensação não é excluído. */
export function temHistoricoNosModulos(pacienteId: string): boolean {
  return (
    repoInternacoes.todos().some((i) => i.pacienteId === pacienteId) ||
    repoAtendimentos.todos().some((a) => a.pacienteId === pacienteId) ||
    repoSolicitacoes.todos().some((s) => s.pacienteId === pacienteId) ||
    repoDispensacoes.todos().some((d) => d.pacienteId === pacienteId)
  );
}

/** R-X4: responsável por internação ativa ou com atendimento aberto. */
export function pendenciasMedico(medicoId: string): PendenciaModulo[] {
  const itens: PendenciaModulo[] = [];
  for (const i of repoInternacoes.todos()) {
    if (i.medicoResponsavelId === medicoId && i.status === 'ativa') {
      const p = repoPacientes.obter(i.pacienteId);
      itens.push({
        tipo: 'internacao',
        id: i.id,
        descricao: o.pendenciaResponsavel(p ? nomeExibicaoPaciente(p) : '—', codigo(i.leitoId)),
      });
    }
  }
  for (const a of repoAtendimentos.todos()) {
    if (a.medicoId === medicoId && a.status !== 'encerrado') {
      itens.push({
        tipo: 'atendimento',
        id: a.id,
        descricao: o.pendenciaMedicoAtendimento(a.numero),
      });
    }
  }
  return itens;
}
