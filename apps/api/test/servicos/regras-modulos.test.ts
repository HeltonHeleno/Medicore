/**
 * 25.1.5 — Regras entre módulos (R-X2, R-X3, R-X4) lidas das tabelas dos módulos.
 * Os registros dos módulos vêm da semeadura (as rotas dos módulos chegam na Fase 26).
 */
import { t } from '@medicore/dominio/i18n/pt-BR';
import { erroDe, usarApi } from '../apoio/cliente';
import { atendimentos, consultas, internacoes } from '../../src/banco/esquema';
import { and, eq, ne } from 'drizzle-orm';

const { cliente, api } = usarApi('2026-11-09T08:00:00-03:00');

const banco = () => api().banco.dono;

describe('R-X2 — paciente com internação ativa ou atendimento aberto', () => {
  it('não é inativado; a lista de pendências diz o que resolver', async () => {
    const [i] = await banco()
      .select()
      .from(internacoes)
      .where(eq(internacoes.status, 'ativa'))
      .limit(1);
    const pendencias = await cliente.pendenciasDoPaciente(i!.pacienteId);
    expect(pendencias).toContainEqual(expect.objectContaining({ tipo: 'internacao', id: i!.id }));
    const erro = await erroDe(cliente.inativarPaciente(i!.pacienteId));
    expect(erro).toMatchObject({
      codigo: 'pendencias_modulos',
      message: t.operacoes.pendenciasInativarPaciente(pendencias.length),
      detalhes: { itens: pendencias },
    });
    expect((await cliente.obterPaciente(i!.pacienteId)).ativo).toBe(true);
  });

  it('atendimento aberto também conta', async () => {
    const [a] = await banco()
      .select()
      .from(atendimentos)
      .where(and(ne(atendimentos.status, 'encerrado'), ne(atendimentos.pacienteId, '')))
      .limit(1);
    const pendencias = await cliente.pendenciasDoPaciente(a!.pacienteId!);
    expect(pendencias).toContainEqual(
      expect.objectContaining({
        tipo: 'atendimento',
        id: a!.id,
        descricao: expect.stringContaining(a!.numero),
      }),
    );
  });
});

describe('R-X3 — histórico nos módulos impede a exclusão', () => {
  it('paciente sem consultas, mas com registro nos módulos, não é excluído', async () => {
    const internados = await banco().select({ id: internacoes.pacienteId }).from(internacoes);
    const comConsulta = new Set(
      (await banco().select({ id: consultas.pacienteId }).from(consultas)).map((c) => c.id),
    );
    const alvo = internados.find((p) => !comConsulta.has(p.id));
    expect(alvo).toBeDefined();
    const erro = await erroDe(cliente.excluirPaciente(alvo!.id));
    expect(erro).toMatchObject({
      codigo: 'tem_historico',
      message: t.operacoes.pendenciasExcluirPaciente,
    });
  });
});

describe('R-X4 — médico responsável por internação ativa ou com atendimento aberto', () => {
  it('não é inativado, mesmo sem consultas futuras', async () => {
    const [i] = await banco()
      .select()
      .from(internacoes)
      .where(eq(internacoes.status, 'ativa'))
      .limit(1);
    const medicoId = i!.medicoResponsavelId;
    for (const c of await cliente.consultasFuturasDoMedico(medicoId)) {
      await cliente.cancelarConsulta(c.id, 'Agenda fechada', c.versao);
    }
    const pendencias = await cliente.pendenciasDoMedico(medicoId);
    expect(pendencias.some((p) => p.tipo === 'internacao' && p.id === i!.id)).toBe(true);
    // A descrição traz o nome exibido do paciente e o código do leito.
    const paciente = await cliente.obterPaciente(i!.pacienteId);
    expect(pendencias.find((p) => p.id === i!.id)!.descricao).toContain(
      paciente.nomeSocial || paciente.nome,
    );
    const erro = await erroDe(cliente.inativarMedico(medicoId));
    expect(erro).toMatchObject({ codigo: 'pendencias_modulos', detalhes: { itens: pendencias } });
  });

  it('atendimento aberto com o médico também conta', async () => {
    const [a] = await banco()
      .select()
      .from(atendimentos)
      .where(and(ne(atendimentos.status, 'encerrado'), ne(atendimentos.medicoId, '')))
      .limit(1);
    const pendencias = await cliente.pendenciasDoMedico(a!.medicoId!);
    expect(pendencias).toContainEqual(expect.objectContaining({ tipo: 'atendimento', id: a!.id }));
  });

  it('médico sem pendências: lista vazia', async () => {
    const lista = await cliente.listarMedicos({ status: 'todos', porPagina: 100 });
    const vazias = await Promise.all(lista.itens.map((m) => cliente.pendenciasDoMedico(m.id)));
    expect(vazias.some((p) => p.length === 0)).toBe(true);
  });
});
